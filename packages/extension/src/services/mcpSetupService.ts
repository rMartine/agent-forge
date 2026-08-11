import {
  doctorMcp,
  loadManifest,
  loadMcpProviders,
  type McpDoctorResult,
  type McpProviderCatalog,
} from '@agent-forge/core';

export interface McpSetupPreview {
  catalog: McpProviderCatalog;
  doctor: McpDoctorResult;
}

export async function createMcpSetupPreview(repoPath: string): Promise<McpSetupPreview> {
  const manifest = await loadManifest(repoPath);
  const catalog = await loadMcpProviders(repoPath, manifest.mcpProviders);
  return { catalog, doctor: await doctorMcp(catalog) };
}
