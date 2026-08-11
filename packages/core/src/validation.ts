import { access, readFile, readdir } from 'node:fs/promises';
import * as path from 'node:path';
import type { CapabilityCatalog, DeploymentManifestV2, Diagnostic, ValidationResult } from './types.js';
import { diagnostic, hasErrors } from './diagnostics.js';
import { resolveRepoFilePath } from './paths.js';

async function exists(filePath: string): Promise<boolean> {
  try { await access(filePath); return true; } catch { return false; }
}

function frontmatter(content: string): string | undefined {
  return content.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
}

function frontmatterValue(source: string, key: string): string | undefined {
  return source.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1].trim();
}

function graphHasCycle(manifest: DeploymentManifestV2): boolean {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const child of manifest.agents[id].allowedSubagents) if (visit(child)) return true;
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  return Object.keys(manifest.agents).some(visit);
}

export async function validateRoster(
  repoPath: string,
  manifest: DeploymentManifestV2,
  catalog?: CapabilityCatalog,
): Promise<ValidationResult> {
  const diagnostics: Diagnostic[] = [];
  const visible = Object.values(manifest.agents).filter(agent => agent.visibility === 'entry');
  if (visible.length !== 9) diagnostics.push(diagnostic('AF001', 'error', `Expected 9 entry agents, found ${visible.length}`));
  const delegators = Object.values(manifest.agents).filter(agent => agent.allowedSubagents.length > 0).map(agent => agent.id).sort();
  if (delegators.join(',') !== 'creative-director,principal-engineer') {
    diagnostics.push(diagnostic('AF007', 'error', 'Only creative-director and principal-engineer may delegate'));
  }
  if (graphHasCycle(manifest)) diagnostics.push(diagnostic('AF007', 'error', 'The subagent graph contains a cycle'));

  const seenNames = new Set<string>();
  for (const agent of Object.values(manifest.agents)) {
    const sourcePath = resolveRepoFilePath(repoPath, agent.source);
    if (!(await exists(sourcePath))) {
      diagnostics.push(diagnostic('AF001', 'error', 'Agent source is missing', { path: agent.source, agentId: agent.id }));
      continue;
    }
    const content = await readFile(sourcePath, 'utf8');
    const yaml = frontmatter(content);
    if (!yaml) {
      diagnostics.push(diagnostic('AF001', 'error', 'Agent is missing YAML frontmatter', { path: agent.source, agentId: agent.id }));
      continue;
    }
    const name = frontmatterValue(yaml, 'name') ?? agent.id;
    if (seenNames.has(name)) diagnostics.push(diagnostic('AF002', 'error', `Duplicate agent name "${name}"`, { path: agent.source }));
    seenNames.add(name);
    if (/agents:\s*\[\s*["']?\*["']?\s*\]/m.test(yaml)) {
      diagnostics.push(diagnostic('AF007', 'error', 'Wildcard subagent access is forbidden', { path: agent.source, agentId: agent.id }));
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
    const yaml = frontmatter(content);
    if (!yaml || frontmatterValue(yaml, 'name') !== skill.id || path.basename(root) !== skill.id) {
      diagnostics.push(diagnostic('AF005', 'error', 'Skill name, directory, and manifest id must match', { path: skill.source }));
    }
    if (!yaml || !frontmatterValue(yaml, 'description')) {
      diagnostics.push(diagnostic('AF005', 'error', 'Skill requires a trigger-complete description', { path: skill.source }));
    }
  }

  for (const instruction of manifest.instructions) {
    const sourcePath = resolveRepoFilePath(repoPath, instruction.source);
    if (!(await exists(sourcePath))) {
      diagnostics.push(diagnostic('AF006', 'error', 'Instruction source is missing', { path: instruction.source }));
      continue;
    }
    const content = await readFile(sourcePath, 'utf8');
    const yaml = frontmatter(content);
    if (!yaml || !frontmatterValue(yaml, 'applyTo')) {
      diagnostics.push(diagnostic('AF006', 'error', 'Automatically deployed instruction requires applyTo', { path: instruction.source }));
    }
  }

  const claudeAgents = path.join(repoPath, '.claude', 'agents');
  if (await exists(claudeAgents)) {
    const entries = await readdir(claudeAgents);
    if (entries.length > 0) diagnostics.push(diagnostic('AF002', 'error', '.claude/agents is VS Code-discoverable and must not duplicate the canonical roster', { path: '.claude/agents' }));
  }
  return { valid: !hasErrors(diagnostics), diagnostics };
}
