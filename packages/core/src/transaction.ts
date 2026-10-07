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
  GraphifyDeploymentReceipt,
} from './types.js';
import { diagnostic, hasErrors } from './diagnostics.js';
import { hashBuffer, hashFile } from './hash.js';
import { deploymentStoragePath, loadDeploymentState, saveDeploymentState } from './state.js';
import { assertSharedHooksPlan, restoreRemovedSharedHooks, restoreSharedHooks, sharedHooksAreIntact, sharedHooksOwnershipHash } from './sharedHooks.js';
import { applyGraphifyDeployment, restoreDeploymentGraphify, verifyGraphifyDeployment } from './graphifyDeployment.js';

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

interface UndoEntry { targetPath: string; existed: boolean; backupPath?: string; expectedAfterHash?: string | null; }

const optionalHash = (content: Buffer | undefined): string | null => content ? hashBuffer(content) : null;
const normalizedPath = (targetPath: string): string => path.resolve(targetPath).toLowerCase();

async function assertUnchanged(targetPath: string, expected: string | null): Promise<void> {
  if (optionalHash(await readOptional(targetPath)) !== expected) throw new Error(`AF012: customization changed during deployment; preserved ${targetPath}`);
}

async function backupForUndo(targetPath: string, storage: string, index: number): Promise<UndoEntry> {
  const present = await exists(targetPath);
  if (!present) return { targetPath, existed: false };
  const backupPath = path.join(storage, 'transaction', `${index}.bak`);
  await mkdir(path.dirname(backupPath), { recursive: true });
  await copyFile(targetPath, backupPath);
  return { targetPath, existed: true, backupPath };
}

