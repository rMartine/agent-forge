import { access, copyFile, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import type {
  CleanupPlan,
  CleanupAction,
  DeployResult,
  DeploymentPlan,
  DeploymentRecord,
  Diagnostic,
  ManagedArtifactState,
  RestoreResult,
  RuntimeTarget,
  WipeResult,
} from './types.js';
import { diagnostic, hasErrors } from './diagnostics.js';
import { hashBuffer, hashFile } from './hash.js';
import { deploymentStoragePath, loadDeploymentState, saveDeploymentState } from './state.js';
import { assertSharedHooksPlan, restoreRemovedSharedHooks, restoreSharedHooks, sharedHooksAreIntact, sharedHooksOwnershipHash } from './sharedHooks.js';

async function exists(filePath: string): Promise<boolean> {
  try { await access(filePath); return true; } catch { return false; }
}

async function readOptional(filePath: string): Promise<Buffer | undefined> {
  try { return await readFile(filePath); }
  catch (error: unknown) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined; throw error; }
}

async function replaceFile(targetPath: string, content: Buffer | undefined): Promise<void> {
  if (!content) { if (await exists(targetPath)) await unlink(targetPath); return; }
  await mkdir(path.dirname(targetPath), { recursive: true });
  const temporary = `${targetPath}.agent-forge-tmp`;
  try { await writeFile(temporary, content); await rename(temporary, targetPath); }
  finally { if (await exists(temporary)) await unlink(temporary); }
}

function activeRecord(state: Awaited<ReturnType<typeof loadDeploymentState>>, runtime: RuntimeTarget): DeploymentRecord | undefined {
  const id = state.activeDeployments[runtime];
  return state.deployments.find(item => item.id === id && item.runtime === runtime);
}

function assertSharedCleanupOwnership(action: CleanupAction, managed: ManagedArtifactState | undefined): void {
  if (!action.sharedHooks || !managed?.sharedHooks || action.runtime !== managed.runtime
    || action.expectedHash !== managed.deployedHash
    || sharedHooksOwnershipHash(action.sharedHooks) !== managed.deployedHash
    || JSON.stringify(action.sharedHooks) !== JSON.stringify(managed.sharedHooks)) {
    throw new Error('AF012: shared hook cleanup ownership no longer matches the active deployment; create a new plan');
  }
}

interface UndoEntry { targetPath: string; existed: boolean; backupPath?: string; }

async function backupForUndo(targetPath: string, storage: string, index: number): Promise<UndoEntry> {
  const present = await exists(targetPath);
  if (!present) return { targetPath, existed: false };
  const backupPath = path.join(storage, 'transaction', `${index}.bak`);
  await mkdir(path.dirname(backupPath), { recursive: true });
  await copyFile(targetPath, backupPath);
  return { targetPath, existed: true, backupPath };
}

async function undo(entries: UndoEntry[]): Promise<void> {
  for (const entry of [...entries].reverse()) {
    try {
      if (entry.existed && entry.backupPath) {
        await mkdir(path.dirname(entry.targetPath), { recursive: true });
        await copyFile(entry.backupPath, entry.targetPath);
      } else if (await exists(entry.targetPath)) {
        await unlink(entry.targetPath);
      }
    } catch { /* preserve the original transaction error */ }
  }
}

