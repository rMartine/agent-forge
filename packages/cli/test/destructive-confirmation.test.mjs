import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('wipe requires managed-only and exact deployment-id confirmation options', () => {
  const result = spawnSync(process.execPath, [path.join(packageRoot, 'dist', 'index.js'), 'wipe'], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /managed-only/);
});

test('global auto-confirm option is absent', () => {
  const result = spawnSync(process.execPath, [path.join(packageRoot, 'dist', 'index.js'), '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.doesNotMatch(result.stdout, /--yes|-y,/);
});

test('deploy requires an immutable plan and exact confirmation', () => {
  const cli = path.join(packageRoot, 'dist', 'index.js');
  const missing = spawnSync(process.execPath, [cli, 'deploy'], { encoding: 'utf8' });
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /plan/);
  const mismatch = spawnSync(process.execPath, [cli, 'deploy', '--plan', 'one', '--confirm', 'two'], { encoding: 'utf8' });
  assert.notEqual(mismatch.status, 0);
  assert.match(mismatch.stderr, /exactly match/);
});

test('cleanup requires managed-only acknowledgement', () => {
  const result = spawnSync(process.execPath, [path.join(packageRoot, 'dist', 'index.js'), 'cleanup'], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /managed-only/);
});
