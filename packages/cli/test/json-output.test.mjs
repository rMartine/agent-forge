import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(packageRoot, '..', '..');
const isolatedEnv = async t => {
  const profile = await mkdtemp(path.join(os.tmpdir(), 'agent-forge-cli-validate-'));
  t.after(() => rm(profile, { recursive: true, force: true }));
  return { ...process.env, USERPROFILE: profile, HOME: profile, CODEX_HOME: path.join(profile, '.codex') };
};

test('validate JSON output is machine-readable', async t => {
  const result = spawnSync(process.execPath, [path.join(packageRoot, 'dist', 'index.js'), '--repo', repo, 'validate', '--strict', '--target', 'vscode', '--json'], { encoding: 'utf8', env: await isolatedEnv(t) });
  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.valid, true);
  assert.ok(Array.isArray(parsed.diagnostics));
  assert.ok(parsed.diagnostics.every(item => item.severity === 'warning' && item.code === 'AF011'));
});

test('Codex validation JSON reports the focused roster as valid', async t => {
  const result = spawnSync(process.execPath, [path.join(packageRoot, 'dist', 'index.js'), '--repo', repo, 'validate', '--strict', '--target', 'codex', '--json'], { encoding: 'utf8', env: await isolatedEnv(t) });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(JSON.parse(result.stdout).valid, true);
});
