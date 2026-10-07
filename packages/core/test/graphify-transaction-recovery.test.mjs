import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { applyDeploymentPlan, rollbackDeployment } from '../dist/transaction.js';
import { hashBuffer } from '../dist/hash.js';
import { loadDeploymentState, saveDeploymentState } from '../dist/state.js';
import { prepareSharedHooks, sharedHooksOwnershipHash } from '../dist/sharedHooks.js';
import { restoreDeploymentGraphify } from '../dist/graphifyDeployment.js';

const require = createRequire(import.meta.url);
const graphifyDeployment = require('../dist/graphifyDeployment.js');
const filesystem = require('node:fs/promises');
const cache = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../.cache');

async function fixture(t) {
  await mkdir(cache, { recursive: true });
  const root = await mkdtemp(path.join(cache, 'graphify-recovery-test-'));
  t.after(async () => {
    assert.equal(path.dirname(root), cache);
    assert.ok(path.basename(root).startsWith('graphify-recovery-test-'));
    await rm(root, { recursive: true, force: true });
  });
  return { root, statePath: path.join(root, 'state.json'), target: path.join(root, 'guide.md') };
}

function artifact(targetPath, content = 'new guide') {
  const bytes = Buffer.from(content);
  return { id: path.basename(targetPath), type: 'skill', runtime: 'codex', sourcePath: 'synthetic-fixture', targetPath, content: bytes, sourceHash: hashBuffer(bytes) };
}

function plan(root, artifacts, cleanupActions = []) {
  return { deploymentId: 'new-deployment', repoPath: root, createdAt: '2026-10-03T00:00:00Z', targets: ['codex'], artifacts, cleanupActions, diagnostics: [], graphify: {} };
}

async function seedState(f, records) {
  const state = { schemaVersion: 2, activeDeployments: { codex: records.at(-1).id }, deployments: records };
  await saveDeploymentState(f.statePath, state);
}

function record(id, artifacts, extra = {}) {
  return { id, runtime: 'codex', createdAt: '2026-10-03T00:00:00Z', repoPath: 'synthetic-fixture', artifacts, ...extra };
}

// These cases use real temporary files but simulate the provisioning boundary;
// no Python runtime is installed and no external profile is accessed.
for (const operation of ['replace', 'create', 'remove']) {
  test(`preserves a concurrent customization during simulated Graphify provisioning: ${operation}`, async t => {
    const f = await fixture(t);
    const old = Buffer.from('old deployed guide');
    const managed = { id: 'guide', type: 'skill', runtime: 'codex', targetPath: f.target, deployedHash: hashBuffer(old), existedBefore: false };
    if (operation !== 'create') await writeFile(f.target, old);
    await seedState(f, [record('old-deployment', operation === 'create' ? [] : [managed])]);
    t.mock.method(graphifyDeployment, 'verifyGraphifyDeployment', async () => {});
    t.mock.method(graphifyDeployment, 'applyGraphifyDeployment', async () => {
      await writeFile(f.target, 'concurrent personal edit');
      return {};
    });
    const cleanup = operation === 'remove' ? [{ runtime: 'codex', targetPath: f.target, expectedHash: managed.deployedHash, type: 'skill', reason: 'stale-managed' }] : [];
    const result = await applyDeploymentPlan(plan(f.root, operation === 'remove' ? [] : [artifact(f.target)], cleanup), f.statePath);
    assert.equal(result.success, false);
    assert.match(result.errors[0].message, /changed during deployment/);
    assert.equal(await readFile(f.target, 'utf8'), 'concurrent personal edit');
    assert.equal((await loadDeploymentState(f.statePath)).activeDeployments.codex, 'old-deployment');
  });
}

