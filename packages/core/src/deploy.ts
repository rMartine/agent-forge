import type { DeployResult } from './types.js';
import type { DeploymentPlanOptions } from './deploymentPlan.js';
import { createDeploymentPlan } from './deploymentPlan.js';
import { loadManifest } from './manifest.js';
import { resolveStatePath } from './paths.js';
import { applyDeploymentPlan } from './transaction.js';

export async function deploy(repoPath: string, options: DeploymentPlanOptions = {}): Promise<DeployResult> {
  const manifest = await loadManifest(repoPath);
  const plan = await createDeploymentPlan(repoPath, options);
  return applyDeploymentPlan(plan, resolveStatePath(manifest.targets.state));
}
