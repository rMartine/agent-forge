import type { AgentManifestEntry, ModelPolicy } from './types.js';
import { loadJsonc } from './manifest.js';
import { resolveRepoFilePath } from './paths.js';

export async function loadModelPolicy(repoPath: string, relativePath: string): Promise<ModelPolicy> {
  const policy = await loadJsonc<ModelPolicy>(resolveRepoFilePath(repoPath, relativePath));
  if (policy.version !== 1 || !policy.profiles) throw new Error('Invalid model profile configuration');
  return policy;
}

export function resolveAgentModel(
  agent: AgentManifestEntry,
  policy: ModelPolicy,
  availableModels?: Iterable<string>,
): string | string[] | undefined {
  if (agent.modelProfile === 'inherit') return undefined;
  const configured = policy.profiles[agent.modelProfile] ?? [];
  if (configured.length === 0) return undefined;
  const available = availableModels ? new Set(availableModels) : undefined;
  const resolved = available ? configured.filter(model => available.has(model)) : configured;
  if (resolved.length === 0) return undefined;
  return resolved.length === 1 ? resolved[0] : resolved;
}
