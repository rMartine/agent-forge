import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadManifest, validateManifest } from '../dist/index.js';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

test('manifest v5 validates explicit product-agent models without fixing roster quantities', async () => {
  const manifest = await loadManifest(repo);
  assert.equal(manifest.schemaVersion, 5);
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
  delete manifest.codex.graphify;
  for (const agent of Object.values(manifest.codex.agents)) {
    delete agent.model;
    delete agent.modelReasoningEffort;
  }
  delete manifest.codex.agents['technical-writer'];
  assert.equal(validateManifest(manifest), manifest);
});

test('existing v4 manifests retain product development and inherited models', async () => {
  const manifest = structuredClone(await loadManifest(repo));
  manifest.schemaVersion = 4;
  delete manifest.codex.graphify;
  for (const agent of Object.values(manifest.codex.agents)) {
    delete agent.model;
    delete agent.modelReasoningEffort;
  }
  assert.equal(validateManifest(manifest), manifest);
  assert.ok(manifest.codex.productDevelopment);
  assert.equal(manifest.codex.agents['backend-developer'].model, undefined);
});

test('v5 requires both valid model fields while legacy versions require explicit migration', async () => {
  const base = await loadManifest(repo);
  for (const [field, value] of [['model', undefined], ['model', 'bad model'], ['modelReasoningEffort', undefined], ['modelReasoningEffort', 'extreme']]) {
    const manifest = structuredClone(base);
    manifest.codex.agents['backend-developer'][field] = value;
    assert.throws(() => validateManifest(manifest), /model/);
  }
  const legacy = structuredClone(base);
  legacy.schemaVersion = 4;
  assert.throws(() => validateManifest(legacy), /explicit models require manifest schemaVersion 5/);
});

test('manifest v2 is rejected rather than silently deployed', () => {
  assert.throws(() => validateManifest({ schemaVersion: 2, platform: 'vscode' }), /schemaVersion must be 3/);
});

test('Graphify manifest configuration is optional in v5 and explicitly unsupported by legacy versions', async () => {
  const base = await loadManifest(repo);
  const withoutGraphify = structuredClone(base);
  delete withoutGraphify.codex.graphify;
  assert.equal(validateManifest(withoutGraphify), withoutGraphify);
  for (const lockFile of ['../outside.json', 'C:/outside.json', '/outside.json', 'config//lock.json']) {
    const invalid = structuredClone(base);
    invalid.codex.graphify.lockFile = lockFile;
    assert.throws(() => validateManifest(invalid), /repository-relative/);
  }
  const legacy = structuredClone(base);
  legacy.schemaVersion = 4;
  for (const agent of Object.values(legacy.codex.agents)) { delete agent.model; delete agent.modelReasoningEffort; }
  assert.throws(() => validateManifest(legacy), /graphify requires manifest schemaVersion 5/);
});

test('manifest rejects broken Codex source references', async () => {
  const manifest = structuredClone(await loadManifest(repo));
  manifest.codex.agents['backend-developer'].sourceAgent = 'missing';
  assert.throws(() => validateManifest(manifest), /sourceAgent is unknown/);
});
