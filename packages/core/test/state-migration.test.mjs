import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { loadDeploymentState, saveDeploymentState } from '../dist/index.js';

test('v1 Copilot-only state migrates to v2 with a ledger backup', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'agent-forge-state-'));
  try {
    const statePath = path.join(root, '.agent-forge', 'state.json');
    const targetPath = path.join(root, '.copilot', 'agents', 'worker.agent.md');
    await mkdir(path.dirname(statePath), { recursive: true });
    await writeFile(statePath, JSON.stringify({
      schemaVersion: 1,
      activeDeploymentId: 'old',
      deployments: [{ id: 'old', createdAt: '2026-01-01T00:00:00Z', repoPath: root, artifacts: [
        { id: 'worker', type: 'agent', targetPath, deployedHash: 'hash', existedBefore: false },
      ] }],
    }));
    const state = await loadDeploymentState(statePath);
    assert.equal(state.schemaVersion, 2);
    assert.equal(state.activeDeployments.vscode, 'old');
    assert.equal(state.deployments[0].runtime, 'vscode');
    await saveDeploymentState(statePath, state);
    await access(path.join(root, '.agent-forge', 'state.v1.backup.json'));
    assert.equal(JSON.parse(await readFile(statePath, 'utf8')).schemaVersion, 2);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('v1 state with a non-Copilot owned path fails migration', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'agent-forge-state-invalid-'));
  try {
    const statePath = path.join(root, 'state.json');
    await writeFile(statePath, JSON.stringify({
      schemaVersion: 1,
      deployments: [{ id: 'old', createdAt: '2026-01-01T00:00:00Z', repoPath: root, artifacts: [
        { id: 'worker', type: 'agent', targetPath: path.join(root, '.codex', 'agents', 'worker.toml'), deployedHash: 'hash', existedBefore: false },
      ] }],
    }));
    await assert.rejects(loadDeploymentState(statePath), /AF012/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
