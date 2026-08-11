import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

test('validate command accepts the repository roster', () => {
  const cli = path.resolve('dist/index.js');
  const repo = path.resolve('../..');
  const result = spawnSync(process.execPath, [cli, '--repo', repo, 'validate', '--json'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(JSON.parse(result.stdout).valid, true);
});
