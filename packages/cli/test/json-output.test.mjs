import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(packageRoot, '..', '..');

test('validate JSON output is machine-readable', () => {
  const result = spawnSync(process.execPath, [path.join(packageRoot, 'dist', 'index.js'), '--repo', repo, 'validate', '--strict', '--target', 'vscode', '--json'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.valid, true);
  assert.deepEqual(parsed.diagnostics, []);
});

test('Codex validation JSON reports the focused roster as valid', () => {
  const result = spawnSync(process.execPath, [path.join(packageRoot, 'dist', 'index.js'), '--repo', repo, 'validate', '--strict', '--target', 'codex', '--json'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(JSON.parse(result.stdout).valid, true);
});
