import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, rmdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { applyDeploymentPlan, hashBuffer, loadDeploymentState, rollbackDeployment } from '../dist/index.js';
import { applyManagedReconciliationPlan, createManagedReconciliationPlan, loadManagedReconciliationPlan, restoreManagedReconciliation, saveManagedReconciliationPlan } from '../dist/reconciliation.js';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'agent-forge-reconciliation-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const statePath = path.join(root, 'state', 'state.json');
  const profile = path.join(root, 'profile');
  await mkdir(path.dirname(statePath), { recursive: true });
  await mkdir(profile);
  const originalFiles = new Map();
  const artifacts = [];
  for (let index = 0; index < 48; index++) {
    const targetPath = path.join(profile, `${index < 16 ? 'agent' : 'skill'}-${index}.txt`);
    artifacts.push({ id: `item-${index}`, type: index < 16 ? 'agent' : 'skill', runtime: 'codex', targetPath, deployedHash: hashBuffer(Buffer.from(`original-${index}`)), existedBefore: false });
    if (index < 16) {
      const content = index === 0 ? Buffer.alloc(0) : Buffer.from(`current-customization-${index}`);
      originalFiles.set(targetPath, content);
      await writeFile(targetPath, content);
    }
  }
  const foreignPath = path.join(profile, 'personal.txt');
  await writeFile(foreignPath, 'personal customization');
  const vscodeRecord = { id: 'vscode-old', runtime: 'vscode', createdAt: '2026-08-23', repoPath: root, artifacts: [] };
  const originalState = Buffer.from(JSON.stringify({ schemaVersion: 2, activeDeployments: { codex: 'codex-old', vscode: 'vscode-old' }, deployments: [vscodeRecord, { id: 'codex-old', runtime: 'codex', createdAt: '2026-08-23', repoPath: root, artifacts }] }));
  await writeFile(statePath, originalState);
  return { root, statePath, artifacts, originalFiles, originalState, foreignPath, vscodeRecord };
}

function updatePlan(f) {
  return {
    deploymentId: 'after-reconciliation', repoPath: f.root, createdAt: new Date().toISOString(), targets: ['codex'], diagnostics: [], cleanupActions: [],
    artifacts: f.artifacts.map((artifact, index) => {
      const content = Buffer.from(`new-product-content-${index}`);
      return { id: artifact.id, type: artifact.type, runtime: 'codex', targetPath: artifact.targetPath, sourcePath: 'generated-source', content, sourceHash: hashBuffer(content) };
    }),
  };
}

async function assertOriginalFiles(f) {
  for (const artifact of f.artifacts) {
    const content = f.originalFiles.get(artifact.targetPath);
    if (content !== undefined) assert.deepEqual(await readFile(artifact.targetPath), content);
    else await assert.rejects(readFile(artifact.targetPath), /ENOENT/);
  }
  assert.equal(await readFile(f.foreignPath, 'utf8'), 'personal customization');
}

test('reconciliation snapshots only owned paths and preserves 16 changed files and 32 absences', async t => {
  const f = await fixture(t);
  const plan = await createManagedReconciliationPlan(f.statePath, 'codex');
  assert.equal(plan.files.filter(file => file.state === 'modified').length, 16);
  assert.equal(plan.files.filter(file => file.state === 'missing').length, 32);
  assert.equal(plan.files.some(file => file.artifact.targetPath === f.foreignPath), false);
  await saveManagedReconciliationPlan(plan, f.statePath);
  const loaded = await loadManagedReconciliationPlan(f.statePath, plan.planId);
  assert.equal(loaded.files[0].contentBase64, '');
  assert.deepEqual(await readFile(f.statePath), f.originalState);
  const result = await applyManagedReconciliationPlan(loaded, f.statePath);
  assert.equal(result.success, true, JSON.stringify(result.errors));
  assert.deepEqual(await readFile(result.previousStateBackupPath), f.originalState);
  const state = await loadDeploymentState(f.statePath);
  const baseline = state.deployments.find(record => record.id === plan.planId);
  assert.equal(baseline.artifacts.length, 16);
  assert.deepEqual(state.deployments[0], f.vscodeRecord);
  assert.equal(state.activeDeployments.vscode, 'vscode-old');
  for (const artifact of baseline.artifacts) assert.deepEqual(await readFile(artifact.backupPath), f.originalFiles.get(artifact.targetPath));
  await assertOriginalFiles(f);
});

test('deployment following reconciliation and its rollback restore the exact current profile and allow ledger recovery', async t => {
  const f = await fixture(t);
  const plan = await createManagedReconciliationPlan(f.statePath, 'codex');
  assert.equal((await applyManagedReconciliationPlan(plan, f.statePath)).success, true);
  assert.equal((await applyDeploymentPlan(updatePlan(f), f.statePath)).success, true);
  assert.equal((await restoreManagedReconciliation(f.statePath, plan.planId)).success, false);
  assert.equal((await rollbackDeployment(f.statePath, 'codex')).success, true);
  assert.equal((await loadDeploymentState(f.statePath)).activeDeployments.codex, plan.planId);
  await assertOriginalFiles(f);
  const result = await restoreManagedReconciliation(f.statePath, plan.planId);
  assert.equal(result.success, true, JSON.stringify(result.errors));
  assert.deepEqual(await readFile(f.statePath), f.originalState);
  await assertOriginalFiles(f);
});

