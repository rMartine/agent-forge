import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadManifest, validateManifest } from '../dist/index.js';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

test('manifest v3 validates the dual-runtime user deployment contract', async () => {
  const manifest = await loadManifest(repo);
  assert.equal(manifest.schemaVersion, 3);
  assert.deepEqual(manifest.platforms, ['vscode', 'codex']);
  assert.equal(Object.keys(manifest.agents).length, 24);
  assert.equal(Object.keys(manifest.codex.agents).length, 16);
  assert.equal(Object.keys(manifest.codex.skillBundles).length, 5);
  assert.match(manifest.targets.vscode.agents, /\.copilot\/agents$/);
  assert.match(manifest.targets.codex.agents, /\.codex\/agents$/);
});

test('manifest v2 is rejected rather than silently deployed', () => {
  assert.throws(() => validateManifest({ schemaVersion: 2, platform: 'vscode' }), /schemaVersion must be 3/);
});

test('manifest rejects broken Codex source references', async () => {
  const manifest = structuredClone(await loadManifest(repo));
  manifest.codex.agents['backend-developer'].sourceAgent = 'missing';
  assert.throws(() => validateManifest(manifest), /sourceAgent is unknown/);
});
