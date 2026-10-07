import { access, readFile, readdir, stat } from 'node:fs/promises';
import * as path from 'node:path';
import { parseDocument } from 'yaml';
import type { CapabilityCatalog, DeploymentManifestV3, Diagnostic, RuntimeSelection, ValidationResult } from './types.js';
import { diagnostic, hasErrors } from './diagnostics.js';
import { resolveRepoFilePath } from './paths.js';
import { parseCodexToml, renderCodexAgent } from './renderCodex.js';
import { codexSkillMap } from './skillBundles.js';
import { loadJsonc } from './manifest.js';
import { loadExternalSkillCatalog } from './externalSkills.js';
import { renderCopilotRosters } from './copilotRosters.js';
import { loadRosterCatalog } from './rosterCatalog.js';
import type { RosterCatalog } from './rosterTypes.js';
import { loadDeploymentState } from './state.js';
import { hashFile } from './hash.js';

async function exists(filePath: string): Promise<boolean> {
  try { await access(filePath); return true; } catch { return false; }
}

async function containsEntries(directory: string): Promise<boolean> {
  try { return (await readdir(directory, { withFileTypes: true })).some(item => item.isFile() || item.isDirectory()); }
  catch { return false; }
}

async function hasDiscoverableSkill(directory: string): Promise<boolean> {
  try { return (await stat(path.join(directory, 'SKILL.md'))).isFile(); }
  catch { return false; }
}

interface ParsedFrontmatter { source?: string; data?: Record<string, unknown>; error?: string; }

function frontmatter(content: string): ParsedFrontmatter {
  const source = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
  if (!source) return { error: 'Missing YAML frontmatter fence' };
  const document = parseDocument(source, { strict: true, uniqueKeys: true });
  if (document.errors.length > 0) return { source, error: document.errors.map(item => item.message).join('; ') };
  const data = document.toJS();
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { source, error: 'Frontmatter must be a YAML mapping' };
  return { source, data: data as Record<string, unknown> };
}

function stringList(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every(item => typeof item === 'string') ? value : undefined;
}

