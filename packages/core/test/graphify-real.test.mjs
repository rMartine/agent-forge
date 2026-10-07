import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGraphifyRuntime, verifyGraphifyRuntime, buildGraphifyIndex, queryGraphify, getGraphifyStatus } from '../dist/graphify.js';
import { graphifyEnvironment, runGraphifyProcess } from '../dist/graphifyProcess.js';

const runtimeRoot = process.env.AGENT_FORGE_GRAPHIFY_REAL_RUNTIME;
test('real Windows Graphify: private pinned runtime, structural queries, freshness, generations and failure preservation', { skip: !runtimeRoot }, async t => {
  const runtime = await loadGraphifyRuntime(runtimeRoot);
  const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  const cache = path.join(repository, '.cache'); await mkdir(cache, { recursive: true });
  const source = await mkdtemp(path.join(cache, 'graphify-real-source-'));
  t.after(async () => { assert.equal(path.dirname(path.resolve(source)), cache); await rm(source, { recursive: true, force: true }); });
  await writeFile(path.join(source, 'maths.py'), 'def double(value):\n    return value * 2\n');
  await writeFile(path.join(source, 'main.py'), 'from maths import double\n\ndef calculate(value):\n    return double(value)\n');
  await writeFile(path.join(source, '.env'), 'SYNTHETIC=not-indexed\n');
  await writeFile(path.join(source, 'notes.md'), 'Document intentionally outside local code scope');
  const options = { runtime, repositoryPath: source };
  assert.equal((await getGraphifyStatus(options)).status, 'missing');
  const first = await buildGraphifyIndex(options);
  assert.equal(first.fileCount, 2); assert.ok(first.nodeCount > 0);
  assert.equal((await getGraphifyStatus(options)).status, 'fresh');
  assert.equal((await buildGraphifyIndex(options)).generationId, first.generationId);
  const queries = [
    { operation: 'query', text: 'double' },
    { operation: 'explain', text: 'double' },
    { operation: 'affected', text: 'double' },
    { operation: 'path', text: 'calculate', target: 'double' },
  ];
  for (const query of queries) {
    const result = await queryGraphify({ ...options, ...query });
    assert.match(result.output, /double|calculate/i);
    assert.ok(!result.output.includes('SYNTHETIC'));
  }
  const snapshot = JSON.parse(await readFile(path.join(path.dirname(path.dirname(first.graphPath)), 'selection.json'), 'utf8'));
  assert.deepEqual(snapshot.files.map(file => file.path), ['main.py', 'maths.py']);
  await writeFile(path.join(source, 'maths.py'), 'def triple(value):\n    return value * 3\n');
  assert.equal((await getGraphifyStatus(options)).status, 'stale');
  await assert.rejects(queryGraphify({ ...options, operation: 'query', text: 'double' }), /stale/);
  await assert.rejects(buildGraphifyIndex({ ...options, timeoutMs: 1 }), /time limit/);
  assert.equal((await getGraphifyStatus(options)).metadata.generationId, first.generationId);
  const second = await buildGraphifyIndex(options);
  assert.notEqual(second.generationId, first.generationId);
  const forced = await buildGraphifyIndex({ ...options, rebuild: true });
  assert.notEqual(forced.generationId, second.generationId);
  assert.equal(forced.contentHash, second.contentHash);
  assert.equal((await getGraphifyStatus(options)).status, 'fresh');
  await verifyGraphifyRuntime(runtime);
});

test('real private Python rejects audited network, subprocesses and access outside its selected data', { skip: !runtimeRoot }, async t => {
  const runtime = await loadGraphifyRuntime(runtimeRoot);
  const data = await mkdtemp(path.join(runtime.managedRoot, 'guard-test-'));
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(data)), path.resolve(runtime.managedRoot));
    await rm(data, { recursive: true, force: true });
  });
  await mkdir(path.join(data, 'tmp'));
  const script = `import json,runpy,socket,subprocess,sys
guard = runpy.run_path(${JSON.stringify(path.join(runtime.runtimePath, 'helpers/run_local.py'))})
blocked = []
def exercise(*args, **kwargs):
    checks = [
        ('network', lambda: socket.create_connection(('127.0.0.1', 1))),
        ('subprocess', lambda: subprocess.run([sys.executable, '-c', '0'])),
        ('outside-file', lambda: open(${JSON.stringify(path.join(runtime.managedRoot, 'runtime.json'))}, 'rb')),
    ]
    for name, action in checks:
        try:
            action()
        except PermissionError:
            blocked.append(name)
        else:
            raise AssertionError(name + ' was not blocked')
    print(json.dumps(blocked))
runpy.run_module = exercise
sys.argv = ['guard', ${JSON.stringify(runtime.runtimePath)}, ${JSON.stringify(data)}, 'query', 'synthetic']
guard['main']()
`;
  const result = await runGraphifyProcess(runtime.pythonPath, ['-I', '-B', '-c', script], { cwd: data, env: graphifyEnvironment(data) });
  assert.deepEqual(JSON.parse(result.stdout), ['network', 'subprocess', 'outside-file']);
});
