import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'jsonc-parser';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const cli = path.join(repository, 'packages', 'cli', 'dist', 'index.js');
const hash = value => createHash('sha256').update(value).digest('hex');

async function fixture(t) {
  const cache = path.join(repository, '.cache');
  await mkdir(cache, { recursive: true });
  const temporary = await mkdtemp(path.join(cache, 'graphify-cli-test-'));
  const managedRoot = path.join(temporary, 'managed');
  const project = path.join(temporary, 'project');
  const repo = path.join(temporary, 'configuration');
  const runtimeId = 'a'.repeat(64);
  const runtimePath = path.join(managedRoot, 'runtimes', runtimeId);
  const pythonPath = path.join(runtimePath, 'python', 'python.exe');
  await mkdir(path.dirname(pythonPath), { recursive: true });
  await mkdir(repo); await mkdir(project);
  const bytes = Buffer.from('synthetic non-executable runtime for CLI status');
  await writeFile(pythonPath, bytes);
  const runtime = { schemaVersion: 1, runtimeId, managedRoot, runtimePath, pythonPath, graphifyVersion: '0.9.74', pythonVersion: '3.12.13', lockHash: 'b'.repeat(64), installedAt: '2026-10-02T00:00:00Z', files: [{ path: 'python/python.exe', sha256: hash(bytes), size: bytes.length }] };
  await writeFile(path.join(managedRoot, 'runtime.json'), JSON.stringify(runtime));
  await writeFile(path.join(runtimePath, 'runtime.json'), JSON.stringify(runtime));
  const manifest = parse(await readFile(path.join(repository, 'agent-forge.manifest.jsonc'), 'utf8'));
  manifest.codex.graphify.managedRoot = managedRoot;
  await writeFile(path.join(repo, 'agent-forge.manifest.jsonc'), JSON.stringify(manifest));
  const run = args => spawnSync(process.execPath, [cli, '--repo', repo, 'graphify', ...args], { windowsHide: true, encoding: 'utf8' });
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(temporary)), cache);
    assert.ok(path.basename(temporary).startsWith('graphify-cli-test-'));
    await rm(temporary, { recursive: true, force: true });
  });
  return { project, managedRoot, run };
}

test('Graphify CLI registers commands and emits JSON from the shared project status implementation', async t => {
  const f = await fixture(t);
  const help = f.run(['--help']);
  assert.equal(help.status, 0, help.stderr);
  for (const command of ['provision-preview', 'provision-apply', 'provision-rollback', 'index', 'status', 'query', 'affected', 'path', 'explain']) assert.ok(help.stdout.includes(command));
  const status = f.run(['status', '--project', f.project, '--include', 'src/**', '--exclude', '**/*.test.ts', '--json']);
  assert.equal(status.status, 0, status.stderr);
  assert.deepEqual(JSON.parse(status.stdout), { status: 'missing' });
  assert.deepEqual(await readdir(f.project), []);
});

test('Graphify CLI rejects wrong provisioning confirmation before changing runtime state', async t => {
  const f = await fixture(t);
  for (const command of ['provision-apply', 'provision-rollback']) {
    const result = f.run([command, '--plan', 'c'.repeat(64), '--confirm', 'd'.repeat(64)]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /confirmation must exactly match/);
  }
  assert.deepEqual((await readdir(f.managedRoot)).sort(), ['runtime.json', 'runtimes']);
});

test('Graphify CLI requires query arguments and bounded operation options', async t => {
  const f = await fixture(t);
  const missingTarget = f.run(['path', '--project', f.project, '--text', 'origin']);
  assert.equal(missingTarget.status, 1);
  assert.match(missingTarget.stderr, /required option.*target/);
  const invalidBudget = f.run(['query', '--project', f.project, '--text', 'orders', '--budget', '9000']);
  assert.equal(invalidBudget.status, 1);
  assert.match(invalidBudget.stderr, /integer from 1 to 8000/);
});
