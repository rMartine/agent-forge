import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { applyDeploymentPlan, rollbackDeployment } from '../dist/transaction.js';
import { hashBuffer } from '../dist/hash.js';
import { loadDeploymentState } from '../dist/state.js';

test('rolling back a release retains unchanged files owned by its previous deployment', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'agent-forge-unchanged-rollback-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const statePath = path.join(root, 'state', 'state.json');
  const content = Buffer.from('same bytes across releases');
  const base = { repoPath: root, createdAt: new Date().toISOString(), targets: ['codex', 'vscode'], diagnostics: [], cleanupActions: [], artifacts: ['codex', 'vscode'].map(runtime => ({ runtime, id: runtime + '-unchanged', type: 'agent', sourcePath: 'source', targetPath: path.join(root, runtime, 'unchanged.agent'), content, sourceHash: hashBuffer(content) })) };
  assert.equal((await applyDeploymentPlan({ ...base, deploymentId: 'release-one' }, statePath)).success, true);
  const second = await applyDeploymentPlan({ ...base, deploymentId: 'release-two' }, statePath);
  assert.equal(second.success, true);
  assert.equal(second.skipped, 2);
  for (const runtime of base.targets) {
    assert.equal((await rollbackDeployment(statePath, runtime)).success, true);
    assert.deepEqual(await readFile(base.artifacts.find(item => item.runtime === runtime).targetPath), content);
    assert.equal((await loadDeploymentState(statePath)).activeDeployments[runtime], 'release-one');
  }
  for (const runtime of base.targets) {
    assert.equal((await rollbackDeployment(statePath, runtime)).success, true);
    await assert.rejects(readFile(base.artifacts.find(item => item.runtime === runtime).targetPath), /ENOENT/);
  }
});
