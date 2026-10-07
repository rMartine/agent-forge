import { readFile, readdir, lstat } from 'node:fs/promises';
import * as path from 'node:path';
import { parseDocument } from 'yaml';
import type { CanonicalAgent, CanonicalResource, CanonicalRoster, RosterCatalog } from './rosterTypes.js';
import type { CodexSkillBundleEntry, DeploymentManifestV3, FileArtifactEntry } from './types.js';
import { loadManifest } from './manifest.js';
import { resolveRepoFilePath } from './paths.js';
import { renderCodexSkillBundle } from './skillBundles.js';
import { loadExternalSkillCatalog, resolveExternalSkillFiles } from './externalSkills.js';
import { renderProductDevelopmentSkill } from './productDevelopment.js';
import { validateCodexModelConfiguration } from './models.js';

interface SkillSource {
  id: string;
  roster: string;
  kind: 'directory' | 'bundle' | 'external' | 'product';
  sourcePath?: string;
  externalId?: string;
  dependency?: boolean;
  bundle?: CodexSkillBundleEntry;
}
interface CatalogSource {
  schemaVersion: 1;
  rosters: CanonicalRoster[];
  agents: Array<Omit<CanonicalAgent, 'body'>>;
  skills: SkillSource[];
  workflowSources: FileArtifactEntry[];
  externalSkillCatalog?: string;
  product?: NonNullable<DeploymentManifestV3['codex']['productDevelopment']>;
  graphify?: NonNullable<DeploymentManifestV3['codex']['graphify']>;
  runtimePackages: string[];
  dependencyRuntime: { sourcePath: string; relativePath: string };
  aliases: Record<string, string>;
  expected: { agents: number; coordinators: number; specialists: number; ownSkills: number };
}

const posix = (value: string): string => value.replaceAll('\\', '/');
const json = (value: unknown): Buffer => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function relative(value: string): string {
  if (typeof value !== 'string' || !value || path.isAbsolute(value) || /[\\:\u0000-\u001f]/.test(value) || value.split('/').some(part => !part || part === '.' || part === '..')) throw new Error(`Unsafe canonical resource path: ${value}`);
  return value;
}

