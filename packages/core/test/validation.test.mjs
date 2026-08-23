import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createDeploymentPlan, loadCapabilityCatalog, loadManifest, validateRoster } from '../dist/index.js';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

test('canonical roster passes structural validation', async () => {
  const manifest = await loadManifest(repo);
  const catalog = await loadCapabilityCatalog(repo, manifest.capabilityCatalog);
  const result = await validateRoster(repo, manifest, catalog);
  assert.equal(result.valid, true, JSON.stringify(result.diagnostics));
  assert.equal(Object.keys(manifest.agents).length, 24);
  assert.equal(Object.values(manifest.agents).filter(item => item.visibility === 'entry').length, 9);
});

test('Codex roster passes structural and TOML validation', async () => {
  const manifest = await loadManifest(repo);
  const catalog = await loadCapabilityCatalog(repo, manifest.capabilityCatalog);
  const result = await validateRoster(repo, manifest, catalog, { target: 'codex' });
  assert.equal(result.valid, true, JSON.stringify(result.diagnostics));
});

test('strict full preview blocks unavailable required capabilities', async () => {
  const plan = await createDeploymentPlan(repo, { availableTools: [], availableModels: [], strictCapabilities: true });
  assert.equal(plan.diagnostics.some(item => item.code === 'AF004' && item.severity === 'error'), true);
});