async function undo(entries: UndoEntry[]): Promise<Array<{ path: string; message: string }>> {
  const errors: Array<{ path: string; message: string }> = [];
  for (const entry of [...entries].reverse()) {
    try {
      const before = entry.existed && entry.backupPath ? await readFile(entry.backupPath) : undefined;
      const currentHash = optionalHash(await readOptional(entry.targetPath));
      if (currentHash === optionalHash(before)) continue;
      if (currentHash !== entry.expectedAfterHash) throw new Error('Preserved a customization modified after the deployment wrote it');
      await replaceFile(entry.targetPath, before);
    } catch (error) { errors.push({ path: entry.targetPath, message: `File recovery needs attention: ${(error as Error).message}` }); }
  }
  return errors;
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
  const reviewedHashes = new Map<string, string | null>();
  if (plan.graphify) {
    if (!targets.includes('codex')) blockers.push(diagnostic('AF012', 'error', 'Graphify is only a Codex deployment component'));
    else try { await verifyGraphifyDeployment(plan.graphify); }
    catch (error) { blockers.push(diagnostic('AF012', 'error', (error as Error).message, { path: plan.graphify.managedRoot })); }
  }
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
    const before = await readOptional(item.targetPath);
    reviewedHashes.set(normalizedPath(item.targetPath), optionalHash(before));
    if (!before) continue;
    if (!managed) {
      blockers.push(diagnostic('AF009', 'error', 'Refusing to replace an unmanaged customization', { path: item.targetPath }));
    } else if (hashBuffer(before) !== managed.deployedHash) {
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
    const before = await readOptional(action.targetPath);
    reviewedHashes.set(normalizedPath(action.targetPath), optionalHash(before));
    if (!before || hashBuffer(before) !== action.expectedHash) {
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
  let graphifyReceipt: GraphifyDeploymentReceipt | undefined;
  try {
    if (plan.graphify) graphifyReceipt = await applyGraphifyDeployment(plan.graphify);
    for (const item of artifacts) {
      const present = await exists(item.targetPath);
      const previous = managedByPath.get(path.resolve(item.targetPath).toLowerCase());
      if (item.sharedHooks) {
        assertSharedHooksPlan(await readOptional(item.targetPath), item.content!, item.sharedHooks, previous?.sharedHooks);
        const unchanged = present && await hashFile(item.targetPath) === item.sourceHash;
        const undoEntry = unchanged ? undefined : await backupForUndo(item.targetPath, storage, undoEntries.length);
        if (!unchanged) {
          assertSharedHooksPlan(await readOptional(item.targetPath), item.content!, item.sharedHooks, previous?.sharedHooks);
          undoEntry!.expectedAfterHash = item.sourceHash;
          undoEntries.push(undoEntry!);
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
      await assertUnchanged(item.targetPath, reviewedHashes.get(normalizedPath(item.targetPath))!);
      if (present && await hashFile(item.targetPath) === item.sourceHash) {
        // Each release needs its own preimage even when no bytes are written.
        // Reusing the previous record could delete an unchanged file when that
        // older release originally created it, or restore the wrong preimage.
        const undoEntry = await backupForUndo(item.targetPath, storage, undoEntries.length);
        await assertUnchanged(item.targetPath, reviewedHashes.get(normalizedPath(item.targetPath))!);
        undoEntry.expectedAfterHash = item.sourceHash;
        undoEntries.push(undoEntry);
        managed.get(item.runtime)!.push({
          id: item.id, type: item.type, runtime: item.runtime, targetPath: item.targetPath,
          deployedHash: item.sourceHash, existedBefore: true, backupPath: undoEntry.backupPath,
        });
        skipped++;
        continue;
      }
      const undoEntry = await backupForUndo(item.targetPath, storage, undoEntries.length);
      await assertUnchanged(item.targetPath, reviewedHashes.get(normalizedPath(item.targetPath))!);
      undoEntry.expectedAfterHash = item.sourceHash;
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
      if (!action.sharedHooks) await assertUnchanged(action.targetPath, reviewedHashes.get(normalizedPath(action.targetPath))!);
      const before = await readOptional(action.targetPath);
      const sharedContent = action.sharedHooks ? restoreSharedHooks(before, action.sharedHooks, 'remove') : undefined;
      const undoEntry = await backupForUndo(action.targetPath, storage, undoEntries.length);
      await assertUnchanged(action.targetPath, optionalHash(before));
      undoEntry.expectedAfterHash = optionalHash(sharedContent);
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
        ...(runtime === 'codex' && graphifyReceipt ? { graphify: graphifyReceipt } : {}),
      };
      state.deployments.push(record);
      state.activeDeployments[runtime] = plan.deploymentId;
    }
    await saveDeploymentState(statePath, state);
  } catch (error: unknown) {
    const recoveryErrors = await undo(undoEntries);
    if (graphifyReceipt?.provisionPlanId) {
      try { await restoreDeploymentGraphify(graphifyReceipt); }
      catch (recoveryError) { recoveryErrors.push({ path: graphifyReceipt.managedRoot, message: `Graphify recovery needs attention: ${(recoveryError as Error).message}` }); }
    }
    return {
      success: false, deployed: 0, skipped, failed: 1,
      summary: { deployed: 0, skipped, failed: 1 }, details: [],
      errors: [{ path: 'deployment', message: (error as Error).message }, ...recoveryErrors],
      diagnostics: [...plan.diagnostics, diagnostic('AF012', 'error', recoveryErrors.length
        ? 'Grouped runtime deployment failed; recovery is incomplete and requires attention'
        : 'Grouped runtime deployment failed and all earlier changes were rolled back')],
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

interface RollbackProgress {
  schemaVersion: 1;
  recordHash: string;
  attempts: Record<string, { beforeHash: string | null; afterHash: string | null }>;
}

function recoverSharedContent(content: Buffer | undefined, item: ManagedArtifactState, removed: boolean, attempted: boolean): Buffer | undefined {
  const ownership = item.sharedHooks!;
  if (removed && attempted && sharedHooksAreIntact(content, ownership)) return content;
  try { return removed ? restoreRemovedSharedHooks(content, ownership) : restoreSharedHooks(content, ownership, 'rollback'); }
  catch (error) {
    if (!attempted || removed) throw error;
    // A completed write may precede a later failure. Confirm the prior managed
    // groups and absence of the replaced groups while retaining foreign additions.
    const previous = { ...ownership, groups: ownership.previousGroups };
    if (previous.groups.length && !sharedHooksAreIntact(content, previous)) throw error;
    if (!content && (!ownership.createdFile || previous.groups.length)) throw error;
    const replaced = ownership.groups.filter(group => !previous.groups.some(before => before.fingerprint === group.fingerprint));
    restoreRemovedSharedHooks(content, { ...ownership, groups: replaced });
    return content;
  }
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
  const progressPath = path.join(deploymentStoragePath(statePath, record.id), `rollback-${runtime}.json`);
  const recordHash = hashBuffer(Buffer.from(JSON.stringify(record)));
  let progress: RollbackProgress = { schemaVersion: 1, recordHash, attempts: {} };
  try {
    const saved = await readOptional(progressPath);
    if (saved) {
      progress = JSON.parse(saved.toString('utf8')) as RollbackProgress;
      if (progress.schemaVersion !== 1 || progress.recordHash !== recordHash || !progress.attempts || typeof progress.attempts !== 'object' || Array.isArray(progress.attempts)
        || Object.values(progress.attempts).some(attempt => !attempt || [attempt.beforeHash, attempt.afterHash].some(value => value !== null && (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value))))) throw new Error('Rollback progress differs from the deployment record; preserve it for inspection');
    }
  } catch (error) {
    return { success: false, deploymentId: record.id, restored: 0, skipped: 0, summary: { restored: 0, skipped: 0 }, details: [], errors: [{ path: progressPath, message: (error as Error).message }], diagnostics: [diagnostic('AF012', 'error', 'Unable to read rollback progress; no changes were made')] };
  }
  const attemptKey = (item: ManagedArtifactState, removed = false) => `${removed ? 'removed' : 'artifact'}:${normalizedPath(item.targetPath)}`;
  const writeRecovery = async (item: ManagedArtifactState, before: Buffer | undefined, after: Buffer | undefined, removed = false): Promise<void> => {
    const key = attemptKey(item, removed);
    // Persist intent before the file change so interruption between writes is retryable.
    if (!Object.hasOwn(progress.attempts, key)) {
      progress.attempts[key] = { beforeHash: optionalHash(before), afterHash: optionalHash(after) };
      await replaceFile(progressPath, Buffer.from(JSON.stringify(progress, null, 2) + '\n'));
    }
    await assertUnchanged(item.targetPath, optionalHash(before));
    await replaceFile(item.targetPath, after);
  };
  const alreadyRecovered = (item: ManagedArtifactState, content: Buffer | undefined, removed = false) => {
    const attempt = progress.attempts[attemptKey(item, removed)];
    return !!attempt && optionalHash(content) === attempt.afterHash;
  };
  for (const item of record.artifacts) {
    if (!item.sharedHooks) continue;
    try { recoverSharedContent(await readOptional(item.targetPath), item, false, Object.hasOwn(progress.attempts, attemptKey(item))); }
    catch (error: unknown) { diagnostics.push(diagnostic('AF012', 'error', (error as Error).message, { path: item.targetPath })); }
  }
  for (const item of record.removedArtifacts ?? []) {
    if (!item.sharedHooks) continue;
    try { recoverSharedContent(await readOptional(item.targetPath), item, true, Object.hasOwn(progress.attempts, attemptKey(item, true))); }
    catch (error: unknown) { diagnostics.push(diagnostic('AF012', 'error', (error as Error).message, { path: item.targetPath })); }
  }
  if (hasErrors(diagnostics)) {
    return { success: false, deploymentId: record.id, restored: 0, skipped: diagnostics.length, summary: { restored: 0, skipped: diagnostics.length }, details: [], errors: [], diagnostics };
  }
  if (record.graphify?.provisionPlanId) {
    try { await restoreDeploymentGraphify(record.graphify); }
    catch (error) {
      diagnostics.push(diagnostic('AF012', 'error', (error as Error).message, { path: record.graphify.managedRoot }));
      return { success: false, deploymentId: record.id, restored: 0, skipped: diagnostics.length, summary: { restored: 0, skipped: diagnostics.length }, details: [], errors: [], diagnostics };
    }
  }
  for (const item of [...record.artifacts].reverse()) {
    try {
      const before = await readOptional(item.targetPath);
      if (alreadyRecovered(item, before)) { skipped++; continue; }
      if (item.sharedHooks) {
        const after = recoverSharedContent(before, item, false, Object.hasOwn(progress.attempts, attemptKey(item)));
        if (optionalHash(before) === optionalHash(after)) { skipped++; continue; }
        await writeRecovery(item, before, after);
      } else {
        if (!before || hashBuffer(before) !== item.deployedHash) {
          skipped++;
          diagnostics.push(diagnostic('AF012', 'warning', 'Preserved a modified or missing managed file during rollback', { path: item.targetPath }));
          continue;
        }
        if (item.backupPath && await exists(item.backupPath)) await writeRecovery(item, before, await readFile(item.backupPath));
        else if (!item.existedBefore) await writeRecovery(item, before, undefined);
        else throw new Error('Required rollback backup is missing');
      }
      restored++;
    } catch (error) {
      skipped++;
      diagnostics.push(diagnostic('AF012', 'error', (error as Error).message, { path: item.targetPath }));
    }
  }
  for (const item of record.removedArtifacts ?? []) {
    try {
      const before = await readOptional(item.targetPath);
      if (alreadyRecovered(item, before, true)) { skipped++; continue; }
      if (item.sharedHooks) {
        const after = recoverSharedContent(before, item, true, Object.hasOwn(progress.attempts, attemptKey(item, true)));
        if (optionalHash(before) === optionalHash(after)) { skipped++; continue; }
        await writeRecovery(item, before, after, true);
      } else {
        if (before) {
          skipped++;
          diagnostics.push(diagnostic('AF012', 'warning', 'Preserved a replacement at a previously removed managed path', { path: item.targetPath }));
          continue;
        }
        if (!item.backupPath || !(await exists(item.backupPath))) throw new Error('Required stale-artifact rollback backup is missing');
        await writeRecovery(item, before, await readFile(item.backupPath), true);
      }
      restored++;
    } catch (error) {
      skipped++;
      diagnostics.push(diagnostic('AF012', 'error', (error as Error).message, { path: item.targetPath }));
    }
  }
  if (hasErrors(diagnostics)) return { success: false, deploymentId: record.id, restored, skipped, summary: { restored, skipped }, details: [], errors: [], diagnostics };
  const index = state.deployments.findIndex(item => item.id === record.id && item.runtime === runtime);
  const previous = record.previousDeploymentId === undefined
    ? state.deployments.slice(0, index).reverse().find(item => item.runtime === runtime)
    : state.deployments.find(item => item.runtime === runtime && item.id === record.previousDeploymentId);
  state.activeDeployments[runtime] = previous?.id;
  if (!previous) delete state.activeDeployments[runtime];
  try { await saveDeploymentState(statePath, state); }
  catch (error) {
    return { success: false, deploymentId: record.id, restored, skipped, summary: { restored, skipped }, details: [], errors: [{ path: statePath, message: (error as Error).message }], diagnostics: [...diagnostics, diagnostic('AF012', 'error', 'Rollback files were processed but the deployment state could not be saved; retry the same rollback')] };
  }
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
