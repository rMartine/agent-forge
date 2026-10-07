import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { runGraphifyCommand, runInstalledGraphifyCommand } from '../dist/graphifyCommand.js';

const require = createRequire(import.meta.url);
const indexModule = require('../dist/graphifyIndex.js');
const runtimeModule = require('../dist/graphifyRuntime.js');
const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const hash = value => createHash('sha256').update(value).digest('hex');

async function fixture(t) {
  const cache = path.join(repository, '.cache');
  await mkdir(cache, { recursive: true });
  const temporary = await mkdtemp(path.join(cache, 'graphify-command-test-'));
  const project = path.join(temporary, 'project');
  const managedRoot = path.join(temporary, 'managed');
  const runtimeId = 'a'.repeat(64);
  const runtimePath = path.join(managedRoot, 'runtimes', runtimeId);
  const pythonPath = path.join(runtimePath, 'python', 'python.exe');
  await mkdir(path.dirname(pythonPath), { recursive: true });
  await mkdir(project);
  // The synthetic receipt is used only by status and argument routing. It is
  // never executed as Python or presented as a working Graphify installation.
  const syntheticBytes = Buffer.from('synthetic receipt payload; not executable');
  await writeFile(pythonPath, syntheticBytes);
  const runtime = { schemaVersion: 1, runtimeId, managedRoot, runtimePath, pythonPath, graphifyVersion: '0.9.74', pythonVersion: '3.12.13', lockHash: 'b'.repeat(64), installedAt: '2026-10-02T00:00:00Z', files: [{ path: 'python/python.exe', sha256: hash(syntheticBytes), size: syntheticBytes.length }] };
  const bytes = Buffer.from(JSON.stringify(runtime, null, 2) + '\n');
  await writeFile(path.join(managedRoot, 'runtime.json'), bytes);
  await writeFile(path.join(runtimePath, 'runtime.json'), bytes);
  const descriptor = { schemaVersion: 1, managedRoot, runtimeId, runtimeHash: hash(bytes) };
  const descriptorPath = path.join(temporary, 'graphify-runtime.json');
  await writeFile(descriptorPath, JSON.stringify(descriptor));
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(temporary)), cache);
    assert.ok(path.basename(temporary).startsWith('graphify-command-test-'));
    await rm(temporary, { recursive: true, force: true });
  });
  return { temporary, project, managedRoot, runtime, descriptor, descriptorPath };
}

test('shared Graphify status validates a frozen runtime without creating an index', async t => {
  const f = await fixture(t);
  assert.deepEqual(await runGraphifyCommand(['status', '--project', f.project], { managedRoot: f.managedRoot }), { status: 'missing' });
  assert.deepEqual(await runInstalledGraphifyCommand(['status', '--project', f.project], f.descriptorPath), { status: 'missing' });
  assert.deepEqual(await readdir(f.project), []);
  assert.deepEqual((await readdir(f.managedRoot)).sort(), ['runtime.json', 'runtimes']);
});

test('Graphify dispatch forwards exact query, scope, budget, path and affected depth to the shared API', async t => {
  const f = await fixture(t);
  const calls = [];
  t.mock.method(indexModule, 'queryGraphify', async options => { calls.push(options); return { output: 'synthetic routing result', metadata: {} }; });
  for (const [operation, extra] of [['query', ['--budget', '1500']], ['affected', ['--depth', '3']], ['path', ['--target', 'completeOrder']], ['explain', []]]) {
    const result = await runGraphifyCommand([operation, '--project', f.project, '--text', 'createOrder', '--include', 'src/**', '--include', 'lib/**', '--exclude', '**/*.test.ts', '--timeout-ms', '4000', ...extra], { managedRoot: f.managedRoot });
    assert.equal(result.output, 'synthetic routing result');
    const options = calls.at(-1);
    assert.equal(options.operation, operation);
    assert.equal(options.text, 'createOrder');
    assert.equal(options.repositoryPath, f.project);
    assert.deepEqual(options.include, ['src/**', 'lib/**']);
    assert.deepEqual(options.exclude, ['**/*.test.ts']);
    assert.equal(options.timeoutMs, 4000);
    if (operation === 'query') assert.equal(options.budget, 1500);
    if (operation === 'affected') assert.equal(options.depth, 3);
    if (operation === 'path') assert.equal(options.target, 'completeOrder');
  }
  assert.equal(calls.length, 4);
});

test('Graphify rejects malformed and cross-command options before executing an operation', async t => {
  const f = await fixture(t);
  for (const args of [
    ['query', '--project', f.project, '--text', 'orders', '--budget', '8001'],
    ['affected', '--project', f.project, '--text', 'orders', '--depth', '0'],
    ['path', '--project', f.project, '--text', 'orders'],
    ['status', '--project', f.project, '--budget', '100'],
    ['status', '--project', f.project, '--project', f.project],
    ['status', '--project', 'relative'],
    ['status', '--project', f.project, '--managed-root', f.temporary],
  ]) await assert.rejects(runGraphifyCommand(args, { managedRoot: f.managedRoot }));
  assert.deepEqual(await readdir(f.project), []);
});