async function tree(root: string): Promise<string[]> {
  if (!(await lstat(root)).isDirectory()) throw new Error(`Canonical resource root must be a regular directory: ${root}`);
  const files: string[] = [];
  for (const entry of (await readdir(root, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (['node_modules', '__pycache__', '.git', '.pytest_cache', '.venv', '.cache'].includes(entry.name)) continue;
    if (entry.isSymbolicLink()) throw new Error(`Canonical resources must not follow symbolic links: ${path.join(root, entry.name)}`);
    if (entry.isDirectory()) files.push(...await tree(path.join(root, entry.name)));
    else if (entry.isFile()) files.push(path.join(root, entry.name));
  }
  return files;
}

/** Read neutral source roles once; an edition never supplies the input to another edition. */
export async function loadRosterCatalog(repoPath: string, options: { downloadSkills?: boolean } = {}): Promise<RosterCatalog> {
  const manifest = await loadManifest(repoPath);
  const configPath = resolveRepoFilePath(repoPath, manifest.rosterCatalog ?? 'config/roster-catalog.json');
  const config = JSON.parse(await readFile(configPath, 'utf8')) as CatalogSource;
  if (config.schemaVersion !== 1 || !Array.isArray(config.rosters) || config.rosters.length !== 4 || !Array.isArray(config.agents) || !Array.isArray(config.skills)) throw new Error('Invalid canonical four-roster catalog');
  const rosterIds = new Set(config.rosters.map(item => item.id));
  if (rosterIds.size !== 4) throw new Error('Canonical roster IDs must be unique');
  const skills = new Set<string>();
  for (const skill of config.skills) {
    if (!idPattern.test(skill.id) || skills.has(skill.id)) throw new Error(`Duplicate or invalid canonical skill ${skill.id}`);
    if (!rosterIds.has(skill.roster) && !(skill.roster === 'dependencies' && skill.dependency)) throw new Error(`Unknown skill roster ${skill.roster}`);
    skills.add(skill.id);
  }
  const agents: CanonicalAgent[] = [], agentIds = new Set<string>();
  for (const agent of config.agents) {
    if (!idPattern.test(agent.id) || agentIds.has(agent.id) || !rosterIds.has(agent.roster)) throw new Error(`Duplicate or invalid canonical agent ${agent.id}`);
    if (agent.delegation !== 'allowed' || typeof agent.readOnly !== 'boolean' || typeof agent.coordinator !== 'boolean' || !agent.description?.trim()) throw new Error(`Invalid canonical agent contract ${agent.id}`);
    if (!Array.isArray(agent.skills) || agent.skills.some(id => !skills.has(id)) || new Set(agent.skills).size !== agent.skills.length) throw new Error(`Canonical agent ${agent.id} references a missing or duplicate skill`);
    if (!Array.isArray(agent.completionEvidence) || !agent.completionEvidence.length || agent.completionEvidence.some(item => typeof item !== 'string' || !item.trim())) throw new Error(`Canonical agent ${agent.id} requires completion evidence`);
    if ((agent.model === undefined) !== (agent.reasoning === undefined)) throw new Error(`Canonical agent ${agent.id} requires both model and reasoning or neither`);
    if (agent.model && validateCodexModelConfiguration(agent.model, agent.reasoning)) throw new Error(`Invalid canonical model assignment for ${agent.id}`);
    const sourcePath = resolveRepoFilePath(repoPath, relative(agent.sourcePath));
    if (!(await lstat(sourcePath)).isFile()) throw new Error(`Canonical role source must be a regular file: ${sourcePath}`);
    const body = (await readFile(sourcePath, 'utf8')).replaceAll('\r\n', '\n').trim();
    if (!body || /^---\n/.test(body) || /^\s*(?:developer_instructions|sandbox_mode)\s*=/m.test(body)) throw new Error(`Canonical agent ${agent.id} must use a neutral Markdown body`);
    if (/do not delegate|do not[^\n.]{0,100}spawn subagents|never ask a specialist to delegate|no delegues|ni delegues por tu cuenta|agents:\s*\[\s*\]/i.test(body)) throw new Error(`Canonical agent ${agent.id} retains a delegation prohibition`);
    agents.push({ ...agent, sourcePath, body });
    agentIds.add(agent.id);
  }
  for (const roster of config.rosters) {
    if (!skills.has(roster.coordinationSkill) || !agents.some(agent => agent.id === roster.coordinatorId && agent.roster === roster.id && agent.coordinator)) throw new Error(`Roster ${roster.id} is missing its coordinator or coordination skill`);
  }
  const expected = config.expected;
  if (!expected || agents.length !== expected.agents || agents.filter(agent => agent.coordinator).length !== expected.coordinators || agents.filter(agent => !agent.coordinator).length !== expected.specialists || config.skills.filter(skill => !skill.dependency).length !== expected.ownSkills) throw new Error('Canonical roster counts differ from the declared source inventory');

  // Compatibility renderers are used only for neutral resource bundles, never for agent TOML.
  const sourceManifest: DeploymentManifestV3 = { ...manifest, skills: config.workflowSources, codex: { ...manifest.codex,
    agents: Object.fromEntries(agents.filter(agent => agent.roster === 'development' && !agent.coordinator).map(agent => [agent.id, {
      id: agent.id, sourceAgent: agent.id, displayName: agent.description,
      sandboxMode: agent.readOnly ? 'read-only' as const : 'workspace-write' as const,
      modelProfile: 'inherit' as const, model: agent.model,
      modelReasoningEffort: agent.reasoning as NonNullable<DeploymentManifestV3['codex']['agents'][string]['modelReasoningEffort']>,
      requiredSkillBundles: agent.skills.filter(id => config.skills.some(skill => skill.id === id && skill.kind === 'bundle')),
      instructionOverlay: 'You may delegate useful subtasks to available agents of any roster. Descendants may also delegate. Preserve assignment scope, permissions, read-only restrictions and model assignments; integrate their results.',
      requiredCapabilities: [], optionalCapabilities: [], completionEvidence: agent.completionEvidence,
    }])),
    skillBundles: Object.fromEntries(config.skills.filter(item => item.kind === 'bundle').map(item => [item.bundle!.id, item.bundle!])),
    externalSkillCatalog: config.externalSkillCatalog, productDevelopment: config.product, graphify: config.graphify,
  } };
  const external = await loadExternalSkillCatalog(repoPath, sourceManifest);
  const resources: CanonicalResource[] = [];
  const keys = new Set<string>();
  const sourceFiles = new Set<string>();
  function add(kind: CanonicalResource['kind'], roster: string, resourcePath: string, sourcePath: string, content: Buffer, dependency = false): void {
    resourcePath = relative(posix(resourcePath));
    // Checkout EOL settings must not change an edition or its integrity hashes.
    // Upstream cache verification runs before this output normalization.
    if (/\.(?:md|txt|mjs|cjs|js|ts|py|jsonc?|toml|ya?ml|ps1|sh|csv|xml|html|css|tex|bib)$/i.test(resourcePath)
      || /(?:^|\/)(?:LICENSE|NOTICE|COPYING)$/i.test(resourcePath)) {
      content = Buffer.from(content.toString('utf8').replaceAll('\r\n', '\n'));
    }
    const key = `${kind}/${resourcePath}`.toLowerCase();
    if (keys.has(key)) throw new Error(`Duplicate canonical resource ${key}`);
    keys.add(key);
    sourceFiles.add(path.resolve(sourcePath).toLowerCase());
    const prose = /\.(?:md|txt|ya?ml)$/i.test(resourcePath) && !/(?:^|\/)(?:LICENSE|NOTICE|COPYING)(?:\.[^/]+)?$|(?:SOURCE|PROVENANCE)\.json$/i.test(resourcePath);
    resources.push({ id: `${kind}/${resourcePath}`, roster, kind, sourcePath, relativePath: resourcePath, content, dependency, adaptation: prose ? 'prose' : 'none' });
  }
  async function copySkill(skill: SkillSource): Promise<void> {
    const source = resolveRepoFilePath(repoPath, relative(skill.sourcePath!));
    for (const file of await tree(source)) add('skill', skill.roster, `${skill.id}/${posix(path.relative(source, file))}`, file, await readFile(file), !!skill.dependency);
  }
  for (const skill of config.skills) {
    if (skill.kind === 'directory') await copySkill(skill);
    else if (skill.kind === 'bundle') {
      for (const file of await renderCodexSkillBundle(repoPath, sourceManifest, skill.bundle!)) add('skill', skill.roster, `${skill.id}/${posix(file.relativePath)}`, file.sourcePath, file.content);
      for (const component of skill.bundle!.componentSkills) {
        const source = resolveRepoFilePath(repoPath, config.workflowSources.find(item => item.id === component)!.source);
        for (const file of await tree(source)) {
          if (!sourceFiles.has(path.resolve(file).toLowerCase())) add('skill', skill.roster, `${skill.id}/resources/${component}/${posix(path.relative(source, file))}`, file, await readFile(file));
        }
      }
    } else if (skill.kind === 'external') {
      const source = external.skills.find(item => item.id === skill.externalId);
      if (!source || source.deploymentName !== skill.id) throw new Error(`Missing pinned external skill ${skill.id}`);
      for (const file of await resolveExternalSkillFiles(repoPath, source, options.downloadSkills)) add('skill', skill.roster, `${skill.id}/${posix(file.relativePath)}`, file.sourcePath, file.content);
    } else if (skill.kind === 'product') {
      for (const file of await renderProductDevelopmentSkill(repoPath, sourceManifest, external)) add('skill', skill.roster, `${skill.id}/${posix(file.relativePath)}`, file.sourcePath, file.content);
    } else throw new Error(`Unsupported canonical skill source kind: ${skill.kind}`);
  }
  if (config.product) {
    for (const name of ['product-hooks.mjs', 'product-session.mjs', 'hook-storage.mjs']) {
      const source = resolveRepoFilePath(repoPath, `${config.product.hooksSource}/${name}`);
      add('runtime', 'development', `development/${name}`, source, await readFile(source));
    }
  }
  if (config.graphify && config.product) {
    const skill = config.product.deploymentName;
    const wrapper = resolveRepoFilePath(repoPath, 'hooks/codex/graphify-client.cjs');
    add('skill', 'development', `${skill}/scripts/graphify-client.cjs`, wrapper, await readFile(wrapper));
    for (const name of ['graphifyCommand.js', 'graphifyRuntime.js', 'graphifyIndex.js', 'graphifyFiles.js', 'graphifyProcess.js']) {
      const source = path.join(__dirname, name);
      add('skill', 'development', `${skill}/scripts/graphify/${name}`, source, await readFile(source));
    }
    // Edition adapter supplies client-local runtime paths, without reading a live profile here.
    add('skill', 'development', `${skill}/scripts/graphify-runtime.json`, config.graphify.lockFile, json({ schemaVersion: 1, managedRoot: config.graphify.managedRoot, runtimeId: null }));
  }
  for (const folder of config.runtimePackages) {
    if (!['research-specialists', 'independent-specialists', 'consulting-specialist'].includes(folder)) throw new Error(`Unknown canonical runtime package ${folder}`);
    const root = resolveRepoFilePath(repoPath, `packages/${folder}`);
    const roster = folder === 'research-specialists' ? 'research' : folder === 'independent-specialists' ? 'communication' : 'consulting';
    for (const file of await tree(root)) {
      const rel = posix(path.relative(root, file));
      if (/^(?:test|tests|evals|\.git)\//.test(rel) || /^(?:install|verify-native)\.mjs$/.test(rel) || /^agents\//.test(rel) || ['hooks/hooks.json', 'README.md', 'evaluation-cases.md'].includes(rel)) continue;
      if (folder !== 'research-specialists' && rel.startsWith('skills/')) continue;
      let content = await readFile(file);
      if (rel === 'manifest.json' && folder !== 'research-specialists') {
        const data = JSON.parse(content.toString('utf8'));
        for (const role of data.agents) {
          const canonical = agents.find(agent => agent.id === role.name)!;
          role.skills = canonical.skills;
          role.completionChecks = canonical.completionEvidence;
          if (canonical.model) { role.model = canonical.model; role.reasoningEffort = canonical.reasoning; }
        }
        content = json(data);
      }
      if (rel === 'research-roster.json' && folder === 'research-specialists') {
        const data = JSON.parse(content.toString('utf8'));
        for (const role of data.specialists) {
          const canonical = agents.find(agent => agent.id === role.id)!;
          role.model = canonical.model; role.reasoning = canonical.reasoning;
          role.readOnly = canonical.readOnly; role.completionEvidence = canonical.completionEvidence;
        }
        content = json(data);
      }
      add('runtime', roster, `${folder}/${rel}`, file, content);
    }
  }
  const dependencyRoot = resolveRepoFilePath(repoPath, config.dependencyRuntime.sourcePath);
  for (const file of await tree(dependencyRoot)) add('runtime', 'dependencies', `${config.dependencyRuntime.relativePath}/${posix(path.relative(dependencyRoot, file))}`, file, await readFile(file), true);
  const aliases = { ...config.aliases };
  for (const skill of config.skills) {
    aliases[skill.id] = skill.id;
    aliases[`agent-forge-copilot-${skill.id.replace(/^agent-forge-/, '')}`] = skill.id;
  }
  for (const resource of resources.filter(item => item.kind === 'skill' && item.relativePath.endsWith('/SKILL.md'))) {
    const header = resource.content.toString('utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!header) throw new Error(`Missing skill frontmatter ${resource.relativePath}`);
    const document = parseDocument(header[1], { uniqueKeys: true });
    if (document.errors.length) throw new Error(`Invalid skill frontmatter ${resource.relativePath}`);
  }
  return { schemaVersion: 1, rosters: config.rosters, agents, resources: resources.sort((a, b) => `${a.kind}/${a.relativePath}`.localeCompare(`${b.kind}/${b.relativePath}`)), aliases, diagnostics: [] };
}
