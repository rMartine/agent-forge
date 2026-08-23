import { parseDocument } from 'yaml';
import type { CodexAgentManifestEntry, DeploymentManifestV3 } from './types.js';
import { codexSkillMap, rewriteCodexSkillReferences } from './skillBundles.js';

const toml = require('smol-toml') as {
  parse(source: string): Record<string, unknown>;
  stringify(value: Record<string, string>): string;
};

export function parseCodexToml(source: string): Record<string, unknown> {
  return toml.parse(source);
}

function parseSource(source: string): { name: string; description: string; body: string } {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) throw new Error('Canonical agent is missing YAML frontmatter');
  const document = parseDocument(match[1], { strict: true, uniqueKeys: true });
  if (document.errors.length > 0) throw new Error(document.errors.map(item => item.message).join('; '));
  const data = document.toJS() as Record<string, unknown>;
  if (typeof data.name !== 'string' || typeof data.description !== 'string') throw new Error('Canonical agent requires name and description');
  return { name: data.name, description: data.description, body: source.slice(match[0].length).trim() };
}

export function renderCodexAgent(
  source: string,
  agent: CodexAgentManifestEntry,
  manifest: DeploymentManifestV3,
): string {
  const parsed = parseSource(source);
  const mapping = codexSkillMap(manifest);
  const body = rewriteCodexSkillReferences(parsed.body, mapping);
  const unresolved = [...body.matchAll(/\$([a-z0-9]+(?:-[a-z0-9]+)*)/g)].map(match => match[1]).filter(id => !id.startsWith('agent-forge-'));
  if (unresolved.length > 0) throw new Error(`Agent ${agent.id} has unresolved Codex skill references: ${[...new Set(unresolved)].join(', ')}`);
  const bundles = agent.requiredSkillBundles.map(id => `$${manifest.codex.skillBundles[id].deploymentName}`).join(', ');
  const developerInstructions = [
    'Codex runtime contract (authoritative):',
    agent.instructionOverlay || 'Do not delegate or spawn subagents.',
    `Use these Agent Forge skill bundles when relevant: ${bundles}.`,
    'Inherit the parent model, MCP configuration, permissions, and approval policy. Never weaken approval requirements.',
    '',
    body,
  ].join('\n');
  const table: Record<string, string> = {
    name: parsed.name,
    description: parsed.description,
    developer_instructions: developerInstructions,
    sandbox_mode: agent.sandboxMode,
  };
  const rendered = toml.stringify(table);
  toml.parse(rendered);
  return rendered;
}
