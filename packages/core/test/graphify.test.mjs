import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile, rm, symlink, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectGraphifyFiles, graphifyProjectDirectory, getGraphifyStatus, createGraphifyProvisionPlan, saveGraphifyProvisionPlan, loadGraphifyProvisionPlan, applyGraphifyProvisionPlan, restoreGraphifyRuntime, loadGraphifyRuntime, verifyGraphifyProvisionPlan, verifyGraphifyRuntime } from '../dist/graphify.js';
import { graphifyEnvironment, runGraphifyProcess } from '../dist/graphifyProcess.js';
import { assertGraphifyPlainPath, withGraphifyLock, writeGraphifyFile, listGraphifyFiles } from '../dist/graphifyFiles.js';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const cache = path.join(repository, '.cache');
const hash = value => createHash('sha256').update(value).digest('hex');
async function fixture(t) {
  await mkdir(cache, { recursive: true });
  const directory = await mkdtemp(path.join(cache, 'graphify-unit-'));
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(directory)), cache);
    assert.ok(path.basename(directory).startsWith('graphify-unit-'));
    await rm(directory, { recursive: true, force: true });
  });
  return directory;
}
async function file(root, relative, content) { await mkdir(path.dirname(path.join(root, relative)), { recursive: true }); await writeFile(path.join(root, relative), content); }
async function syntheticPlan(root) {
  const lock = JSON.parse(await readFile(path.join(repository, 'config/graphify-windows-x64-python312.lock.json'), 'utf8'));
  const payload = name => ({ path: name, sha256: hash(name), size: Buffer.byteLength(name) });
  const body = { schemaVersion: 1, createdAt: '2026-10-02T00:00:00Z', managedRoot: root, lock, lockHash: hash(JSON.stringify(lock)), python: { sourceDirectory: root, executable: 'python.exe', version: '3.12.13', files: [payload('python.exe')] }, helpers: [payload('run_local.py'), payload('install_wheels.py')], previousRuntimeBase64: null };
  return { ...body, planId: hash(JSON.stringify(body)) };
}

test('Graphify subprocess environment omits inherited providers, Python paths and auto-install settings', () => {
  const environment = graphifyEnvironment(path.join(cache, 'private-home'));
  assert.equal(environment.GRAPHIFY_NO_AUTO_REFRESH, '1');
  assert.equal(environment.GRAPHIFY_GOOGLE_WORKSPACE, '0');
  assert.equal(environment.GRAPHIFY_QUERY_LOG_DISABLE, '1');
  for (const key of ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'PYTHONPATH', 'PYTHONHOME', 'GRAPHIFY_FORCE', 'GRAPHIFY_QUERY_LOG', 'PATH']) assert.equal(environment[key], undefined);
});

test('Graphify selects code with explicit exclusions and rejects known secret content', async t => {
  const root = await fixture(t);
  await file(root, 'src/app.ts', 'export const answer = 42;');
  await file(root, 'src/skip.ts', 'export const skipped = true;');
  await file(root, 'docs/private.md', 'Not code');
  await file(root, '.env', 'EXAMPLE=placeholder');
  await file(root, 'secrets/config.py', 'value = 42');
  await file(root, 'src/embedded.py', 'api_key = "synthetic-placeholder-for-test"');
  await file(root, 'node_modules/pkg/index.js', 'module.exports = 1;');
  const selection = await selectGraphifyFiles(root, { include: ['src/**'], exclude: ['**/skip.ts'] });
  assert.deepEqual(selection.files.map(item => item.path), ['src/app.ts']);
  assert.ok(selection.excluded.some(item => item.path === 'src/embedded.py'));
  assert.ok(!JSON.stringify(selection).includes('synthetic-placeholder-for-test'));
});

test('Graphify freshness hash observes changed bytes and scopes; project paths distinguish worktrees', async t => {
  const root = await fixture(t);
  await file(root, 'a/code.py', 'x = 1'); await file(root, 'b/code.py', 'x = 1');
  const first = await selectGraphifyFiles(path.join(root, 'a'));
  await file(root, 'a/code.py', 'x = 2');
  const second = await selectGraphifyFiles(path.join(root, 'a'));
  assert.notEqual(first.contentHash, second.contentHash);
  assert.notEqual(second.scopeHash, (await selectGraphifyFiles(path.join(root, 'a'), { include: ['*.py'] })).scopeHash);
  const a = await graphifyProjectDirectory(root, path.join(root, 'a'));
  const b = await graphifyProjectDirectory(root, path.join(root, 'b'));
  assert.notEqual(a.projectId, b.projectId);
});

test('Graphify honors repository Git ignore rules for untracked files', async t => {
  const root = await fixture(t);
  execFileSync('git', ['init', '--quiet', root], { windowsHide: true });
  await file(root, '.gitignore', 'ignored.py\n');
  await file(root, 'ignored.py', 'secretish = 1'); await file(root, 'main.py', 'public = 1');
  const selection = await selectGraphifyFiles(root);
  assert.deepEqual(selection.files.map(item => item.path), ['main.py']);
  assert.ok(selection.excluded.some(item => item.reason === 'Excluded by Git ignore rules'));
});

test('Graphify fails when Git metadata exists but Git cannot run, preserving ignore-rule enforcement', async t => {
  const root = await fixture(t);
  await mkdir(path.join(root, '.git'));
  await file(root, 'main.py', 'value = 1');
  const prior = process.env.PATH;
  process.env.PATH = path.join(root, 'missing-executables');
  try { await assert.rejects(selectGraphifyFiles(root), /ENOENT/); }
  finally { process.env.PATH = prior; }
});

