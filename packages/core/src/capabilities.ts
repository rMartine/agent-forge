import * as path from 'node:path';
import type {
  AgentManifestEntry,
  CapabilityCatalog,
  ResolvedAgentRuntime,
} from './types.js';
import { loadJsonc } from './manifest.js';
import { resolveRepoFilePath } from './paths.js';

export async function loadCapabilityCatalog(repoPath: string, relativePath: string): Promise<CapabilityCatalog> {
  const catalog = await loadJsonc<CapabilityCatalog>(resolveRepoFilePath(repoPath, relativePath));
  if (catalog.version !== 1 || !catalog.profiles || !catalog.capabilities) {
    throw new Error(`Invalid capability catalog: ${path.basename(relativePath)}`);
  }
  return catalog;
}

function matchesTool(available: Set<string> | undefined, tool: string): boolean {
  if (!available) return true;
  if (available.has(tool)) return true;
  if (tool.endsWith('/*')) {
    const prefix = tool.slice(0, -1);
    return [...available].some(item => item.startsWith(prefix));
  }
  return false;
}

export function resolveAgentCapabilities(
  agent: AgentManifestEntry,
  catalog: CapabilityCatalog,
  availableTools?: Iterable<string>,
): ResolvedAgentRuntime {
  const profile = catalog.profiles[agent.capabilityProfile];
  if (!profile) throw new Error(`Unknown capability profile "${agent.capabilityProfile}" for ${agent.id}`);
  const available = availableTools ? new Set(availableTools) : undefined;
  const tools = new Set(profile.builtins);
  const missingRequiredCapabilities: string[] = [];
  const missingOptionalCapabilities: string[] = [];

  const addCapability = (name: string, required: boolean): void => {
    const capability = catalog.capabilities[name];
    if (!capability) {
      (required ? missingRequiredCapabilities : missingOptionalCapabilities).push(name);
      return;
    }
    const matched = capability.tools.filter(tool => matchesTool(available, tool));
    if (matched.length === 0) {
      (required ? missingRequiredCapabilities : missingOptionalCapabilities).push(name);
      return;
    }
    matched.forEach(tool => tools.add(tool));
  };

  for (const name of [...profile.required, ...agent.requiredCapabilities]) addCapability(name, true);
  for (const name of [...profile.optional, ...agent.optionalCapabilities]) addCapability(name, false);
  return { tools: [...tools], missingRequiredCapabilities, missingOptionalCapabilities };
}

export function resolveCapabilityCatalog(
  agents: Record<string, AgentManifestEntry>,
  catalog: CapabilityCatalog,
  availableTools: Iterable<string>,
): Record<string, ResolvedAgentRuntime> {
  return Object.fromEntries(Object.values(agents).map(agent => [agent.id, resolveAgentCapabilities(agent, catalog, availableTools)]));
}