test('reconciliation can immediately restore the original ledger without modifying installed files', async t => {
  const f = await fixture(t);
  const plan = await createManagedReconciliationPlan(f.statePath, 'codex');
  assert.equal((await applyManagedReconciliationPlan(plan, f.statePath)).success, true);
  assert.equal((await restoreManagedReconciliation(f.statePath, plan.planId)).success, true);
  assert.deepEqual(await readFile(f.statePath), f.originalState);
  await assertOriginalFiles(f);
});

test('reconciliation blocks ledger drift, changed content and a formerly missing file that now exists', async t => {
  for (const mutation of ['ledger', 'content', 'absence']) {
    const f = await fixture(t);
    const plan = await createManagedReconciliationPlan(f.statePath, 'codex');
    if (mutation === 'ledger') await writeFile(f.statePath, Buffer.concat([f.originalState, Buffer.from('\n')]));
    if (mutation === 'content') await writeFile(f.artifacts[1].targetPath, 'changed-after-preview');
    if (mutation === 'absence') await writeFile(f.artifacts[16].targetPath, 'new-personal-content');
    const before = await readFile(f.statePath);
    const result = await applyManagedReconciliationPlan(plan, f.statePath);
    assert.equal(result.success, false);
    assert.match(result.errors[0].message, /changed after reconciliation preview/);
    assert.deepEqual(await readFile(f.statePath), before);
  }
});

test('reconciliation refuses to adopt a foreign path, switch runtime, omit a path or alter snapshot bytes', async t => {
  const f = await fixture(t);
  const original = await createManagedReconciliationPlan(f.statePath, 'codex');
  for (const edit of [
    plan => { plan.files[0].artifact.targetPath = f.foreignPath; },
    plan => { plan.runtime = 'vscode'; },
    plan => { plan.files.pop(); },
    plan => { plan.files[0].contentBase64 = Buffer.from('tampered').toString('base64'); },
    plan => { plan.statePath = path.join(f.root, 'other-state.json'); },
  ]) {
    const plan = structuredClone(original); edit(plan);
    assert.equal((await applyManagedReconciliationPlan(plan, f.statePath)).success, false);
    assert.deepEqual(await readFile(f.statePath), f.originalState);
  }
  await assertOriginalFiles(f);
});

test('a backup failure leaves the original ledger and profile unchanged', async t => {
  const f = await fixture(t);
  const plan = await createManagedReconciliationPlan(f.statePath, 'codex');
  const saved = await saveManagedReconciliationPlan(plan, f.statePath);
  await writeFile(path.join(path.dirname(saved), 'files'), 'blocks-backup-directory');
  assert.equal((await applyManagedReconciliationPlan(plan, f.statePath)).success, false);
  assert.deepEqual(await readFile(f.statePath), f.originalState);
  await assertOriginalFiles(f);
});

test('a failed ledger commit retains recoverable snapshots and allows the identical plan to be retried', async t => {
  const f = await fixture(t);
  const plan = await createManagedReconciliationPlan(f.statePath, 'codex');
  const blocker = `${f.statePath}.tmp`;
  await mkdir(blocker);
  const failed = await applyManagedReconciliationPlan(plan, f.statePath);
  assert.equal(failed.success, false);
  assert.deepEqual(await readFile(failed.previousStateBackupPath), f.originalState);
  assert.deepEqual(await readFile(f.statePath), f.originalState);
  await assertOriginalFiles(f);
  await rmdir(blocker);
  assert.equal((await applyManagedReconciliationPlan(plan, f.statePath)).success, true);
});

test('recovery preserves a changed profile and a newer deployment in another runtime', async t => {
  for (const mutation of ['profile', 'other-runtime']) {
    const f = await fixture(t);
    const plan = await createManagedReconciliationPlan(f.statePath, 'codex');
    assert.equal((await applyManagedReconciliationPlan(plan, f.statePath)).success, true);
    if (mutation === 'profile') await writeFile(f.artifacts[2].targetPath, 'later-user-change');
    else {
      const state = await loadDeploymentState(f.statePath);
      state.activeDeployments.vscode = 'vscode-new';
      state.deployments.push({ ...f.vscodeRecord, id: 'vscode-new' });
      await writeFile(f.statePath, JSON.stringify(state));
    }
    const before = await readFile(f.statePath);
    assert.equal((await restoreManagedReconciliation(f.statePath, plan.planId)).success, false);
    assert.deepEqual(await readFile(f.statePath), before);
  }
});