test('Graphify rejects traversal globs, source junctions and output junctions', async t => {
  const root = await fixture(t); const outside = await fixture(t);
  await file(root, 'app.py', 'value = 1'); await file(outside, 'sentinel.py', 'value = 7');
  await assert.rejects(selectGraphifyFiles(root, { exclude: ['../*'] }), /relative/);
  await symlink(outside, path.join(root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(selectGraphifyFiles(root), /symbolic link|reparse point/);
  await assert.rejects(writeGraphifyFile(path.join(root, 'linked', 'sentinel.py'), 'changed'), /symbolic link|reparse point/);
  assert.equal(await readFile(path.join(outside, 'sentinel.py'), 'utf8'), 'value = 7');
});

test('Graphify operation lock rejects concurrent writers and releases after failure', async t => {
  const root = await fixture(t); const lock = path.join(root, 'operation.lock');
  await withGraphifyLock(lock, async () => { await assert.rejects(withGraphifyLock(lock, async () => true), /busy/); });
  await assert.rejects(withGraphifyLock(lock, async () => { throw new Error('deliberate failure'); }), /deliberate/);
  assert.equal(await withGraphifyLock(lock, async () => 'released'), 'released');
});

test('Graphify process runner respects cancellation, time and bounded output', async t => {
  const root = await fixture(t); const env = graphifyEnvironment(root);
  await assert.rejects(runGraphifyProcess(process.execPath, ['-e', 'setTimeout(()=>{},10000)'], { cwd: root, env, timeoutMs: 40 }), /time limit/);
  const cancellation = new AbortController(); cancellation.abort();
  await assert.rejects(runGraphifyProcess(process.execPath, ['-e', '0'], { cwd: root, env, signal: cancellation.signal }), /cancelled/);
  await assert.rejects(runGraphifyProcess(process.execPath, ['-e', 'process.stdout.write("x".repeat(1000))'], { cwd: root, env, maxOutputBytes: 10 }), /output exceeded/);
});

test('Graphify saved plan rejects tampering, changed baseline and missing frozen bytes before installation', async t => {
  const root = await fixture(t); const plan = await syntheticPlan(root);
  await saveGraphifyProvisionPlan(plan);
  assert.equal((await loadGraphifyProvisionPlan(root, plan.planId)).planId, plan.planId);
  await assert.rejects(saveGraphifyProvisionPlan({ ...plan, python: { ...plan.python, version: '3.13.0' } }), /integrity/);
  await assert.rejects(applyGraphifyProvisionPlan(plan), /ENOENT/);
  await file(root, 'runtime.json', '{}');
  await assert.rejects(applyGraphifyProvisionPlan(plan), /changed after preview/);
  await assert.rejects(stat(path.join(root, 'runtimes', plan.planId)), { code: 'ENOENT' });
});

test('Graphify restore removes only its active pointer and preserves immutable resources', async t => {
  const root = await fixture(t); const plan = await syntheticPlan(root);
  await saveGraphifyProvisionPlan(plan);
  const runtimePath = path.join(root, 'runtimes', plan.planId);
  const bytes = Buffer.from('synthetic interpreter; never executed');
  await file(runtimePath, 'python/python.exe', bytes);
  const runtime = { schemaVersion: 1, runtimeId: plan.planId, managedRoot: root, runtimePath, pythonPath: path.join(runtimePath, 'python/python.exe'), graphifyVersion: '0.9.74', pythonVersion: '3.12.13', lockHash: plan.lockHash, installedAt: plan.createdAt, files: [{ path: 'python/python.exe', size: bytes.length, sha256: hash(bytes) }] };
  await file(runtimePath, 'runtime.json', JSON.stringify(runtime)); await file(root, 'runtime.json', JSON.stringify(runtime));
  await restoreGraphifyRuntime(root, plan.planId);
  await assert.rejects(loadGraphifyRuntime(root), { code: 'ENOENT' });
  assert.equal(await readFile(path.join(runtimePath, 'python/python.exe'), 'utf8'), bytes.toString());
});

test('Graphify rejects changed frozen bytes and a cancelled provision before creating a runtime', async t => {
  const root = await fixture(t); const plan = await syntheticPlan(root);
  await saveGraphifyProvisionPlan(plan);
  await file(root, `blobs/${plan.python.files[0].sha256}`, 'changed content');
  await assert.rejects(verifyGraphifyProvisionPlan(plan), /integrity/);
  await assert.rejects(applyGraphifyProvisionPlan(plan), /integrity/);
  const cancellation = new AbortController(); cancellation.abort(new Error('Requested cancellation'));
  await assert.rejects(createGraphifyProvisionPlan({ managedRoot: root, pythonPath: 'unused', lockPath: 'unused', signal: cancellation.signal }), /Requested cancellation/);
  await assert.rejects(applyGraphifyProvisionPlan(plan, { signal: cancellation.signal }), /Requested cancellation/);
  await assert.rejects(verifyGraphifyRuntime({}, { signal: cancellation.signal }), /Requested cancellation/);
  await assert.rejects(selectGraphifyFiles(root, { signal: cancellation.signal }), /Requested cancellation/);
  await assert.rejects(stat(path.join(root, 'runtimes', plan.planId)), { code: 'ENOENT' });
  const duringScan = new AbortController();
  await assert.rejects(listGraphifyFiles(root, () => { duringScan.abort(new Error('Cancel inventory')); return false; }, duringScan.signal), /Cancel inventory/);
});

test('Graphify status without an index is missing without invoking Python', async t => {
  const root = await fixture(t); await file(root, 'repo/main.py', 'value = 1');
  assert.deepEqual(await getGraphifyStatus({ runtime: { managedRoot: path.join(root, 'managed') }, repositoryPath: path.join(root, 'repo') }), { status: 'missing' });
});
