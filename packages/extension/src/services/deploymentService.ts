import {
  createDeploymentPlan,
  deploy,
  doctorMcp,
  loadCapabilityCatalog,
  loadManifest,
  loadMcpProviders,
  restore,
  status,
  validateRoster,
  wipe,
  type DeploymentPlan,
} from '@agent-forge/core';
import { discoverAvailableToolIds } from './capabilityDiscovery';
import { discoverAvailableModelIds } from './modelPolicyService';

export class DeploymentService {
  constructor(readonly repoPath: string) {}

  async validate() {
    const manifest = await loadManifest(this.repoPath);
    return validateRoster(this.repoPath, manifest, await loadCapabilityCatalog(this.repoPath, manifest.capabilityCatalog));
  }

  async doctor() {
    const manifest = await loadManifest(this.repoPath);
    const roster = await validateRoster(this.repoPath, manifest, await loadCapabilityCatalog(this.repoPath, manifest.capabilityCatalog));
    const mcp = await doctorMcp(await loadMcpProviders(this.repoPath, manifest.mcpProviders));
    return { ready: roster.valid && mcp.ready, roster, mcp, tools: discoverAvailableToolIds(), models: await discoverAvailableModelIds() };
  }

  async preview(strictCapabilities = true): Promise<DeploymentPlan> {
    return createDeploymentPlan(this.repoPath, {
      availableTools: discoverAvailableToolIds(),
      availableModels: await discoverAvailableModelIds(),
      strictCapabilities,
    });
  }

  async deploy() {
    return deploy(this.repoPath, {
      availableTools: discoverAvailableToolIds(),
      availableModels: await discoverAvailableModelIds(),
      strictCapabilities: true,
    });
  }

  status() { return status(this.repoPath); }
  rollback(deploymentId?: string) { return restore(this.repoPath, deploymentId); }
  wipe() { return wipe(this.repoPath); }
}
