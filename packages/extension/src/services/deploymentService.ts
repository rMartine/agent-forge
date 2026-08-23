import {
  applyCleanupPlan,
  applyDeploymentPlan,
  createCleanupPlan,
  createDeploymentPlan,
  discoverCodexEnvironment,
  doctorMcp,
  getDeploymentStatus,
  loadCapabilityCatalog,
  loadManifest,
  loadMcpProviders,
  resolveStatePath,
  restore,
  saveCleanupPlan,
  saveDeploymentPlan,
  validateRoster,
  wipe,
  type CleanupPlan,
  type DeploymentPlan,
  type RuntimeSelection,
  type RuntimeTarget,
} from '@agent-forge/core';
import { discoverAvailableToolIds } from './capabilityDiscovery';
import { discoverAvailableModelIds } from './modelPolicyService';

export class DeploymentService {
  constructor(readonly repoPath: string) {}

  async validate(target: RuntimeSelection = 'all') {
    const manifest = await loadManifest(this.repoPath);
    return validateRoster(this.repoPath, manifest, await loadCapabilityCatalog(this.repoPath, manifest.capabilityCatalog), { target });
  }

  async doctor(target: RuntimeSelection = 'all') {
    const manifest = await loadManifest(this.repoPath);
    const roster = await this.validate(target);
    const mcp = target === 'codex' ? undefined : await doctorMcp(await loadMcpProviders(this.repoPath, manifest.mcpProviders));
    const codex = target === 'vscode' ? undefined : await discoverCodexEnvironment();
    const tools = discoverAvailableToolIds();
    const models = await discoverAvailableModelIds();
    const preview = await createDeploymentPlan(this.repoPath, {
      target,
      availableTools: tools,
      availableModels: models,
      strictCapabilities: target !== 'codex',
    });
    const ready = roster.valid && (mcp?.ready ?? true) && (codex?.supported ?? true) && !preview.diagnostics.some(item => item.severity === 'error');
    return { ready, roster, mcp, codex, preview, tools, models };
  }

  async preview(target: RuntimeSelection = 'all', strictCapabilities = true): Promise<DeploymentPlan> {
    const plan = await createDeploymentPlan(this.repoPath, {
      target,
      availableTools: discoverAvailableToolIds(),
      availableModels: await discoverAvailableModelIds(),
      strictCapabilities: target === 'codex' ? false : strictCapabilities,
    });
    const manifest = await loadManifest(this.repoPath);
    await saveDeploymentPlan(plan, resolveStatePath(manifest.targets.state));
    return plan;
  }

  async deploy(plan: DeploymentPlan) {
    const manifest = await loadManifest(this.repoPath);
    return applyDeploymentPlan(plan, resolveStatePath(manifest.targets.state));
  }

  status(target: RuntimeSelection = 'all') { return getDeploymentStatus(this.repoPath, { target }); }
  rollback(runtime: RuntimeTarget, deploymentId?: string) { return restore(this.repoPath, deploymentId, runtime); }
  wipe(runtime: RuntimeTarget) { return wipe(this.repoPath, runtime); }

  async cleanupPreview(target: RuntimeSelection = 'all'): Promise<CleanupPlan> {
    const plan = await createCleanupPlan(this.repoPath, {
      target,
      availableTools: discoverAvailableToolIds(),
      availableModels: await discoverAvailableModelIds(),
      strictCapabilities: target !== 'codex',
    });
    const manifest = await loadManifest(this.repoPath);
    await saveCleanupPlan(plan, resolveStatePath(manifest.targets.state));
    return plan;
  }

  async cleanup(plan: CleanupPlan) {
    const manifest = await loadManifest(this.repoPath);
    return applyCleanupPlan(plan, resolveStatePath(manifest.targets.state));
  }
}
