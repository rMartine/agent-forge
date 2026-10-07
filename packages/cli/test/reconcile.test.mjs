import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { hashBuffer, loadManifest } from '@agent-forge/core';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repository = path.resolve(packageRoot, '../..');
const executable = path.join(packageRoot, 'dist/index.js');

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'agent-forge-cli-reconcile-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const statePath = path.join(root, '.agent-forge', 'state.json');
  const targetPath = path.join(root, '.codex', 'agents', 'worker.toml');
  const missingPath = path.join(root, '.agents', 'skills', 'example', 'SKILL.md');
  await mkdir(path.dirname(statePath), { recursive: true });
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, 'current private customization');
  const originalState = Buffer.from(JSON.stringify({ schemaVersion: 2, activeDeployments: { codex: 'previous' }, deployments: [{
    id: 'previous', runtime: 'codex', createdAt: '2026-08-23', repoPath: root,
    artifacts: [
      { id: 'worker', type: 'agent', runtime: 'codex', targetPath, deployedHash: hashBuffer(Buffer.from('earlier agent')), existedBefore: false },
      { id: 'skill', type: 'skill', runtime: 'codex', targetPath: missingPath, deployedHash: hashBuffer(Buffer.from('earlier skill')), existedBefore: false },
    ],
  }] }));
  await writeFile(statePath, originalState);
  const manifest = structuredClone(await loadManifest(repository));
  manifest.targets.state = statePath;
  await writeFile(path.join(root, 'agent-forge.manifest.jsonc'), JSON.stringify(manifest));
  const run = (...args) => spawnSync(process.execPath, [executable, '--repo', root, 'reconcile', ...args], {
    encoding: 'utf8', env: { ...process.env, USERPROFILE: root, HOME: root, CODEX_HOME: path.join(root, '.codex') }, windowsHide: true,
  });
  return { root, statePath, targetPath, missingPath, originalState, run };
}

function preview(f) {
  const result = f.run('preview', '--target', 'codex', '--json');
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

test('reconcile preview reports changed paths, absences, hashes and backup location without printing snapshot bytes', async t => {
  const f = await fixture(t);
  const result = preview(f);
  assert.deepEqual(result.summary, { modified: 1, missing: 1, unchanged: 0 });
  assert.match(result.planHash, /^[a-f0-9]{64}$/);
  assert.equal(result.previousStateHash, hashBuffer(f.originalState));
  assert.equal(result.files[0].observedHash, hashBuffer(Buffer.from('current private customization')));
  assert.equal(result.files[1].observedHash, null);
  assert.equal(path.dirname(result.planPath), result.backupDirectory);
  const output = JSON.stringify(result);
  assert.doesNotMatch(output, /contentBase64|previousStateBase64|current private customization/);
  assert.deepEqual(await readFile(f.statePath), f.originalState);
  await assert.rejects(readFile(result.previousStateBackupPath), /ENOENT/);
  assert.equal(JSON.parse(await readFile(result.planPath, 'utf8')).files.length, 2);
});

test('reconcile apply and restore use the saved plan and preserve current installed files', async t => {
  const f = await fixture(t);
  const plan = preview(f);
  const applied = f.run('apply', '--target', 'codex', '--plan', plan.planId, '--confirm', plan.planId, '--json');
  assert.equal(applied.status, 0, applied.stderr || applied.stdout);
  const result = JSON.parse(applied.stdout);
  assert.equal(result.success, true);
  assert.equal(result.baselineDeploymentId, plan.planId);
  assert.deepEqual(await readFile(result.previousStateBackupPath), f.originalState);
  const installed = JSON.parse(await readFile(f.statePath, 'utf8'));
  assert.equal(installed.activeDeployments.codex, plan.planId);
  assert.equal(installed.deployments.at(-1).artifacts.length, 1);
  assert.equal(await readFile(f.targetPath, 'utf8'), 'current private customization');
  await assert.rejects(readFile(f.missingPath), /ENOENT/);
  const restored = f.run('restore', '--target', 'codex', '--plan', plan.planId, '--json');
  assert.equal(restored.status, 0, restored.stderr || restored.stdout);
  assert.equal(JSON.parse(restored.stdout).success, true);
  assert.deepEqual(await readFile(f.statePath), f.originalState);
  assert.equal(await readFile(f.targetPath, 'utf8'), 'current private customization');
});

test('reconcile rejects missing identifiers, mismatched confirmations, grouped runtimes and force options', async t => {
  const f = await fixture(t);
  for (const [args, expected] of [
    [['preview'], /target/],
    [['apply', '--target', 'codex'], /plan/],
    [['apply', '--target', 'codex', '--plan', 'one'], /confirm/],
    [['apply', '--target', 'codex', '--plan', 'one', '--confirm', 'two'], /exactly match/],
    [['restore', '--target', 'codex'], /plan/],
    [['preview', '--target', 'all'], /codex/],
    [['preview', '--target', 'codex', '--force'], /unknown option/],
  ]) {
    const result = f.run(...args);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, expected);
  }
  assert.deepEqual(await readFile(f.statePath), f.originalState);
});

test('reconcile rejects a saved plan for a different runtime without changing the ledger', async t => {
  const f = await fixture(t);
  const plan = preview(f);
  for (const action of ['apply', 'restore']) {
    const result = f.run(action, '--target', 'vscode', '--plan', plan.planId, ...(action === 'apply' ? ['--confirm', plan.planId] : []));
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /does not match --target/);
  }
  assert.deepEqual(await readFile(f.statePath), f.originalState);
});

test('reconcile apply fails with machine-readable diagnostics when a reviewed file changes', async t => {
  const f = await fixture(t);
  const plan = preview(f);
  await writeFile(f.targetPath, 'changed after preview');
  const applied = f.run('apply', '--target', 'codex', '--plan', plan.planId, '--confirm', plan.planId, '--json');
  assert.equal(applied.status, 1);
  const result = JSON.parse(applied.stdout);
  assert.equal(result.success, false);
  assert.match(result.errors[0].message, /changed after reconciliation preview/);
  assert.deepEqual(await readFile(f.statePath), f.originalState);
  assert.equal(await readFile(f.targetPath, 'utf8'), 'changed after preview');
});

test('reconcile restore refuses profile changes made after reconciliation', async t => {
  const f = await fixture(t);
  const plan = preview(f);
  assert.equal(f.run('apply', '--target', 'codex', '--plan', plan.planId, '--confirm', plan.planId).status, 0);
  const before = await readFile(f.statePath);
  await writeFile(f.targetPath, 'newer private customization');
  const result = f.run('restore', '--target', 'codex', '--plan', plan.planId, '--json');
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stdout).success, false);
  assert.deepEqual(await readFile(f.statePath), before);
  assert.equal(await readFile(f.targetPath, 'utf8'), 'newer private customization');
});
