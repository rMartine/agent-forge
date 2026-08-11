import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
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