// Synthetic receipts exercise pointer ownership and integrity without executing
// their deliberately non-executable Python payloads.
async function syntheticGraphify(f, previousExists = false) {
  const managedRoot = path.join(f.root, 'graphify');
  const payload = Buffer.from('synthetic integrity payload; never executed');
  async function runtime(id) {
    const runtimePath = path.join(managedRoot, 'runtimes', id);
    const pythonPath = path.join(runtimePath, 'python', 'python.exe');
    await mkdir(path.dirname(pythonPath), { recursive: true });
    await writeFile(pythonPath, payload);
    const value = { schemaVersion: 1, runtimeId: id, managedRoot, runtimePath, pythonPath, graphifyVersion: '0.9.74', pythonVersion: '3.12.13', lockHash: 'b'.repeat(64), installedAt: '2026-10-03T00:00:00Z', files: [{ path: 'python/python.exe', sha256: hashBuffer(payload), size: payload.length }] };
    const bytes = Buffer.from(JSON.stringify(value));
    await writeFile(path.join(runtimePath, 'runtime.json'), bytes);
    return bytes;
  }
  const previous = previousExists ? await runtime('c'.repeat(64)) : undefined;
  const lock = { schemaVersion: 1, graphifyVersion: '0.9.74', sourceRevision: 'a'.repeat(40), python: { platform: 'win32', architecture: 'x64', version: '3.12.13' }, wheels: ['pip', 'graphifyy'].map(name => ({ name, version: name === 'pip' ? '25.0' : '0.9.74', filename: `${name}-0-py3-none-any.whl`, url: `https://files.pythonhosted.org/packages/${name}-0-py3-none-any.whl`, sha256: 'a'.repeat(64), size: 1 })) };
  const entry = name => ({ path: name, sha256: hashBuffer(payload), size: payload.length });
  const body = { schemaVersion: 1, createdAt: '2026-10-03T00:00:00Z', managedRoot, lock, lockHash: hashBuffer(Buffer.from(JSON.stringify(lock))), python: { sourceDirectory: 'synthetic-fixture', executable: 'python.exe', version: '3.12.13', files: [entry('python.exe')] }, helpers: [entry('run_local.py'), entry('install_wheels.py')], previousRuntimeBase64: previous?.toString('base64') ?? null };
  const planId = hashBuffer(Buffer.from(JSON.stringify(body)));
  await mkdir(path.join(managedRoot, 'plans', planId), { recursive: true });
  await writeFile(path.join(managedRoot, 'plans', planId, 'plan.json'), JSON.stringify({ ...body, planId }));
  const current = await runtime(planId);
  const pointer = path.join(managedRoot, 'runtime.json');
  await writeFile(pointer, current);
  return { receipt: { managedRoot, runtimeId: planId, provisionPlanId: planId, lockHash: body.lockHash, runtimeHash: hashBuffer(current) }, pointer, previous, runtime };
}

