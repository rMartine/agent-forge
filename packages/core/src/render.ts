import type { AgentManifestEntry, ResolvedAgentRuntime } from './types.js';

function yamlArray(values: string[]): string {
  return `[${values.map(value => JSON.stringify(value)).join(', ')}]`;
}

function replaceScalar(frontmatter: string, key: string, value?: string): string {
  const line = new RegExp(`^${key}:.*$`, 'm');
  if (value === undefined) return frontmatter.replace(line, '').replace(/\n{3,}/g, '\n\n');
  if (line.test(frontmatter)) return frontmatter.replace(line, `${key}: ${value}`);
  return `${frontmatter.trimEnd()}\n${key}: ${value}\n`;
}

export function renderAgent(
  source: string,
  agent: AgentManifestEntry,
  runtime: ResolvedAgentRuntime,
): string {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) throw new Error(`Agent ${agent.id} is missing YAML frontmatter`);
  let frontmatter = match[1];
  frontmatter = replaceScalar(frontmatter, 'tools', yamlArray(runtime.tools));
  frontmatter = replaceScalar(frontmatter, 'agents', agent.allowedSubagents.length ? yamlArray(agent.allowedSubagents) : '[]');
  frontmatter = replaceScalar(frontmatter, 'user-invocable', agent.visibility === 'entry' ? 'true' : 'false');
  frontmatter = replaceScalar(
    frontmatter,
    'disable-model-invocation',
    agent.id === 'devops-engineer' || ['cto', 'requirements-engineer', 'creative-director', 'software-architect', 'project-manager', 'principal-engineer'].includes(agent.id)
      ? 'true'
      : 'false',
  );
  const model = runtime.model;
  frontmatter = replaceScalar(frontmatter, 'model', model ? (Array.isArray(model) ? yamlArray(model) : JSON.stringify(model)) : undefined);
  return `---\n${frontmatter.trim()}\n---\n${source.slice(match[0].length)}`;
}
