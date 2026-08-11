import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { applyDeploymentPlan, hashBuffer, loadDeploymentState } from '../dist/index.js';

test('deployment ledger records the complete rendered hash', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'agent-forge-status-'));
  try {
    const target = path.join(root, 'profile', 'item.md');
    const statePath = path.join(root, 'state.json');
    const content = Buffer.from('managed');
    await applyDeploymentPlan({ deploymentId: 'status-id', repoPath: root, createdAt: new Date().toISOString(), diagnostics: [], artifacts: [
      { id: 'item', type: 'instruction', sourcePath: 'source', targetPath: target, content, sourceHash: hashBuffer(content) },
    ] }, statePath);
    const state = await loadDeploymentState(statePath);
    assert.equal(state.activeDeploymentId, 'status-id');
    assert.equal(state.deployments[0].artifacts[0].deployedHash, hashBuffer(content));
    await writeFile(target, 'user change');
    assert.equal(await readFile(target, 'utf8'), 'user change');
  } finally { await rm(root, { recursive: true, force: true }); }
});
