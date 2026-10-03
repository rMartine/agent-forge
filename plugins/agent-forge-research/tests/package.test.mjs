import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { inspectPackage, preparePackage, sourceRoot, verifyPackage } from '../../../scripts/research-plugin.mjs';

test('the plugin has twenty actual specialist role files and the approved models', async () => {
  const inventory = await inspectPackage();
  assert.equal(inventory.specialists, 20);
  const roster = JSON.parse(await readFile(path.join(sourceRoot, 'research-roster.json'), 'utf8'));
  const models = new Map();
  for (const role of roster.specialists) {
    const key = `${role.model}/${role.reasoning}`;
    models.set(key, (models.get(key) || 0) + 1);
    assert.ok((await readFile(path.join(sourceRoot, role.roleFile), 'utf8')).length > 200);
  }
  assert.deepEqual(Object.fromEntries(models), { 'gpt-6.1-sol/high': 3, 'gpt-6-astra/high': 15, 'gpt-6.1-sol/medium': 1, 'gpt-6-astra/medium': 1 });
  assert.equal(roster.specialists.filter(a => a.readOnly).length, 1);
});

test('prepared plugin is self-contained, immutable and detects altered content', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'agent-forge-research-package-'));
  try {
    const result = await preparePackage(directory);
    assert.equal(result.writesToVsCode, false);
    assert.equal(result.writesToStandaloneAgents, false);
    const verified = await verifyPackage(result.pluginDirectory);
    assert.equal(verified.packageHash, result.packageHash);
    assert.ok(verified.files.every(item => !item.path.startsWith('.codex/agents/') && !item.path.startsWith('.copilot/')));
    const marketplace = JSON.parse(await readFile(path.join(directory, '.agents', 'plugins', 'marketplace.json')));
    assert.equal(marketplace.plugins.length, 1);
    await assert.rejects(preparePackage(directory), /empty/);
    await writeFile(path.join(result.pluginDirectory, 'scripts', 'research_policy.py'), '# changed by test');
    await assert.rejects(verifyPackage(result.pluginDirectory), /differs/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('the launcher refuses an added program that was never reviewed', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'agent-forge-research-launcher-'));
  try {
    const result = await preparePackage(path.join(directory, 'marketplace'), sourceRoot, { pythonExecutable: process.execPath, sessionDataRoot: path.join(directory, 'records') });
    const authorization = path.join(directory, 'authorization.json');
    await writeFile(authorization, JSON.stringify({ version: 1, authorizationReference: 'Controlled launcher test', purpose: 'Reject unreviewed code' }));
    await writeFile(path.join(result.pluginDirectory, 'scripts', 'unreviewed.py'), 'raise RuntimeError("This program must never start")');
    const launched = spawnSync(process.execPath, [path.join(result.pluginDirectory, 'scripts', 'run-research-python.mjs'), '--authorization', authorization, '--script', 'scripts/unreviewed.py', '--'], { encoding: 'utf8', windowsHide: true, shell: false });
    assert.equal(launched.status, 1);
    assert.match(launched.stderr, /must be included in the reviewed inventory/);
    assert.doesNotMatch(launched.stderr, /This program must never start/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