export async function applyDeploymentPlan(plan: DeploymentPlan, statePath: string): Promise<DeployResult> {
  if (hasErrors(plan.diagnostics)) {
    const failed = plan.diagnostics.filter(item => item.severity === 'error').length;
    return { success: false, deployed: 0, skipped: 0, failed, summary: { deployed: 0, skipped: 0, failed }, details: [], errors: [], diagnostics: plan.diagnostics };
  }
  const artifacts = plan.artifacts.map(item => ({ ...item, runtime: item.runtime ?? 'vscode' as RuntimeTarget }));
  const targets = plan.targets ?? [...new Set(artifacts.map(item => item.runtime))];
  const cleanupActions = plan.cleanupActions ?? [];
  const state = await loadDeploymentState(statePath);
  const activeByRuntime = new Map(targets.map(runtime => [runtime, activeRecord(state, runtime)]));
  const managedByPath = new Map<string, ManagedArtifactState>();
  for (const record of activeByRuntime.values()) {
    for (const item of record?.artifacts ?? []) managedByPath.set(path.resolve(item.targetPath).toLowerCase(), item);
  }

  const blockers: Diagnostic[] = [];
  for (const item of artifacts) {
    if (!item.content || hashBuffer(item.content) !== item.sourceHash) {
      blockers.push(diagnostic('AF012', 'error', 'Deployment artifact bytes do not match the immutable preview hash', { path: item.targetPath }));
      continue;
    }
    const managed = managedByPath.get(path.resolve(item.targetPath).toLowerCase());
    if (item.sharedHooks) {
      try { assertSharedHooksPlan(await readOptional(item.targetPath), item.content, item.sharedHooks, managed?.sharedHooks); }
      catch (error: unknown) { blockers.push(diagnostic('AF012', 'error', (error as Error).message, { path: item.targetPath })); }
      continue;
    }
    if (!(await exists(item.targetPath))) continue;
    if (!managed) {
      blockers.push(diagnostic('AF009', 'error', 'Refusing to replace an unmanaged customization', { path: item.targetPath }));
    } else if (await hashFile(item.targetPath) !== managed.deployedHash) {
      blockers.push(diagnostic('AF012', 'error', 'Managed customization was modified after deployment; preserve it and resolve before redeploying', { path: item.targetPath }));
    }
  }
  for (const action of cleanupActions) {
    if (action.sharedHooks) {
      try {
        assertSharedCleanupOwnership(action, managedByPath.get(path.resolve(action.targetPath).toLowerCase()));
        if (!sharedHooksAreIntact(await readOptional(action.targetPath), action.sharedHooks)) {
          throw new Error('Stale managed hook groups were modified or are missing; cleanup is blocked');
        }
      } catch (error: unknown) { blockers.push(diagnostic('AF012', 'error', (error as Error).message, { path: action.targetPath })); }
      continue;
    }
    if (!(await exists(action.targetPath)) || await hashFile(action.targetPath) !== action.expectedHash) {
      blockers.push(diagnostic('AF012', 'error', 'Stale managed artifact was modified or is missing; cleanup is blocked', { path: action.targetPath }));
    }
  }
  if (blockers.length) {
    return { success: false, deployed: 0, skipped: 0, failed: blockers.length, summary: { deployed: 0, skipped: 0, failed: blockers.length }, details: [], errors: [], diagnostics: [...plan.diagnostics, ...blockers] };
  }

  const storage = deploymentStoragePath(statePath, plan.deploymentId);
  const undoEntries: UndoEntry[] = [];
  const managed = new Map<RuntimeTarget, ManagedArtifactState[]>(targets.map(runtime => [runtime, []]));
  const removed = new Map<RuntimeTarget, ManagedArtifactState[]>(targets.map(runtime => [runtime, []]));
  let deployed = 0;
  let skipped = 0;
  try {
    for (const item of artifacts) {
      const present = await exists(item.targetPath);
      const previous = managedByPath.get(path.resolve(item.targetPath).toLowerCase());
      if (item.sharedHooks) {
        assertSharedHooksPlan(await readOptional(item.targetPath), item.content!, item.sharedHooks, previous?.sharedHooks);
        const unchanged = present && await hashFile(item.targetPath) === item.sourceHash;
        const undoEntry = unchanged ? undefined : await backupForUndo(item.targetPath, storage, undoEntries.length);
        if (undoEntry) undoEntries.push(undoEntry);
        if (!unchanged) {
          assertSharedHooksPlan(await readOptional(item.targetPath), item.content!, item.sharedHooks, previous?.sharedHooks);
          await replaceFile(item.targetPath, item.content!);
        }
        managed.get(item.runtime)!.push({
          id: item.id, type: item.type, runtime: item.runtime, targetPath: item.targetPath,
          deployedHash: sharedHooksOwnershipHash(item.sharedHooks.ownership),
          existedBefore: present, backupPath: undoEntry?.backupPath, sharedHooks: item.sharedHooks.ownership,
        });
        if (unchanged) skipped++; else deployed++;
        continue;
      }
      if (present && await hashFile(item.targetPath) === item.sourceHash) {
        managed.get(item.runtime)!.push(previous ?? {
          id: item.id, type: item.type, runtime: item.runtime, targetPath: item.targetPath,
          deployedHash: item.sourceHash, existedBefore: false,
        });
        skipped++;
        continue;
      }
      const undoEntry = await backupForUndo(item.targetPath, storage, undoEntries.length);
      undoEntries.push(undoEntry);
      const record: ManagedArtifactState = {
        id: item.id,
        type: item.type,
        runtime: item.runtime,
        targetPath: item.targetPath,
        deployedHash: item.sourceHash,
        existedBefore: present,
        backupPath: undoEntry.backupPath,
      };
      await replaceFile(item.targetPath, item.content!);
      managed.get(item.runtime)!.push(record);
      deployed++;
    }

    for (const action of cleanupActions) {
      const sharedContent = action.sharedHooks ? restoreSharedHooks(await readOptional(action.targetPath), action.sharedHooks, 'remove') : undefined;
      const undoEntry = await backupForUndo(action.targetPath, storage, undoEntries.length);
      undoEntries.push(undoEntry);
      removed.get(action.runtime)!.push({
        id: path.basename(action.targetPath),
        type: action.type,
        runtime: action.runtime,
        targetPath: action.targetPath,
        deployedHash: action.expectedHash,
        existedBefore: true,
        backupPath: undoEntry.backupPath,
        ...(action.sharedHooks ? { sharedHooks: action.sharedHooks } : {}),
      });
      if (action.sharedHooks) await replaceFile(action.targetPath, sharedContent);
      else await unlink(action.targetPath);
    }

    for (const runtime of targets) {
      const record: DeploymentRecord = {
        id: plan.deploymentId,
        runtime,
        createdAt: plan.createdAt,
        repoPath: plan.repoPath,
        sourceCommit: plan.sourceCommit,
        previousDeploymentId: activeByRuntime.get(runtime)?.id ?? null,
        artifacts: managed.get(runtime)!,
        removedArtifacts: removed.get(runtime)!,
      };
      state.deployments.push(record);
      state.activeDeployments[runtime] = plan.deploymentId;
    }
    await saveDeploymentState(statePath, state);
  } catch (error: unknown) {
    await undo(undoEntries);
    return {
      success: false, deployed: 0, skipped, failed: 1,
      summary: { deployed: 0, skipped, failed: 1 }, details: [],
      errors: [{ path: 'deployment', message: (error as Error).message }],
      diagnostics: [...plan.diagnostics, diagnostic('AF012', 'error', 'Grouped runtime deployment failed and all earlier changes were rolled back')],
    };
  }
  return {
    success: true,
    deploymentId: plan.deploymentId,
    deployed,
    skipped,
    failed: 0,
    summary: { deployed, skipped, removed: cleanupActions.length, failed: 0 },
    details: [
      ...artifacts.map(item => ({ path: item.targetPath, action: 'deployed', type: item.type })),
      ...cleanupActions.map(item => ({ path: item.targetPath, action: 'removed-stale', type: item.type })),
    ],
    errors: [],
    diagnostics: plan.diagnostics,
  };
}

