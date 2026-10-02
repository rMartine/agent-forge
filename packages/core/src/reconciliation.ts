import { randomBytes } from 'node:crypto';
import { lstat, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import type { DeploymentStateV2, ManagedArtifactState, OperationResult, RuntimeDeploymentRecord, RuntimeTarget } from './types.js';
import { diagnostic } from './diagnostics.js';
import { hashBuffer } from './hash.js';
import { saveDeploymentState } from './state.js';

export interface ManagedReconciliationFile {
  artifact: ManagedArtifactState;
  state: 'unchanged' | 'modified' | 'missing';
  observedHash: string | null;
  contentBase64?: string;
}

export interface ManagedReconciliationPlan {
  schemaVersion: 1;
  planId: string;
  createdAt: string;
  runtime: RuntimeTarget;
  statePath: string;
  previousDeploymentId: string;
  previousStateHash: string;
  previousStateBase64: string;
  files: ManagedReconciliationFile[];
  explanation: string;
}

export interface ManagedReconciliationResult extends OperationResult {
  planId: string;
  baselineDeploymentId?: string;
  backupDirectory: string;
  previousStateBackupPath: string;
}

interface ReconciliationReceipt { planId: string; baselineStateHash: string; }

function parseState(content: Buffer): DeploymentStateV2 {
  const state = JSON.parse(content.toString('utf8')) as DeploymentStateV2;
  if (state.schemaVersion !== 2 || !Array.isArray(state.deployments) || !state.activeDeployments || typeof state.activeDeployments !== 'object') {
    throw new Error('AF012: managed reconciliation requires an existing schema 2 deployment ledger');
  }
  return state;
}

function normalizedPath(filePath: string): string { return path.resolve(filePath).toLowerCase(); }

async function readRegularFile(filePath: string): Promise<Buffer | undefined> {
  try {
    const info = await lstat(filePath);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error(`AF012: reconciliation requires a regular file: ${filePath}`);
    return await readFile(filePath);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

function storagePath(statePath: string, planId: string): string {
  if (!/^reconciled-[a-zA-Z0-9-]+$/.test(planId)) throw new Error('AF012: invalid reconciliation plan ID');
  return path.join(path.dirname(path.resolve(statePath)), 'reconciliations', planId);
}

function validatePlan(plan: ManagedReconciliationPlan, statePath: string): { previousState: DeploymentStateV2; previousRecord: RuntimeDeploymentRecord; previousBytes: Buffer } {
  if (plan.schemaVersion !== 1 || !['codex', 'vscode'].includes(plan.runtime) || normalizedPath(plan.statePath) !== normalizedPath(statePath)) {
    throw new Error('AF012: reconciliation runtime, state path or schema does not match');
  }
  storagePath(statePath, plan.planId);
  const previousBytes = Buffer.from(plan.previousStateBase64, 'base64');
  if (hashBuffer(previousBytes) !== plan.previousStateHash) throw new Error('AF012: reconciliation ledger snapshot hash mismatch');
  const previousState = parseState(previousBytes);
  const previousRecord = previousState.deployments.find(item => item.runtime === plan.runtime && item.id === previousState.activeDeployments[plan.runtime]);
  if (!previousRecord || previousRecord.id !== plan.previousDeploymentId || previousRecord.artifacts.length !== plan.files.length) {
    throw new Error('AF012: reconciliation must describe every path of the specified active deployment');
  }
  if (previousState.deployments.some(item => item.id === plan.planId)) throw new Error('AF012: reconciliation ID is already in deployment history');
  const paths = new Set<string>();
  for (const [index, file] of plan.files.entries()) {
    const original = previousRecord.artifacts[index];
    if (JSON.stringify(file.artifact) !== JSON.stringify(original) || original.runtime !== plan.runtime || original.sharedHooks || !path.isAbsolute(original.targetPath)) {
      throw new Error('AF012: reconciliation supports only complete files already owned by this runtime');
    }
    const key = normalizedPath(original.targetPath);
    if (paths.has(key)) throw new Error('AF012: duplicate owned path in reconciliation');
    paths.add(key);
    if (key === normalizedPath(statePath)) throw new Error('AF012: deployment ledger cannot be an artifact reconciliation target');
    if (file.observedHash === null) {
      if (file.state !== 'missing' || file.contentBase64 !== undefined) throw new Error('AF012: missing artifact cannot contain snapshot bytes');
    } else {
      if (typeof file.contentBase64 !== 'string' || hashBuffer(Buffer.from(file.contentBase64, 'base64')) !== file.observedHash
        || file.state !== (file.observedHash === original.deployedHash ? 'unchanged' : 'modified')) {
        throw new Error('AF012: reconciliation artifact snapshot hash or state mismatch');
      }
    }
  }
  return { previousState, previousRecord, previousBytes };
}

async function assertObservedFiles(plan: ManagedReconciliationPlan): Promise<void> {
  for (const file of plan.files) {
    const current = await readRegularFile(file.artifact.targetPath);
    if ((current === undefined ? null : hashBuffer(current)) !== file.observedHash) {
      throw new Error(`AF012: managed path changed after reconciliation preview: ${file.artifact.targetPath}`);
    }
  }
}

async function writeImmutable(filePath: string, content: Buffer): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  try { await writeFile(filePath, content, { flag: 'wx' }); }
  catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    if (hashBuffer(await readFile(filePath)) !== hashBuffer(content)) throw new Error(`AF012: refusing to replace a different reconciliation backup: ${filePath}`);
  }
}

export async function createManagedReconciliationPlan(statePath: string, runtime: RuntimeTarget): Promise<ManagedReconciliationPlan> {
  if (!['codex', 'vscode'].includes(runtime)) throw new Error('AF012: reconciliation requires an explicit supported runtime');
  const previousBytes = await readRegularFile(statePath);
  if (!previousBytes) throw new Error('AF012: no existing deployment ledger to reconcile');
  const previousState = parseState(previousBytes);
  const previous = previousState.deployments.find(item => item.runtime === runtime && item.id === previousState.activeDeployments[runtime]);
  if (!previous) throw new Error(`AF012: no active ${runtime} deployment to reconcile`);
  const files: ManagedReconciliationFile[] = [];
  for (const artifact of previous.artifacts) {
    if (artifact.runtime !== runtime || artifact.sharedHooks || !path.isAbsolute(artifact.targetPath)) throw new Error('AF012: reconciliation supports only complete files already owned by this runtime');
    const content = await readRegularFile(artifact.targetPath);
    const observedHash = content === undefined ? null : hashBuffer(content);
    files.push({ artifact: structuredClone(artifact), state: observedHash === null ? 'missing' : observedHash === artifact.deployedHash ? 'unchanged' : 'modified', observedHash, ...(content === undefined ? {} : { contentBase64: content.toString('base64') }) });
  }
  const plan: ManagedReconciliationPlan = {
    schemaVersion: 1,
    planId: `reconciled-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomBytes(3).toString('hex')}`,
    createdAt: new Date().toISOString(), runtime, statePath: path.resolve(statePath),
    previousDeploymentId: previous.id, previousStateHash: hashBuffer(previousBytes), previousStateBase64: previousBytes.toString('base64'), files,
    explanation: 'Record the current bytes and absences only for paths already owned by the active deployment. Preserve the original ledger and each existing file in persistent backups. Applying this plan changes only the ledger; the next deployment backs up this observed baseline, and its rollback restores the present files and removes files that were absent. No unmanaged path is adopted.',
  };
  validatePlan(plan, statePath);
  return plan;
}

export async function saveManagedReconciliationPlan(plan: ManagedReconciliationPlan, statePath: string): Promise<string> {
  validatePlan(plan, statePath);
  const filePath = path.join(storagePath(statePath, plan.planId), 'plan.json');
  await writeImmutable(filePath, Buffer.from(JSON.stringify(plan, null, 2)));
  return filePath;
}

export async function loadManagedReconciliationPlan(statePath: string, planId: string): Promise<ManagedReconciliationPlan> {
  const plan = JSON.parse(await readFile(path.join(storagePath(statePath, planId), 'plan.json'), 'utf8')) as ManagedReconciliationPlan;
  if (plan.planId !== planId) throw new Error('AF012: reconciliation plan ID mismatch');
  validatePlan(plan, statePath);
  return plan;
}

function resultPaths(plan: ManagedReconciliationPlan, statePath: string) {
  const backupDirectory = storagePath(statePath, plan.planId);
  return { planId: plan.planId, backupDirectory, previousStateBackupPath: path.join(backupDirectory, 'state-before.json') };
}

export async function applyManagedReconciliationPlan(plan: ManagedReconciliationPlan, statePath: string): Promise<ManagedReconciliationResult> {
  const paths = resultPaths(plan, statePath);
  try {
    const { previousState, previousRecord, previousBytes } = validatePlan(plan, statePath);
    if (hashBuffer(await readFile(statePath)) !== plan.previousStateHash) throw new Error('AF012: deployment ledger changed after reconciliation preview');
    await assertObservedFiles(plan);
    await saveManagedReconciliationPlan(plan, statePath);
    await writeImmutable(paths.previousStateBackupPath, previousBytes);
    const artifacts: ManagedArtifactState[] = [];
    for (const [index, file] of plan.files.entries()) {
      if (file.observedHash === null) continue;
      const backupPath = path.join(paths.backupDirectory, 'files', `${index}.bak`);
      await writeImmutable(backupPath, Buffer.from(file.contentBase64!, 'base64'));
      artifacts.push({ id: file.artifact.id, type: file.artifact.type, runtime: plan.runtime, targetPath: file.artifact.targetPath, deployedHash: file.observedHash, existedBefore: true, backupPath });
    }
    previousState.deployments.push({ id: plan.planId, runtime: plan.runtime, createdAt: plan.createdAt, repoPath: previousRecord.repoPath, sourceCommit: previousRecord.sourceCommit, previousDeploymentId: previousRecord.id, artifacts });
    previousState.activeDeployments[plan.runtime] = plan.planId;
    const baselineBytes = Buffer.from(JSON.stringify(previousState, null, 2));
    await writeImmutable(path.join(paths.backupDirectory, 'state-reconciled.json'), baselineBytes);
    await writeImmutable(path.join(paths.backupDirectory, 'receipt.json'), Buffer.from(JSON.stringify({ planId: plan.planId, baselineStateHash: hashBuffer(baselineBytes) } satisfies ReconciliationReceipt, null, 2)));
    // Backups may take time; recheck all preimages before changing the ledger.
    await assertObservedFiles(plan);
    if (hashBuffer(await readFile(statePath)) !== plan.previousStateHash) throw new Error('AF012: deployment ledger changed while backing up reconciliation');
    await saveDeploymentState(statePath, previousState);
    return { ...paths, baselineDeploymentId: plan.planId, success: true, summary: { recorded: artifacts.length, modified: plan.files.filter(file => file.state === 'modified').length, absent: plan.files.filter(file => file.state === 'missing').length }, details: plan.files.map(file => ({ path: file.artifact.targetPath, type: file.artifact.type, action: file.state === 'missing' ? 'recorded-absence' : 'backed-up-current-file' })), errors: [], diagnostics: [] };
  } catch (error: unknown) {
    return { ...paths, success: false, summary: { recorded: 0 }, details: [], errors: [{ path: statePath, message: (error as Error).message }], diagnostics: [diagnostic('AF012', 'error', 'Reconciliation did not change installed files; resolve the reported drift or backup failure before applying a new preview')] };
  }
}

export async function restoreManagedReconciliation(statePath: string, planId: string): Promise<ManagedReconciliationResult> {
  const plan = await loadManagedReconciliationPlan(statePath, planId);
  const paths = resultPaths(plan, statePath);
  try {
    const { previousState, previousBytes } = validatePlan(plan, statePath);
    if (hashBuffer(await readFile(paths.previousStateBackupPath)) !== plan.previousStateHash) throw new Error('AF012: original reconciliation ledger backup was modified');
    const receipt = JSON.parse(await readFile(path.join(paths.backupDirectory, 'receipt.json'), 'utf8')) as ReconciliationReceipt;
    const baselineBytes = await readFile(path.join(paths.backupDirectory, 'state-reconciled.json'));
    if (receipt.planId !== planId || hashBuffer(baselineBytes) !== receipt.baselineStateHash) throw new Error('AF012: reconciliation receipt or baseline backup was modified');
    const currentBytes = await readFile(statePath);
    const current = parseState(currentBytes);
    if (current.activeDeployments[plan.runtime] !== planId) throw new Error('AF012: reconciliation baseline is no longer active; roll back later deployments before restoring its ledger');
    if (hashBuffer(currentBytes) !== receipt.baselineStateHash) {
      const baseline = parseState(baselineBytes);
      const currentBaseline = current.deployments.find(item => item.id === planId && item.runtime === plan.runtime);
      const savedBaseline = baseline.deployments.find(item => item.id === planId && item.runtime === plan.runtime);
      const unrelated = (state: DeploymentStateV2) => ({ active: Object.fromEntries(Object.entries(state.activeDeployments).filter(([runtime]) => runtime !== plan.runtime)), records: state.deployments.filter(item => item.runtime !== plan.runtime) });
      const oldTargetRecords = previousState.deployments.filter(item => item.runtime === plan.runtime);
      if (JSON.stringify(currentBaseline) !== JSON.stringify(savedBaseline)
        || JSON.stringify(unrelated(current)) !== JSON.stringify(unrelated(previousState))
        || oldTargetRecords.some(record => JSON.stringify(record) !== JSON.stringify(current.deployments.find(item => item.id === record.id && item.runtime === record.runtime)))) {
        throw new Error('AF012: deployment history changed beyond this reconciliation; preserving the current ledger');
      }
    }
    await assertObservedFiles(plan);
    await writeImmutable(path.join(paths.backupDirectory, 'state-before-restore.json'), currentBytes);
    if (hashBuffer(await readFile(statePath)) !== hashBuffer(currentBytes)) throw new Error('AF012: ledger changed during reconciliation recovery');
    const temporary = `${statePath}.${planId}.tmp`;
    try { await writeFile(temporary, previousBytes, { flag: 'wx' }); await rename(temporary, statePath); }
    finally { try { await unlink(temporary); } catch (error: unknown) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; } }
    return { ...paths, success: true, summary: { restoredLedgers: 1 }, details: [], errors: [], diagnostics: [] };
  } catch (error: unknown) {
    return { ...paths, success: false, summary: { restoredLedgers: 0 }, details: [], errors: [{ path: statePath, message: (error as Error).message }], diagnostics: [diagnostic('AF012', 'error', 'Reconciliation recovery preserved the current ledger and installed files')] };
  }
}