/** Detect rediscovery without changing user files. Managed stale copies are exempt only in their removal plan. */
async function canonicalDiscovery(
  repoPath: string, manifest: DeploymentManifestV3, canonical: RosterCatalog,
  options: { target?: RuntimeSelection; env?: NodeJS.ProcessEnv; plannedCleanupPaths?: ReadonlySet<string> },
): Promise<Diagnostic[]> {
  const diagnostics: Diagnostic[] = [];
  const env = options.env ?? process.env;
  const userProfile = env.USERPROFILE || env.HOME;
  const targets = options.target === 'all' ? ['vscode', 'codex'] : [options.target ?? 'vscode'];
  const skillNames = new Set(canonical.resources.filter(resource => resource.kind === 'skill').map(resource => resource.relativePath.split('/')[0]));
  const normalize = (value: string): string => path.resolve(value).toLowerCase();
  const managed = new Map<string, string>();
  if (options.plannedCleanupPaths?.size) {
    try {
      const statePath = manifest.targets.state.replace(/%([^%]+)%/g, (_whole, name: string) => {
        if (env[name] === undefined) throw new Error(`Missing state environment variable ${name}`);
        return env[name]!;
      });
      const state = await loadDeploymentState(statePath);
      for (const runtime of ['codex', 'vscode'] as const) {
        if (!targets.includes(runtime)) continue;
        const active = state.deployments.find(record => record.id === state.activeDeployments[runtime] && record.runtime === runtime);
        for (const artifact of active?.artifacts ?? []) {
          const key = normalize(artifact.targetPath);
          if (options.plannedCleanupPaths.has(key)) managed.set(key, artifact.deployedHash);
        }
      }
    } catch { /* A missing or unreadable ownership ledger cannot exempt a duplicate. */ }
  }
  async function scheduledManagedRemoval(directory: string): Promise<boolean> {
    if (!managed.size) return false;
    let count = 0;
    const visit = async (current: string): Promise<boolean> => {
      for (const entry of await readdir(current, { withFileTypes: true })) {
        const file = path.join(current, entry.name);
        if (entry.isSymbolicLink()) return false;
        if (entry.isDirectory()) { if (!await visit(file)) return false; }
        else if (entry.isFile()) {
          count++;
          const expected = managed.get(normalize(file));
          if (!expected || await hashFile(file) !== expected) return false;
        } else return false;
      }
      return true;
    };
    return await visit(directory) && count > 0;
  }
  async function duplicateSkill(directory: string, name: string, label: string): Promise<void> {
    if (await scheduledManagedRemoval(directory)) diagnostics.push(diagnostic('AF002', 'warning', `${label} ${name} is hash-intact and owned; this deployment explicitly removes its obsolete copy during roster migration`, { path: directory }));
    else diagnostics.push(diagnostic('AF002', 'error', `${label} ${name}`, { path: directory }));
  }
  for (const location of ['.claude/agents', '.github/agents']) {
    const root = path.join(repoPath, ...location.split('/'));
    if (!await exists(root)) continue;
    const pending = [root];
    let found = false;
    while (pending.length && !found) {
      const current = pending.pop()!;
      for (const entry of await readdir(current, { withFileTypes: true })) {
        if (entry.isDirectory()) pending.push(path.join(current, entry.name));
        else if (entry.name.endsWith('.md')) { found = true; break; }
      }
    }
    if (found) diagnostics.push(diagnostic('AF002', 'error', `${location} is VS Code-discoverable and duplicates the canonical roster`, { path: root }));
  }
  const settingsPath = path.join(repoPath, '.vscode', 'settings.json');
  if (await exists(settingsPath)) {
    try {
      const settings = await loadJsonc<Record<string, unknown>>(settingsPath);
      for (const key of ['chat.agentFilesLocations', 'chat.agentSkillsLocations', 'chat.instructionsFilesLocations']) {
        const locations = settings[key];
        if (!locations || typeof locations !== 'object') continue;
        for (const [location, enabled] of Object.entries(locations)) if (enabled === true && await containsEntries(path.resolve(repoPath, location))) diagnostics.push(diagnostic('AF002', 'error', `${key} rediscovers canonical or deployed Agent Forge customizations`, { path: settingsPath }));
      }
    } catch (error) { diagnostics.push(diagnostic('AF002', 'error', `Unable to inspect workspace customization discovery: ${(error as Error).message}`, { path: settingsPath })); }
  }
  if (targets.includes('codex')) {
    const localAgents = path.join(repoPath, '.codex', 'agents');
    if (await containsEntries(localAgents)) diagnostics.push(diagnostic('AF002', 'error', 'Project-scoped Codex agents would duplicate the managed user roster', { path: localAgents }));
    for (const localSkills of [path.join(repoPath, '.codex', 'skills'), path.join(repoPath, '.agents', 'skills')]) {
      if (await containsEntries(localSkills)) diagnostics.push(diagnostic('AF002', 'error', 'Project-scoped Agent Forge skill copies would duplicate the managed user roster', { path: localSkills }));
    }
    if (userProfile) {
      const codexHome = env.CODEX_HOME || path.join(userProfile, '.codex');
      const personal = path.join(codexHome, 'skills');
      if (await exists(personal)) {
        for (const entry of await readdir(personal, { withFileTypes: true })) if (entry.isDirectory() && skillNames.has(entry.name) && await hasDiscoverableSkill(path.join(personal, entry.name))) await duplicateSkill(path.join(personal, entry.name), entry.name, 'Personal Codex skill duplicates managed skill');
      }
      const legacy = path.join(userProfile, 'AppData', 'Roaming', 'Code', 'User', 'prompts');
      if (await containsEntries(legacy)) diagnostics.push(diagnostic('AF002', 'error', 'Legacy VS Code prompt files may duplicate the managed roster', { path: legacy }));
      let current = path.resolve(repoPath);
      const globalManaged = normalize(path.join(userProfile, '.agents', 'skills'));
      for (;;) {
        const candidate = path.join(current, '.agents', 'skills');
        if (normalize(candidate) !== globalManaged && await exists(candidate)) {
          for (const entry of await readdir(candidate, { withFileTypes: true })) if (entry.isDirectory() && skillNames.has(entry.name) && await hasDiscoverableSkill(path.join(candidate, entry.name))) await duplicateSkill(path.join(candidate, entry.name), entry.name, 'Repository-chain skill duplicates managed skill');
        }
        const parent = path.dirname(current);
        if (parent === current) break;
        current = parent;
      }
    }
  }
  return diagnostics;
}