test('retries a partial file and hook rollback, preserves foreign hooks, and retains the active deployment on failure', async t => {
  const f = await fixture(t);
  const graphify = await syntheticGraphify(f);
  const hooksPath = path.join(f.root, 'hooks.json');
  const group = command => ({ hooks: [{ type: 'command', command }] });
  const foreign = group('personal command');
  const originalHooks = Buffer.from(JSON.stringify({ personal: true, hooks: { Stop: [foreign] } }));
  const priorHooks = prepareSharedHooks(originalHooks, { Stop: [group('old managed command')] });
  const newHooks = prepareSharedHooks(priorHooks.content, { Stop: [group('new managed command')] }, priorHooks.sharedHooks.ownership);
  const backup = path.join(f.root, 'guide.backup');
  await writeFile(backup, 'prior guide');
  await writeFile(f.target, 'new guide');
  await writeFile(hooksPath, newHooks.content);
  const fileRecord = { id: 'guide', type: 'skill', runtime: 'codex', targetPath: f.target, deployedHash: hashBuffer(Buffer.from('new guide')), existedBefore: true, backupPath: backup };
  const hookRecord = { id: 'hooks', type: 'hook', runtime: 'codex', targetPath: hooksPath, deployedHash: sharedHooksOwnershipHash(newHooks.sharedHooks.ownership), existedBefore: true, sharedHooks: newHooks.sharedHooks.ownership };
  await seedState(f, [record('old-deployment', []), record('new-deployment', [fileRecord, hookRecord], { previousDeploymentId: 'old-deployment', graphify: graphify.receipt })]);
  const originalRename = filesystem.rename;
  let failOnce = true;
  t.mock.method(filesystem, 'rename', async (from, to) => {
    if (to === f.target && failOnce) { failOnce = false; throw Object.assign(new Error('simulated Windows sharing violation'), { code: 'EBUSY' }); }
    return originalRename(from, to);
  });
  const failed = await rollbackDeployment(f.statePath, 'codex');
  assert.equal(failed.success, false);
  assert.match(failed.diagnostics.find(item => item.severity === 'error').message, /sharing violation/);
  assert.equal((await loadDeploymentState(f.statePath)).activeDeployments.codex, 'new-deployment');
  await assert.rejects(readFile(graphify.pointer), { code: 'ENOENT' });
  assert.equal(await readFile(f.target, 'utf8'), 'new guide');
  const partialHooks = JSON.parse(await readFile(hooksPath, 'utf8'));
  assert.deepEqual(partialHooks.hooks.Stop, [foreign, group('old managed command')]);
  const laterForeign = group('later personal command');
  partialHooks.hooks.Stop.push(laterForeign);
  await writeFile(hooksPath, JSON.stringify(partialHooks));
  const retried = await rollbackDeployment(f.statePath, 'codex');
  assert.equal(retried.success, true, JSON.stringify(retried));
  assert.equal((await loadDeploymentState(f.statePath)).activeDeployments.codex, 'old-deployment');
  assert.equal(await readFile(f.target, 'utf8'), 'prior guide');
  assert.deepEqual(JSON.parse(await readFile(hooksPath, 'utf8')).hooks.Stop, [foreign, group('old managed command'), laterForeign]);
});

test('Graphify rollback accepts only its exact predecessor and remains retryable', async t => {
  const f = await fixture(t);
  const graphify = await syntheticGraphify(f, true);
  await restoreDeploymentGraphify(graphify.receipt);
  assert.deepEqual(await readFile(graphify.pointer), graphify.previous);
  await restoreDeploymentGraphify(graphify.receipt);
  const unrelated = await graphify.runtime('d'.repeat(64));
  await writeFile(graphify.pointer, unrelated);
  await assert.rejects(restoreDeploymentGraphify(graphify.receipt), /changed after deployment/);
  assert.deepEqual(await readFile(graphify.pointer), unrelated);
});

test('an incomplete compensation preserves later edits and reports recovery failure honestly', async t => {
  const f = await fixture(t);
  const blocked = path.join(f.root, 'second.md');
  await writeFile(f.target, 'prior guide');
  await seedState(f, [record('old-deployment', [{ id: 'guide', type: 'skill', runtime: 'codex', targetPath: f.target, deployedHash: hashBuffer(Buffer.from('prior guide')), existedBefore: false }])]);
  const originalRename = filesystem.rename;
  t.mock.method(filesystem, 'rename', async (from, to) => {
    if (to === blocked) {
      await writeFile(f.target, 'personal edit after the first write');
      throw new Error('simulated subsequent write failure');
    }
    return originalRename(from, to);
  });
  const deployment = plan(f.root, [artifact(f.target), artifact(blocked)]);
  delete deployment.graphify;
  const failed = await applyDeploymentPlan(deployment, f.statePath);
  assert.equal(failed.success, false);
  assert.equal(await readFile(f.target, 'utf8'), 'personal edit after the first write');
  assert.match(failed.errors[1].message, /recovery needs attention/);
  assert.match(failed.diagnostics.at(-1).message, /recovery is incomplete/);
  assert.doesNotMatch(failed.diagnostics.at(-1).message, /all earlier changes were rolled back/);
  assert.equal((await loadDeploymentState(f.statePath)).activeDeployments.codex, 'old-deployment');
});
