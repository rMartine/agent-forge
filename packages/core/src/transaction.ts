import { access, copyFile, mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import type {
  DeployResult,
  DeploymentPlan,
  DeploymentRecord,
  Diagnostic,
  ManagedArtifactState,
  RestoreResult,
  WipeResult,
} from './types.js';
import { diagnostic, hasErrors } from './diagnostics.js';
import { hashFile } from './hash.js';
import { deploymentStoragePath, loadDeploymentState, saveDeploymentState } from './state.js';

async function exists(filePath: string): Promise<boolean> {
  try { await access(filePath); return true; } catch { return false; }
}

function activeRecord(state: Awaited<ReturnType<typeof loadDeploymentState>>): DeploymentRecord | undefined {
  return state.deployments.find(item => item.id === state.activeDeploymentId);
}

export async function applyDeploymentPlan(plan: DeploymentPlan, statePath: string): Promise<DeployResult> {
  if (hasErrors(plan.diagnostics)) {
    return { success: false, deployed: 0, skipped: 0, failed: plan.diagnostics.filter(item => item.severity === 'error').length, summary: { deployed: 0, skipped: 0, failed: 1 }, details: [], errors: [], diagnostics: plan.diagnostics };
  }
  const state = await loadDeploymentState(statePath);
  const previouslyManaged = new Set(activeRecord(state)?.artifacts.map(item => path.resolve(item.targetPath)) ?? []);
  const collisions: Diagnostic[] = [];
  for (const item of plan.artifacts) {
    if (await exists(item.targetPath) && !previouslyManaged.has(path.resolve(item.targetPath))) {
      collisions.push(diagnostic('AF009', 'error', 'Refusing to replace an unmanaged customization', { path: item.targetPath }));
    }
  }
  if (collisions.length) {
    return { success: false, deployed: 0, skipped: 0, failed: collisions.length, summary: { deployed: 0, skipped: 0, failed: collisions.length }, details: [], errors: [], diagnostics: [...plan.diagnostics, ...collisions] };
  }

  const storage = deploymentStoragePath(statePath, plan.deploymentId);
  const managed: ManagedArtifactState[] = [];
  const touched: ManagedArtifactState[] = [];
  let deployed = 0;
  let skipped = 0;
  try {
    for (const item of plan.artifacts) {
      const present = await exists(item.targetPath);
      if (present && await hashFile(item.targetPath) === item.sourceHash) {
        const previous = activeRecord(state)?.artifacts.find(value => path.resolve(value.targetPath) === path.resolve(item.targetPath));
        managed.push(previous ?? { id: item.id, type: item.type, targetPath: item.targetPath, deployedHash: item.sourceHash, existedBefore: false });
        skipped++;
        continue;
      }
      const record: ManagedArtifactState = { id: item.id, type: item.type, targetPath: item.targetPath, deployedHash: item.sourceHash, existedBefore: present };
      if (present) {
        const backupPath = path.join(storage, 'backups', `${managed.length}.bak`);
        await mkdir(path.dirname(backupPath), { recursive: true });
        await copyFile(item.targetPath, backupPath);
        record.backupPath = backupPath;
      }
      await mkdir(path.dirname(item.targetPath), { recursive: true });
      const temporary = `${item.targetPath}.agent-forge-tmp`;
      await writeFile(temporary, item.content!);
      await rename(temporary, item.targetPath);
      managed.push(record);
      touched.push(record);
      deployed++;
    }
  } catch (error: unknown) {
    for (const item of touched.reverse()) {
      try {
        if (item.backupPath) await copyFile(item.backupPath, item.targetPath);
        else if (await exists(item.targetPath)) await unlink(item.targetPath);
      } catch { /* preserve the original error */ }
    }
    return { success: false, deployed: 0, skipped, failed: 1, summary: { deployed: 0, skipped, failed: 1 }, details: [], errors: [{ path: 'deployment', message: (error as Error).message }], diagnostics: [...plan.diagnostics, diagnostic('AF012', 'error', 'Deployment transaction failed and was rolled back')] };
  }

  state.deployments.push({ id: plan.deploymentId, createdAt: plan.createdAt, repoPath: plan.repoPath, artifacts: managed });
  state.activeDeploymentId = plan.deploymentId;
  await saveDeploymentState(statePath, state);
  return {
    success: true,
    deploymentId: plan.deploymentId,
    deployed,
    skipped,
    failed: 0,
    summary: { deployed, skipped, failed: 0 },
    details: plan.artifacts.map(item => ({ path: item.targetPath, action: 'deployed', type: item.type })),
    errors: [],
    diagnostics: plan.diagnostics,
  };
}

export async function rollbackDeployment(statePath: string, deploymentId?: string): Promise<RestoreResult> {
  const state = await loadDeploymentState(statePath);
  const id = deploymentId ?? state.activeDeploymentId;
  const record = state.deployments.find(item => item.id === id);
  if (!record) return { success: false, restored: 0, skipped: 0, summary: { restored: 0, skipped: 0 }, details: [], errors: [{ path: statePath, message: 'Deployment record not found' }], diagnostics: [diagnostic('AF012', 'error', 'Deployment record not found')] };
  let restored = 0;
  let skipped = 0;
  const diagnostics: Diagnostic[] = [];
  for (const item of [...record.artifacts].reverse()) {
    if (!(await exists(item.targetPath)) || await hashFile(item.targetPath) !== item.deployedHash) {
      skipped++;
      diagnostics.push(diagnostic('AF012', 'warning', 'Preserved a modified or missing managed file during rollback', { path: item.targetPath }));
      continue;
    }
    if (item.backupPath && await exists(item.backupPath)) await copyFile(item.backupPath, item.targetPath);
    else if (!item.existedBefore) await unlink(item.targetPath);
    else {
      skipped++;
      diagnostics.push(diagnostic('AF012', 'error', 'Required rollback backup is missing', { path: item.targetPath }));
      continue;
    }
    restored++;
  }
  const index = state.deployments.findIndex(item => item.id === record.id);
  state.activeDeploymentId = index > 0 ? state.deployments[index - 1].id : undefined;
  await saveDeploymentState(statePath, state);
  return { success: !hasErrors(diagnostics), deploymentId: record.id, restored, skipped, summary: { restored, skipped }, details: record.artifacts.map(item => ({ path: item.targetPath, action: 'rolled-back', type: item.type })), errors: [], diagnostics };
}

export async function removeManagedDeployment(statePath: string): Promise<WipeResult> {
  const state = await loadDeploymentState(statePath);
  const current = activeRecord(state);
  if (!current) return { success: true, deleted: 0, skipped: 0, summary: { deleted: 0, skipped: 0 }, details: [], errors: [], diagnostics: [] };
  let deleted = 0;
  let skipped = 0;
  const diagnostics: Diagnostic[] = [];
  for (const active of current.artifacts) {
    if (!(await exists(active.targetPath)) || await hashFile(active.targetPath) !== active.deployedHash) {
      skipped++;
      diagnostics.push(diagnostic('AF012', 'warning', 'Preserved a modified or missing managed file during wipe', { path: active.targetPath }));
      continue;
    }
    const history = state.deployments.flatMap(record => record.artifacts).filter(item => path.resolve(item.targetPath) === path.resolve(active.targetPath));
    const first = history[0];
    if (first?.existedBefore && first.backupPath && await exists(first.backupPath)) await copyFile(first.backupPath, active.targetPath);
    else await unlink(active.targetPath);
    deleted++;
  }
  state.activeDeploymentId = undefined;
  await saveDeploymentState(statePath, state);
  return { success: true, deleted, skipped, summary: { deleted, skipped }, details: current.artifacts.map(item => ({ path: item.targetPath, action: 'removed', type: item.type })), errors: [], diagnostics };
}