export async function validateRoster(
  repoPath: string,
  manifest: DeploymentManifestV3,
  catalog?: CapabilityCatalog,
  options: { target?: RuntimeSelection; env?: NodeJS.ProcessEnv; checkCopilot?: boolean; downloadSkills?: boolean; resolvedCatalog?: RosterCatalog; plannedCleanupPaths?: ReadonlySet<string> } = {},
): Promise<ValidationResult> {
  const diagnostics: Diagnostic[] = [];
  if (manifest.schemaVersion === 6) {
    try {
      const canonical = options.resolvedCatalog ?? await loadRosterCatalog(repoPath, { downloadSkills: options.downloadSkills });
      diagnostics.push(...canonical.diagnostics);
      for (const agent of canonical.agents) {
        if (agent.delegation !== 'allowed') diagnostics.push(diagnostic('AF007', 'error', 'All roster agents must permit delegation', { agentId: agent.id }));
      }
      diagnostics.push(...await canonicalDiscovery(repoPath, manifest, canonical, options));
    } catch (error) { diagnostics.push(diagnostic('AF001', 'error', `Invalid canonical roster: ${(error as Error).message}`)); }
    return { valid: !hasErrors(diagnostics), diagnostics };
  }
  const visible = Object.values(manifest.agents).filter(agent => agent.visibility === 'entry');
  if (visible.length !== 9) diagnostics.push(diagnostic('AF001', 'error', `Expected 9 entry agents, found ${visible.length}`));
  const seenNames = new Set<string>();
  for (const agent of Object.values(manifest.agents)) {
    const sourcePath = resolveRepoFilePath(repoPath, agent.source);
    if (!(await exists(sourcePath))) {
      diagnostics.push(diagnostic('AF001', 'error', 'Agent source is missing', { path: agent.source, agentId: agent.id }));
      continue;
    }
    const content = await readFile(sourcePath, 'utf8');
    const parsed = frontmatter(content);
    if (!parsed.data) {
      diagnostics.push(diagnostic('AF001', 'error', `Invalid agent frontmatter: ${parsed.error}`, { path: agent.source, agentId: agent.id }));
      continue;
    }
    const name = typeof parsed.data.name === 'string' ? parsed.data.name : agent.id;
    if (name !== agent.id) diagnostics.push(diagnostic('AF001', 'error', `Agent frontmatter name must equal stable id "${agent.id}"`, { path: agent.source, agentId: agent.id }));
    if (seenNames.has(name)) diagnostics.push(diagnostic('AF002', 'error', `Duplicate agent name "${name}"`, { path: agent.source }));
    seenNames.add(name);
    const tools = stringList(parsed.data.tools);
    const sourceAgents = stringList(parsed.data.agents);
    if (!tools || !sourceAgents) diagnostics.push(diagnostic('AF001', 'error', 'Agent tools and agents must be string arrays', { path: agent.source, agentId: agent.id }));
    if ((tools?.includes('agent') ?? false) !== (agent.allowedSubagents.length > 0)) {
      diagnostics.push(diagnostic('AF007', 'error', 'The agent tool and explicit subagent allowlist must be enabled together', { path: agent.source, agentId: agent.id }));
    }
    if (sourceAgents && sourceAgents.slice().sort().join(',') !== agent.allowedSubagents.slice().sort().join(',')) {
      diagnostics.push(diagnostic('AF003', 'error', 'Agent frontmatter subagents differ from the manifest allowlist', { path: agent.source, agentId: agent.id }));
    }
    const sourceHandoffs = Array.isArray(parsed.data.handoffs) ? parsed.data.handoffs : [];
    const handoffTargets: string[] = [];
    for (const item of sourceHandoffs) {
      if (!item || typeof item !== 'object' || typeof (item as Record<string, unknown>).agent !== 'string') {
        diagnostics.push(diagnostic('AF003', 'error', 'Agent handoff must be a mapping with an agent target', { path: agent.source, agentId: agent.id }));
        continue;
      }
      const handoff = item as Record<string, unknown>;
      handoffTargets.push(handoff.agent as string);
      if (handoff.send !== false) diagnostics.push(diagnostic('AF003', 'error', 'All handoffs must declare send: false', { path: agent.source, agentId: agent.id }));
    }
    if (handoffTargets.slice().sort().join(',') !== agent.handoffs.slice().sort().join(',')) {
      diagnostics.push(diagnostic('AF003', 'error', 'Agent frontmatter handoffs differ from the manifest', { path: agent.source, agentId: agent.id }));
    }
    if (parsed.data['user-invocable'] !== (agent.visibility === 'entry')) {
      diagnostics.push(diagnostic('AF001', 'error', 'Agent user-invocable must match manifest visibility', { path: agent.source, agentId: agent.id }));
    }
    if (/autonomous(?:ly)?\s+(?:edit|modify|rewrite).{0,80}(?:agent|skill|manifest|governance)/is.test(content)) {
      diagnostics.push(diagnostic('AF008', 'error', 'Agent contains an autonomous self-modification policy', { path: agent.source, agentId: agent.id }));
    }
    for (const skill of agent.requiredSkills) {
      if (!manifest.skills.some(item => item.id === skill)) {
        diagnostics.push(diagnostic('AF005', 'error', `Required skill "${skill}" is not declared`, { agentId: agent.id }));
      }
    }
    if (catalog && !catalog.profiles[agent.capabilityProfile]) {
      diagnostics.push(diagnostic('AF004', 'error', `Unknown capability profile "${agent.capabilityProfile}"`, { agentId: agent.id }));
    }
  }

  for (const skill of manifest.skills) {
    const root = resolveRepoFilePath(repoPath, skill.source);
    const skillFile = path.join(root, 'SKILL.md');
    if (!(await exists(skillFile))) {
      diagnostics.push(diagnostic('AF005', 'error', 'Skill is missing SKILL.md', { path: skill.source }));
      continue;
    }
    const content = await readFile(skillFile, 'utf8');
    const parsed = frontmatter(content);
    if (!parsed.data || parsed.data.name !== skill.id || path.basename(root) !== skill.id) {
      diagnostics.push(diagnostic('AF005', 'error', 'Skill name, directory, and manifest id must match', { path: skill.source }));
    }
    if (!parsed.data || typeof parsed.data.description !== 'string' || parsed.data.description.trim().length === 0) {
      diagnostics.push(diagnostic('AF005', 'error', 'Skill requires a trigger-complete description', { path: skill.source }));
    }
    if (content.split(/\r?\n/).length > 500) diagnostics.push(diagnostic('AF005', 'error', 'SKILL.md must stay below 500 lines', { path: skill.source }));
  }

  for (const instruction of manifest.instructions) {
    const sourcePath = resolveRepoFilePath(repoPath, instruction.source);
    if (!(await exists(sourcePath))) {
      diagnostics.push(diagnostic('AF006', 'error', 'Instruction source is missing', { path: instruction.source }));
      continue;
    }
    const content = await readFile(sourcePath, 'utf8');
    const parsed = frontmatter(content);
    if (!parsed.data || typeof parsed.data.applyTo !== 'string' || parsed.data.applyTo.trim().length === 0) {
      diagnostics.push(diagnostic('AF006', 'error', 'Automatically deployed instruction requires applyTo', { path: instruction.source }));
    }
  }

  for (const discoverable of ['.claude/agents', '.github/agents']) {
    const root = path.join(repoPath, ...discoverable.split('/'));
    if (!(await exists(root))) continue;
    const pending = [root];
    let duplicateFound = false;
    while (pending.length > 0 && !duplicateFound) {
      const current = pending.pop()!;
      for (const entry of await readdir(current, { withFileTypes: true })) {
        if (entry.isDirectory()) pending.push(path.join(current, entry.name));
        else if (entry.name.endsWith('.md')) { duplicateFound = true; break; }
      }
    }
    if (duplicateFound) diagnostics.push(diagnostic('AF002', 'error', `${discoverable} is VS Code-discoverable and must not duplicate the canonical roster`, { path: discoverable }));
  }

  const workspaceSettings = path.join(repoPath, '.vscode', 'settings.json');
  if (await exists(workspaceSettings)) {
    try {
      const settings = await loadJsonc<Record<string, unknown>>(workspaceSettings);
      for (const key of ['chat.agentFilesLocations', 'chat.agentSkillsLocations', 'chat.instructionsFilesLocations']) {
        const locations = settings[key];
        if (!locations || typeof locations !== 'object') continue;
        for (const [location, enabled] of Object.entries(locations as Record<string, unknown>)) {
          if (enabled === true && await containsEntries(path.resolve(repoPath, location))) {
            diagnostics.push(diagnostic('AF002', 'error', `${key} rediscovers canonical or deployed Agent Forge customizations`, { path: workspaceSettings }));
          }
        }
      }
    } catch (error: unknown) {
      diagnostics.push(diagnostic('AF002', 'error', `Unable to inspect workspace customization discovery: ${(error as Error).message}`, { path: workspaceSettings }));
    }
  }

  const targets = options.target === 'all' ? ['vscode', 'codex'] : [options.target ?? 'vscode'];
  if (targets.includes('codex')) {
    const codexAgents = Object.values(manifest.codex.agents);
    const skillNames = new Set(Object.values(manifest.codex.skillBundles).map(bundle => bundle.deploymentName));
    if (manifest.codex.productDevelopment) {
      skillNames.add(manifest.codex.productDevelopment.deploymentName);
      const source = resolveRepoFilePath(repoPath, manifest.codex.productDevelopment.source);
      if (!(await exists(path.join(source, 'SKILL.md')))) diagnostics.push(diagnostic('AF005', 'error', 'Product development skill is missing SKILL.md', { path: source }));
      for (const agent of codexAgents) if (!agent.completionEvidence?.length) diagnostics.push(diagnostic('AF005', 'error', 'Product specialist requires completion evidence', { agentId: agent.id }));
    }
    try {
      const external = await loadExternalSkillCatalog(repoPath, manifest);
      for (const skill of external.skills) skillNames.add(skill.deploymentName);
    } catch (error: unknown) { diagnostics.push(diagnostic('AF005', 'error', (error as Error).message)); }
    let mapping: Map<string, string> | undefined;
    try { mapping = codexSkillMap(manifest); }
    catch (error: unknown) { diagnostics.push(diagnostic('AF005', 'error', (error as Error).message)); }
    if (mapping) {
      for (const agent of codexAgents) {
        try {
          const source = manifest.agents[agent.sourceAgent];
          const rendered = renderCodexAgent(await readFile(resolveRepoFilePath(repoPath, source.source), 'utf8'), agent, manifest);
          const parsed = parseCodexToml(rendered);
          const keys = Object.keys(parsed).sort();
          const expectedKeys = manifest.schemaVersion === 5
            ? 'description,developer_instructions,model,model_reasoning_effort,name,sandbox_mode'
            : 'description,developer_instructions,name,sandbox_mode';
          if (keys.join(',') !== expectedKeys) {
            diagnostics.push(diagnostic('AF001', 'error', 'Codex TOML contains unsupported or Copilot-only fields', { agentId: agent.id }));
          }
          if (/do not delegate|do not[^\n.]{0,100}spawn subagents/i.test(String(parsed.developer_instructions))) {
            diagnostics.push(diagnostic('AF007', 'error', 'Codex custom agents must allow delegation', { agentId: agent.id }));
          }
        } catch (error: unknown) {
          diagnostics.push(diagnostic('AF001', 'error', `Invalid Codex agent rendering: ${(error as Error).message}`, { agentId: agent.id }));
        }
      }
    }
    const env = options.env ?? process.env;
    const userProfile = env.USERPROFILE || env.HOME;
    const duplicateLocations = [path.join(repoPath, '.codex', 'agents')];
    if (userProfile) duplicateLocations.push(path.join(repoPath, '.agents', 'skills'), path.join(repoPath, '.codex', 'skills'));
    for (const location of duplicateLocations) {
      if (!(await exists(location))) continue;
      const entries = await readdir(location, { withFileTypes: true });
      if (entries.some(entry => entry.isFile() || entry.isDirectory())) {
        diagnostics.push(diagnostic('AF002', 'error', 'Project-scoped Codex agents or Agent Forge skill copies would duplicate the managed user roster', { path: location }));
      }
    }
    if (userProfile) {
      const legacyPrompts = path.join(userProfile, 'AppData', 'Roaming', 'Code', 'User', 'prompts');
      if (await containsEntries(legacyPrompts)) diagnostics.push(diagnostic('AF002', 'error', 'Legacy VS Code prompt files may duplicate the managed roster', { path: legacyPrompts }));
      const personalSkills = path.join(userProfile, '.codex', 'skills');
      if (await exists(personalSkills)) {
        const names = new Set((await readdir(personalSkills, { withFileTypes: true })).filter(item => item.isDirectory()).map(item => item.name));
        for (const name of skillNames) {
          if (names.has(name)) diagnostics.push(diagnostic('AF002', 'error', `Personal Codex skill duplicates managed skill ${name}`, { path: path.join(personalSkills, name) }));
        }
      }
      let current = path.resolve(repoPath);
      const globalManagedSkills = path.resolve(userProfile, '.agents', 'skills').toLowerCase();
      while (true) {
        const candidate = path.join(current, '.agents', 'skills');
        if (path.resolve(candidate).toLowerCase() !== globalManagedSkills && await containsEntries(candidate)) {
          const names = new Set((await readdir(candidate, { withFileTypes: true })).filter(item => item.isDirectory()).map(item => item.name));
          for (const name of skillNames) {
            if (names.has(name)) diagnostics.push(diagnostic('AF002', 'error', `Repository-chain skill duplicates managed skill ${name}`, { path: path.join(candidate, name) }));
          }
        }
        const parent = path.dirname(current);
        if (parent === current) break;
        current = parent;
      }
    }
  }
  if (manifest.copilotFourRosters && targets.includes('vscode') && options.checkCopilot !== false) {
    try { diagnostics.push(...(await renderCopilotRosters(repoPath, manifest)).diagnostics); }
    catch (error) { diagnostics.push(diagnostic('AF001', 'error', `Invalid Copilot four-roster rendering: ${(error as Error).message}`)); }
  }
  return { valid: !hasErrors(diagnostics), diagnostics };
}
