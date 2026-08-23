import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import type { CleanupPlan, RuntimeSelection } from './types.js';
import { createDeploymentPlan, type DeploymentPlanOptions } from './deploymentPlan.js';
import { deploymentPlanPath } from './state.js';
import { applyManagedCleanupPlan } from './transaction.js';

export async function createCleanupPlan(
  repoPath: string,
  options: DeploymentPlanOptions & { target?: RuntimeSelection } = {},
): Promise<CleanupPlan> {
  const preview = await createDeploymentPlan(repoPath, options);
  return {
    planId: `cleanup-${preview.deploymentId}`,
    repoPath,
    createdAt: preview.createdAt,
    targets: preview.targets,
    actions: preview.cleanupActions,
    diagnostics: preview.diagnostics,
  };
}

export async function saveCleanupPlan(plan: CleanupPlan, statePath: string): Promise<string> {
  const filePath = deploymentPlanPath(statePath, plan.planId);
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp`;
  await writeFile(temporary, JSON.stringify(plan, null, 2), 'utf8');
  await rename(temporary, filePath);
  return filePath;
}

export async function loadCleanupPlan(statePath: string, planId: string): Promise<CleanupPlan> {
  const plan = JSON.parse(await readFile(deploymentPlanPath(statePath, planId), 'utf8')) as CleanupPlan;
  if (plan.planId !== planId) throw new Error('AF012: immutable cleanup plan ID mismatch');
  return plan;
}

export function applyCleanupPlan(plan: CleanupPlan, statePath: string) {
  return applyManagedCleanupPlan(plan, statePath);
}
