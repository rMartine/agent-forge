import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { applyDeploymentPlan, hashBuffer, rollbackDeployment } from '../dist/index.js';

test('deployment is ownership-tracked and rollback removes newly created files', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'agent-forge-test-'));
  try {
    const target = path.join(root, 'profile', 'agent.agent.md');
    const state = path.join(root, 'state', 'state.json');
    const content = Buffer.from('agent');
    const plan = {
      deploymentId: 'test-deployment', repoPath: root, createdAt: new Date().toISOString(),
      diagnostics: [],
      artifacts: [{ id: 'agent', type: 'agent', sourcePath: 'source', targetPath: target, content, sourceHash: hashBuffer(content) }],
    };
    const deployed = await applyDeploymentPlan(plan, state);
    assert.equal(deployed.success, true);
    assert.equal(await readFile(target, 'utf8'), 'agent');
    const rolledBack = await rollbackDeployment(state);
    assert.equal(rolledBack.success, true);
    await assert.rejects(readFile(target), /ENOENT/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('failed multi-file deployment restores the previous installation', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'agent-forge-atomic-'));
  try {
    const first = path.join(root, 'profile', 'first.md');
    const blockingParent = path.join(root, 'blocking-parent');
    await mkdir(path.dirname(first), { recursive: true });
    await writeFile(blockingParent, 'not a directory');
    const one = Buffer.from('one');
    const two = Buffer.from('two');
    const result = await applyDeploymentPlan({
      deploymentId: 'failed-deployment', repoPath: root, createdAt: new Date().toISOString(), diagnostics: [],
      artifacts: [
        { id: 'one', type: 'agent', sourcePath: 'one', targetPath: first, content: one, sourceHash: hashBuffer(one) },
        { id: 'two', type: 'agent', sourcePath: 'two', targetPath: path.join(blockingParent, 'two.md'), content: two, sourceHash: hashBuffer(two) },
      ],
    }, path.join(root, 'state.json'));
    assert.equal(result.success, false);
    await assert.rejects(access(first), /ENOENT/);
    assert.equal(result.diagnostics.some(item => item.code === 'AF012'), true);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('unmanaged target collision blocks deployment without overwriting it', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'agent-forge-collision-'));
  try {
    const target = path.join(root, 'profile', 'agent.md');
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, 'unmanaged');
    const content = Buffer.from('managed');
    const result = await applyDeploymentPlan({ deploymentId: 'collision', repoPath: root, createdAt: new Date().toISOString(), diagnostics: [], artifacts: [
      { id: 'agent', type: 'agent', sourcePath: 'source', targetPath: target, content, sourceHash: hashBuffer(content) },
    ] }, path.join(root, 'state.json'));
    assert.equal(result.success, false);
    assert.equal(await readFile(target, 'utf8'), 'unmanaged');
    assert.equal(result.diagnostics.some(item => item.code === 'AF009'), true);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('grouped dual-runtime failure rolls back the earlier runtime', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'agent-forge-grouped-'));
  try {
    const vscodeTarget = path.join(root, '.copilot', 'agents', 'one.md');
    const blockingParent = path.join(root, 'blocking-parent');
    await writeFile(blockingParent, 'not a directory');
    const one = Buffer.from('one');
    const two = Buffer.from('two');
    const result = await applyDeploymentPlan({
      deploymentId: 'grouped', repoPath: root, createdAt: new Date().toISOString(), targets: ['vscode', 'codex'],
      diagnostics: [], cleanupActions: [],
      artifacts: [
        { runtime: 'vscode', id: 'one', type: 'agent', sourcePath: 'one', targetPath: vscodeTarget, content: one, sourceHash: hashBuffer(one) },
        { runtime: 'codex', id: 'two', type: 'agent', sourcePath: 'two', targetPath: path.join(blockingParent, 'two.toml'), content: two, sourceHash: hashBuffer(two) },
      ],
    }, path.join(root, 'state.json'));
    assert.equal(result.success, false);
    await assert.rejects(access(vscodeTarget), /ENOENT/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('redeployment blocks a modified managed file', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'agent-forge-modified-'));
  try {
    const target = path.join(root, '.codex', 'agents', 'worker.toml');
    const state = path.join(root, 'state.json');
    const first = Buffer.from('first');
    const plan = {
      deploymentId: 'first', repoPath: root, createdAt: new Date().toISOString(), targets: ['codex'],
      diagnostics: [], cleanupActions: [],
      artifacts: [{ runtime: 'codex', id: 'worker', type: 'agent', sourcePath: 'source', targetPath: target, content: first, sourceHash: hashBuffer(first) }],
    };
    assert.equal((await applyDeploymentPlan(plan, state)).success, true);
    await writeFile(target, 'user change');
    const second = Buffer.from('second');
    const result = await applyDeploymentPlan({
      ...plan, deploymentId: 'second',
      artifacts: [{ ...plan.artifacts[0], content: second, sourceHash: hashBuffer(second) }],
    }, state);
    assert.equal(result.success, false);
    assert.equal(result.diagnostics.some(item => item.code === 'AF012'), true);
    assert.equal(await readFile(target, 'utf8'), 'user change');
  } finally { await rm(root, { recursive: true, force: true }); }
});
