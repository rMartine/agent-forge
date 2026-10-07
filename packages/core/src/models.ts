import type { AgentManifestEntry, CodexAgentManifestEntry, CodexEnvironment, CodexReasoningEffort, Diagnostic, ModelPolicy } from './types.js';
import { loadJsonc } from './manifest.js';
import { resolveRepoFilePath } from './paths.js';
import { diagnostic } from './diagnostics.js';

export const CODEX_REASONING_EFFORTS: readonly CodexReasoningEffort[] = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra'];

export function validateCodexModelConfiguration(model: unknown, effort: unknown): string | undefined {
  if (typeof model !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,127}$/.test(model)) return 'model must be an explicit model identifier with no whitespace';
  if (!CODEX_REASONING_EFFORTS.includes(effort as CodexReasoningEffort)) return 'modelReasoningEffort must be a supported Codex reasoning effort';
  return undefined;
}

/** Catalog availability is an observation, never permission to substitute a model. */
export function validateCodexModelAvailability(
  agents: Record<string, CodexAgentManifestEntry>,
  environment: Pick<CodexEnvironment, 'availableModels' | 'availableReasoningEfforts' | 'modelCatalogSource'>,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const source = environment.modelCatalogSource ? ` in ${environment.modelCatalogSource}` : ' in the supplied model catalog';
  for (const agent of Object.values(agents)) {
    if (!agent.model) continue;
    if (environment.availableModels && !environment.availableModels.includes(agent.model)) {
      diagnostics.push(diagnostic('AF011', 'error', `Codex agent ${agent.id} requires model ${agent.model}, which is not available${source}.`, { agentId: agent.id, hint: 'Refresh the catalog or explicitly revise the agent assignment; Agent Forge will not silently inherit or substitute another model.' }));
      continue;
    }
    const efforts = environment.availableReasoningEfforts?.[agent.model];
    if (efforts && agent.modelReasoningEffort && !efforts.includes(agent.modelReasoningEffort)) {
      diagnostics.push(diagnostic('AF011', 'error', `Codex agent ${agent.id} requires ${agent.modelReasoningEffort} reasoning for ${agent.model}, unsupported${source}.`, { agentId: agent.id, hint: 'Choose an effort supported by the selected model after reviewing the assignment.' }));
    }
  }
  return diagnostics;
}

export async function loadModelPolicy(repoPath: string, relativePath: string): Promise<ModelPolicy> {
  const policy = await loadJsonc<ModelPolicy>(resolveRepoFilePath(repoPath, relativePath));
  if (policy.version !== 1 || !policy.profiles) throw new Error('Invalid model profile configuration');
  for (const [profile, models] of Object.entries(policy.profiles)) {
    if (!Array.isArray(models) || models.some(model => typeof model !== 'string' || model.trim().length === 0)) {
      throw new Error(`Invalid model list for profile ${profile}`);
    }
  }
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

export function resolveModelPolicy(
  agents: Record<string, AgentManifestEntry>,
  policy: ModelPolicy,
  availableModels: Iterable<string>,
): Record<string, string | string[] | undefined> {
  return Object.fromEntries(Object.values(agents).map(agent => [agent.id, resolveAgentModel(agent, policy, availableModels)]));
}
