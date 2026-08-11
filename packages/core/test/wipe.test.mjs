import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { applyDeploymentPlan, hashBuffer, removeManagedDeployment } from '../dist/index.js';

test('wipe preserves a user-modified managed file', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'agent-forge-wipe-'));
  try {
    const target = path.join(root, 'profile', 'agent.md');
    const state = path.join(root, 'state.json');
    const content = Buffer.from('managed');
    await applyDeploymentPlan({ deploymentId: 'wipe-id', repoPath: root, createdAt: new Date().toISOString(), diagnostics: [], artifacts: [
      { id: 'agent', type: 'agent', sourcePath: 'source', targetPath: target, content, sourceHash: hashBuffer(content) },
    ] }, state);
    await writeFile(target, 'user-owned change');
    const result = await removeManagedDeployment(state);
    assert.equal(result.skipped, 1);
    assert.equal(await readFile(target, 'utf8'), 'user-owned change');
  } finally { await rm(root, { recursive: true, force: true }); }
});
