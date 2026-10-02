import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadManifest, validateManifest } from '../dist/index.js';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

test('manifest v4 validates product development without fixing roster quantities', async () => {
  const manifest = await loadManifest(repo);
  assert.equal(manifest.schemaVersion, 4);
  assert.deepEqual(manifest.platforms, ['vscode', 'codex']);
  assert.equal(Object.keys(manifest.agents).length, 24);
  assert.ok(manifest.codex.productDevelopment);
  assert.ok(manifest.codex.externalSkillCatalog);
  assert.match(manifest.targets.vscode.agents, /\.copilot\/agents$/);
  assert.match(manifest.targets.codex.agents, /\.codex\/agents$/);
});

test('existing v3 manifests remain readable and quantities can change coherently', async () => {
  const manifest = structuredClone(await loadManifest(repo));
  manifest.schemaVersion = 3;
  delete manifest.codex.productDevelopment;
  delete manifest.codex.externalSkillCatalog;
  delete manifest.codex.agents['technical-writer'];
  assert.equal(validateManifest(manifest), manifest);
});

test('manifest v2 is rejected rather than silently deployed', () => {
  assert.throws(() => validateManifest({ schemaVersion: 2, platform: 'vscode' }), /schemaVersion must be 3/);
});

test('manifest rejects broken Codex source references', async () => {
  const manifest = structuredClone(await loadManifest(repo));
  manifest.codex.agents['backend-developer'].sourceAgent = 'missing';
  assert.throws(() => validateManifest(manifest), /sourceAgent is unknown/);
});
