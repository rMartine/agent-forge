import { readFile, unlink } from 'node:fs/promises';
import * as path from 'node:path';
import { hashBuffer } from './hash.js';
import { applyGraphifyProvisionPlan, loadGraphifyProvisionPlan, loadGraphifyRuntime, verifyGraphifyRuntime, verifyGraphifyProvisionPlan, type GraphifyRuntime } from './graphifyRuntime.js';
import { assertGraphifyPlainPath, graphifyMissing, readGraphifyFile, withGraphifyLock, writeGraphifyFile } from './graphifyFiles.js';
import type { GraphifyDeploymentPlan, GraphifyDeploymentReceipt } from './types.js';

/** Freeze the exact runtime pointer, or reference a separately frozen provision plan. */
export async function prepareGraphifyDeployment(managedRoot: string, provisionPlanId?: string): Promise<GraphifyDeploymentPlan> {
  if (provisionPlanId) {
    const provision = await loadGraphifyProvisionPlan(managedRoot, provisionPlanId);
    return { managedRoot: provision.managedRoot, runtimeId: provision.planId, lockHash: provision.lockHash, provisionPlanId: provision.planId };
  }
  const runtime = await loadGraphifyRuntime(managedRoot);
  await verifyGraphifyRuntime(runtime);
  return { managedRoot: runtime.managedRoot, runtimeId: runtime.runtimeId, lockHash: runtime.lockHash, runtimeHash: hashBuffer(await readFile(path.join(runtime.managedRoot, 'runtime.json'))) };
}

export async function verifyGraphifyDeployment(plan: GraphifyDeploymentPlan): Promise<void> {
  if (plan.provisionPlanId) {
    const frozen = await loadGraphifyProvisionPlan(plan.managedRoot, plan.provisionPlanId);
    await verifyGraphifyProvisionPlan(frozen);
    if (frozen.planId !== plan.runtimeId || frozen.lockHash !== plan.lockHash) throw new Error('Graphify provision plan differs from the reviewed deployment');
    let current: string | null = null;
    try { current = (await readFile(path.join(plan.managedRoot,'runtime.json'))).toString('base64'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    if (current !== frozen.previousRuntimeBase64) throw new Error('Graphify runtime changed after deployment preview');
    return;
  }
  if (!plan.runtimeHash) throw new Error('Graphify deployment has no reviewed runtime hash');
  const current = await prepareGraphifyDeployment(plan.managedRoot);
  if (current.runtimeId !== plan.runtimeId || current.runtimeHash !== plan.runtimeHash || current.lockHash !== plan.lockHash) throw new Error('Graphify runtime changed after deployment preview');
}

export async function applyGraphifyDeployment(plan: GraphifyDeploymentPlan): Promise<GraphifyDeploymentReceipt> {
  await verifyGraphifyDeployment(plan);
  if (plan.provisionPlanId) await applyGraphifyProvisionPlan(await loadGraphifyProvisionPlan(plan.managedRoot, plan.provisionPlanId));
  return { ...plan, runtimeHash: hashBuffer(await readFile(path.join(plan.managedRoot,'runtime.json'))) };
}

export async function restoreDeploymentGraphify(receipt: GraphifyDeploymentReceipt): Promise<void> {
  if (!receipt.provisionPlanId) return; // An independently provisioned runtime belongs to its own transaction.
  const plan = await loadGraphifyProvisionPlan(receipt.managedRoot, receipt.provisionPlanId);
  if (plan.planId !== receipt.runtimeId || plan.lockHash !== receipt.lockHash) throw new Error('Graphify recovery receipt differs from its reviewed plan');
  await withGraphifyLock(path.join(receipt.managedRoot, 'locks', 'provision'), async () => {
    const destination = path.join(receipt.managedRoot, 'runtime.json');
    let bytes: Buffer | undefined;
    try { bytes = await readGraphifyFile(destination); }
    catch (error) { if (!graphifyMissing(error)) throw error; }
    const previousBytes = plan.previousRuntimeBase64 === null ? undefined : Buffer.from(plan.previousRuntimeBase64, 'base64');
    if (previousBytes) {
      const previous = JSON.parse(previousBytes.toString('utf8')) as GraphifyRuntime;
      if (previous.managedRoot !== receipt.managedRoot) throw new Error('Previous Graphify runtime belongs to another directory');
      await verifyGraphifyRuntime(previous);
    }
    // A prior attempt may have restored the pointer before a later file failed.
    // Only the exact saved predecessor is accepted as an already completed step.
    if (bytes?.toString('base64') === previousBytes?.toString('base64')) return;
    const current = await loadGraphifyRuntime(receipt.managedRoot);
    if (!bytes || hashBuffer(bytes) !== receipt.runtimeHash || current.runtimeId !== receipt.runtimeId) throw new Error('Preserved a Graphify runtime changed after deployment');
    await verifyGraphifyRuntime(current);
    if (previousBytes) await writeGraphifyFile(destination, previousBytes);
    else { await assertGraphifyPlainPath(destination); await unlink(destination); }
  });
}
