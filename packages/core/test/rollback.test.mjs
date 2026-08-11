import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { applyDeploymentPlan, hashBuffer, rollbackDeployment } from '../dist/index.js';

test('rollback restores the unmanaged baseline that was backed up', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'agent-forge-rollback-'));
  try {
    const target = path.join(root, 'profile', 'agent.md');
    const state = path.join(root, 'state.json');
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, 'baseline', { flag: 'wx' });
    const managed = Buffer.from('managed');
    const plan = { deploymentId: 'rollback-id', repoPath: root, createdAt: new Date().toISOString(), diagnostics: [], artifacts: [
      { id: 'agent', type: 'agent', sourcePath: 'source', targetPath: target, content: managed, sourceHash: hashBuffer(managed) },
    ] };
    // Mark the pre-existing file as managed by an earlier ledger so the collision gate is not bypassed in production.
    const seeded = { schemaVersion: 1, activeDeploymentId: 'seed', deployments: [{ id: 'seed', createdAt: plan.createdAt, repoPath: root, artifacts: [
      { id: 'agent', type: 'agent', targetPath: target, deployedHash: hashBuffer(Buffer.from('baseline')), existedBefore: false },
    ] }] };
    await writeFile(state, JSON.stringify(seeded));
    await applyDeploymentPlan(plan, state);
    const result = await rollbackDeployment(state, 'rollback-id');
    assert.equal(result.success, true);
    assert.equal(await readFile(target, 'utf8'), 'baseline');
  } finally { await rm(root, { recursive: true, force: true }); }
});
