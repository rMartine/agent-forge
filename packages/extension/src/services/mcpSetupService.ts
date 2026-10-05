import {
  doctorMcp,
  createMcpSetupPlan,
  applyMcpSetupPlan,
  loadManifest,
  loadMcpProviders,
  type McpDoctorResult,
  type McpProviderCatalog,
  type McpSetupPlan,
  type McpSetupResult,
} from '@agent-forge/core';

export interface McpSetupPreview {
  catalog: McpProviderCatalog;
  doctor: McpDoctorResult;
  plan: McpSetupPlan;
}

export async function createMcpSetupPreview(repoPath: string): Promise<McpSetupPreview> {
  const manifest = await loadManifest(repoPath);
  const catalog = await loadMcpProviders(repoPath, manifest.copilotFourRosters?.mcpProviders ?? manifest.mcpProviders);
  return { catalog, doctor: await doctorMcp(catalog), plan: createMcpSetupPlan(catalog) };
}

export function applyMcpSetupPreview(preview: McpSetupPreview, approvedProviders: string[]): Promise<McpSetupResult> {
  return applyMcpSetupPlan(preview.plan, approvedProviders);
}