test('provisioning requires exact confirmation and installed clients cannot replace their runtime', async t => {
  const f = await fixture(t);
  const provisioning = { lockPath: path.join(f.temporary, 'lock.json'), helperDirectory: f.temporary };
  let loaded = 0;
  t.mock.method(runtimeModule, 'loadGraphifyProvisionPlan', async () => { loaded++; throw new Error('Unexpected plan read'); });
  for (const command of ['provision-apply', 'provision-rollback']) {
    await assert.rejects(runGraphifyCommand([command, '--plan', 'c'.repeat(64), '--confirm', 'd'.repeat(64)], { managedRoot: f.managedRoot, provisioning }), /exactly match/);
    await assert.rejects(runInstalledGraphifyCommand([command, '--plan', 'c'.repeat(64), '--confirm', 'c'.repeat(64)], f.descriptorPath), /installed product client cannot provision/);
  }
  assert.equal(loaded, 0);
});

test('installed Graphify descriptor rejects changed runtime identity and byte-level receipt changes', async t => {
  const f = await fixture(t);
  await writeFile(f.descriptorPath, JSON.stringify({ ...f.descriptor, runtimeId: 'd'.repeat(64) }));
  await assert.rejects(runInstalledGraphifyCommand(['status', '--project', f.project], f.descriptorPath), /differs from this skill descriptor/);
  await writeFile(f.descriptorPath, JSON.stringify(f.descriptor));
  const receipt = path.join(f.managedRoot, 'runtime.json');
  await writeFile(receipt, (await readFile(receipt, 'utf8')) + '\n');
  await assert.rejects(runInstalledGraphifyCommand(['status', '--project', f.project], f.descriptorPath), /receipt differs/);
});

test('descriptor prepared before provisioning supports a verified runtime identity without an anticipated hash', async t => {
  const f = await fixture(t);
  const { runtimeHash: _runtimeHash, ...descriptor } = f.descriptor;
  await writeFile(f.descriptorPath, JSON.stringify(descriptor));
  assert.deepEqual(await runInstalledGraphifyCommand(['status', '--project', f.project], f.descriptorPath), { status: 'missing' });
  await writeFile(f.runtime.pythonPath, 'modified synthetic payload');
  await assert.rejects(runInstalledGraphifyCommand(['status', '--project', f.project], f.descriptorPath), /integrity check failed/);
});

test('a descriptor without a reviewed runtime reports the limitation instead of adopting an arbitrary active runtime', async t => {
  const f = await fixture(t);
  await writeFile(f.descriptorPath, JSON.stringify({ schemaVersion: 1, managedRoot: f.managedRoot, runtimeId: null }));
  await assert.rejects(runInstalledGraphifyCommand(['status', '--project', f.project], f.descriptorPath), /No reviewed Graphify runtime was installed/);
});

test('pre-cancelled Graphify commands do not load or create runtime state', async t => {
  const f = await fixture(t);
  const cancellation = new AbortController();
  cancellation.abort();
  await assert.rejects(runGraphifyCommand(['status', '--project', f.project], { managedRoot: path.join(f.temporary, 'absent'), signal: cancellation.signal }), /cancelled/);
  await assert.rejects(readdir(path.join(f.temporary, 'absent')), { code: 'ENOENT' });
});

test('portable Graphify client runs from copied modules without an Agent Forge repository or global CLI', async t => {
  const f = await fixture(t);
  const scripts = path.join(f.temporary, 'installed-skill', 'scripts');
  await mkdir(path.join(scripts, 'graphify'), { recursive: true });
  const modules = ['graphifyCommand', 'graphifyRuntime', 'graphifyIndex', 'graphifyFiles', 'graphifyProcess'];
  for (const name of modules) await copyFile(path.join(repository, 'packages', 'core', 'dist', `${name}.js`), path.join(scripts, 'graphify', `${name}.js`));
  const client = path.join(scripts, 'graphify-client.cjs');
  await copyFile(path.join(repository, 'hooks', 'codex', 'graphify-client.cjs'), client);
  await copyFile(f.descriptorPath, path.join(scripts, 'graphify-runtime.json'));
  const result = spawnSync(process.execPath, [client, 'status', '--project', f.project], { cwd: f.project, env: { SystemRoot: process.env.SystemRoot, PATH: '', NODE_PATH: '' }, windowsHide: true, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { status: 'missing' });
  assert.deepEqual(await readdir(f.project), []);
});
