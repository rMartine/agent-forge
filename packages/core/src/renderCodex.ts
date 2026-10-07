import { parseDocument } from 'yaml';
import type { CodexAgentManifestEntry, DeploymentManifestV3 } from './types.js';
import { codexSkillMap, rewriteCodexSkillReferences } from './skillBundles.js';
import { validateCodexModelConfiguration } from './models.js';

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
  return { name: data.name, description: data.description, body: source.slice(match[0].length).trim().replace(/\r\n/g, '\n') };
}

export function renderCodexAgent(
  source: string,
  agent: CodexAgentManifestEntry,
  manifest: DeploymentManifestV3,
  externalSkillNames: string[] = [],
): string {
  const parsed = parseSource(source);
  const hasModel = agent.model !== undefined || agent.modelReasoningEffort !== undefined;
  if (hasModel || manifest.schemaVersion === 5 || manifest.schemaVersion === 6) {
    const problem = validateCodexModelConfiguration(agent.model, agent.modelReasoningEffort);
    if (problem) throw new Error(`Agent ${agent.id}: ${problem}`);
    if (manifest.schemaVersion !== 5 && manifest.schemaVersion !== 6) throw new Error('Explicit Codex models require manifest schemaVersion 5 or 6');
  }
  const mapping = codexSkillMap(manifest);
  const body = rewriteCodexSkillReferences(parsed.body, mapping);
  const unresolved = [...body.matchAll(/\$([a-z0-9]+(?:-[a-z0-9]+)*)/g)].map(match => match[1]).filter(id => !id.startsWith('agent-forge-'));
  if (unresolved.length > 0) throw new Error(`Agent ${agent.id} has unresolved Codex skill references: ${[...new Set(unresolved)].join(', ')}`);
  const bundles = agent.requiredSkillBundles.map(id => `$${manifest.codex.skillBundles[id].deploymentName}`).join(', ');
  const developerInstructions = [
    'Codex runtime contract (authoritative):',
    (agent.instructionOverlay || '').replace(/Do not delegate or spawn subagents\.?\s*/gi, '').replace(/; do not modify product code, delegate, or spawn subagents\./gi, '; do not modify product code.'),
    'You may create subagents from any roster when useful for the authorized assignment. They may also delegate. Give each child concrete scope, context, ownership and expected results, integrate their work, and preserve all ancestor permissions and read-only restrictions.',
    `Use these Agent Forge skill bundles when relevant: ${bundles}.`,
    hasModel
      ? `This custom agent is configured for model ${agent.model} with ${agent.modelReasoningEffort} reasoning. Inherit the parent MCP configuration, permissions, and approval policy. Never weaken approval requirements.`
      : 'Inherit the parent model, MCP configuration, permissions, and approval policy. Never weaken approval requirements.',
    ...(manifest.codex.productDevelopment ? [
      'Participate only in a software-product development assignment from the primary agent. A general question, independent research task or isolated code discussion does not activate this roster.',
      'The coordinating agent owns product-level technical decisions and final delivery. Delegate within your assigned scope and return unresolved business decisions to the parent.',
      'Apply the checks required by the changed behavior and the current project phase. Do not turn optional checks or examples into universal requirements.',
      `Completion evidence for this assignment: ${(agent.completionEvidence ?? []).join('; ')}.`,
      ...(externalSkillNames.length ? [`Additional curated skills available when the assigned technology and task match: ${externalSkillNames.map(name => `$${name}`).join(', ')}. Read only those that apply.`] : []),
    ] : []),
    '',
    body,
  ].join('\n');
  const table: Record<string, string> = {
    name: parsed.name,
    description: manifest.codex.productDevelopment ? `For an assigned software-product build: ${parsed.description}` : parsed.description,
    developer_instructions: developerInstructions,
    sandbox_mode: agent.sandboxMode,
  };
  if (hasModel) {
    table.model = agent.model!;
    table.model_reasoning_effort = agent.modelReasoningEffort!;
  }
  const rendered = toml.stringify(table);
  toml.parse(rendered);
  return rendered;
}