export async function rollbackDeployment(statePath: string, runtimeOrDeployment: RuntimeTarget | string = 'vscode', deploymentId?: string): Promise<RestoreResult> {
  const runtime: RuntimeTarget = runtimeOrDeployment === 'vscode' || runtimeOrDeployment === 'codex' ? runtimeOrDeployment : 'vscode';
  if (runtimeOrDeployment !== 'vscode' && runtimeOrDeployment !== 'codex') deploymentId = runtimeOrDeployment;
  const state = await loadDeploymentState(statePath);
  const id = deploymentId ?? state.activeDeployments[runtime];
  const record = state.deployments.find(item => item.id === id && item.runtime === runtime);
  if (!record) return { success: false, restored: 0, skipped: 0, summary: { restored: 0, skipped: 0 }, details: [], errors: [{ path: statePath, message: 'Deployment record not found' }], diagnostics: [diagnostic('AF012', 'error', 'Deployment record not found')] };
  let restored = 0;
  let skipped = 0;
  const diagnostics: Diagnostic[] = [];
  for (const item of record.artifacts) {
    if (!item.sharedHooks) continue;
    try { restoreSharedHooks(await readOptional(item.targetPath), item.sharedHooks, 'rollback'); }
    catch (error: unknown) { diagnostics.push(diagnostic('AF012', 'error', (error as Error).message, { path: item.targetPath })); }
  }
  for (const item of record.removedArtifacts ?? []) {
    if (!item.sharedHooks) continue;
    try { restoreRemovedSharedHooks(await readOptional(item.targetPath), item.sharedHooks); }
    catch (error: unknown) { diagnostics.push(diagnostic('AF012', 'error', (error as Error).message, { path: item.targetPath })); }
  }
  if (hasErrors(diagnostics)) {
    return { success: false, deploymentId: record.id, restored: 0, skipped: diagnostics.length, summary: { restored: 0, skipped: diagnostics.length }, details: [], errors: [], diagnostics };
  }
  for (const item of [...record.artifacts].reverse()) {
    if (item.sharedHooks) {
      // Read again immediately before writing so later foreign additions are retained.
      await replaceFile(item.targetPath, restoreSharedHooks(await readOptional(item.targetPath), item.sharedHooks, 'rollback'));
      restored++;
      continue;
    }
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
  for (const item of record.removedArtifacts ?? []) {
    if (item.sharedHooks) {
      await replaceFile(item.targetPath, restoreRemovedSharedHooks(await readOptional(item.targetPath), item.sharedHooks));
      restored++;
      continue;
    }
    if (await exists(item.targetPath)) {
      skipped++;
      diagnostics.push(diagnostic('AF012', 'warning', 'Preserved a replacement at a previously removed managed path', { path: item.targetPath }));
      continue;
    }
    if (!item.backupPath || !(await exists(item.backupPath))) {
      skipped++;
      diagnostics.push(diagnostic('AF012', 'error', 'Required stale-artifact rollback backup is missing', { path: item.targetPath }));
      continue;
    }
    await mkdir(path.dirname(item.targetPath), { recursive: true });
    await copyFile(item.backupPath, item.targetPath);
    restored++;
  }
  const index = state.deployments.findIndex(item => item.id === record.id && item.runtime === runtime);
  const previous = record.previousDeploymentId === undefined
    ? state.deployments.slice(0, index).reverse().find(item => item.runtime === runtime)
    : state.deployments.find(item => item.runtime === runtime && item.id === record.previousDeploymentId);
  state.activeDeployments[runtime] = previous?.id;
  if (!previous) delete state.activeDeployments[runtime];
  await saveDeploymentState(statePath, state);
  return { success: !hasErrors(diagnostics), deploymentId: record.id, restored, skipped, summary: { restored, skipped }, details: record.artifacts.map(item => ({ path: item.targetPath, action: 'rolled-back', type: item.type })), errors: [], diagnostics };
}

export async function removeManagedDeployment(statePath: string, runtime: RuntimeTarget = 'vscode'): Promise<WipeResult> {
  const state = await loadDeploymentState(statePath);
  const current = activeRecord(state, runtime);
  if (!current) return { success: true, deleted: 0, skipped: 0, summary: { deleted: 0, skipped: 0 }, details: [], errors: [], diagnostics: [] };
  let deleted = 0;
  let skipped = 0;
  const diagnostics: Diagnostic[] = [];
  const removedPaths = new Set<string>();
  let preservedSharedHooks = false;
  const originalArtifacts = [...current.artifacts];
  for (const active of current.artifacts) {
    if (active.sharedHooks) {
      try {
        await replaceFile(active.targetPath, restoreSharedHooks(await readOptional(active.targetPath), active.sharedHooks, 'remove'));
        removedPaths.add(active.targetPath);
        deleted++;
      } catch (error: unknown) {
        skipped++;
        preservedSharedHooks = true;
        diagnostics.push(diagnostic('AF012', 'warning', (error as Error).message, { path: active.targetPath }));
      }
      continue;
    }
    if (!(await exists(active.targetPath)) || await hashFile(active.targetPath) !== active.deployedHash) {
      skipped++;
      diagnostics.push(diagnostic('AF012', 'warning', 'Preserved a modified or missing managed file during wipe', { path: active.targetPath }));
      continue;
    }
    const history = state.deployments
      .filter(record => record.runtime === runtime)
      .flatMap(record => record.artifacts)
      .filter(item => path.resolve(item.targetPath) === path.resolve(active.targetPath));
    const first = history[0];
    if (first?.existedBefore && first.backupPath && await exists(first.backupPath)) await copyFile(first.backupPath, active.targetPath);
    else await unlink(active.targetPath);
    removedPaths.add(active.targetPath);
    deleted++;
  }
  if (preservedSharedHooks) current.artifacts = current.artifacts.filter(item => !removedPaths.has(item.targetPath));
  else delete state.activeDeployments[runtime];
  await saveDeploymentState(statePath, state);
  return { success: true, deleted, skipped, summary: { deleted, skipped }, details: originalArtifacts.map(item => ({ path: item.targetPath, action: removedPaths.has(item.targetPath) ? 'removed' : 'preserved', type: item.type })), errors: [], diagnostics };
}

export async function applyManagedCleanupPlan(plan: CleanupPlan, statePath: string): Promise<WipeResult> {
  const diagnostics = [...plan.diagnostics];
  const state = await loadDeploymentState(statePath);
  let deleted = 0;
  let skipped = 0;
  const removed: Array<{ path: string; content: Buffer; sharedHooks?: CleanupAction['sharedHooks'] }> = [];
  for (const action of plan.actions) {
    if (action.sharedHooks) {
      try {
        const current = activeRecord(state, action.runtime)?.artifacts.find(item => path.resolve(item.targetPath).toLowerCase() === path.resolve(action.targetPath).toLowerCase());
        assertSharedCleanupOwnership(action, current);
        const content = await readOptional(action.targetPath);
        restoreSharedHooks(content, action.sharedHooks, 'remove');
        removed.push({ path: action.targetPath, content: content!, sharedHooks: action.sharedHooks });
      } catch (error: unknown) {
        skipped++;
        diagnostics.push(diagnostic('AF012', 'warning', (error as Error).message, { path: action.targetPath }));
      }
      continue;
    }
    if (!(await exists(action.targetPath)) || await hashFile(action.targetPath) !== action.expectedHash) {
      skipped++;
      diagnostics.push(diagnostic('AF012', 'warning', 'Preserved modified or missing managed cleanup target', { path: action.targetPath }));
      continue;
    }
    removed.push({ path: action.targetPath, content: await readFile(action.targetPath) });
  }
  if (hasErrors(diagnostics)) return { success: false, deleted: 0, skipped, summary: { deleted: 0, skipped }, details: [], errors: [], diagnostics };
  try {
    for (const item of removed) {
      if (item.sharedHooks) {
        item.content = (await readOptional(item.path))!;
        await replaceFile(item.path, restoreSharedHooks(item.content, item.sharedHooks, 'remove'));
      } else await unlink(item.path);
      deleted++;
    }
    const removedPaths = new Set(removed.map(item => path.resolve(item.path).toLowerCase()));
    for (const runtime of plan.targets) {
      const record = activeRecord(state, runtime);
      if (record) record.artifacts = record.artifacts.filter(item => !removedPaths.has(path.resolve(item.targetPath).toLowerCase()));
    }
    await saveDeploymentState(statePath, state);
  } catch (error: unknown) {
    for (const item of removed) {
      try { await mkdir(path.dirname(item.path), { recursive: true }); await writeFile(item.path, item.content); } catch { /* preserve original failure */ }
    }
    return { success: false, deleted: 0, skipped, summary: { deleted: 0, skipped }, details: [], errors: [{ path: 'cleanup', message: (error as Error).message }], diagnostics: [...diagnostics, diagnostic('AF012', 'error', 'Managed cleanup failed and was rolled back')] };
  }
  const cleanedPaths = new Set(removed.map(item => path.resolve(item.path).toLowerCase()));
  return { success: true, deleted, skipped, summary: { deleted, skipped }, details: plan.actions.map(item => ({ path: item.targetPath, action: cleanedPaths.has(path.resolve(item.targetPath).toLowerCase()) ? 'cleaned' : 'preserved', type: item.type })), errors: [], diagnostics };
}
