import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createDeploymentPlan, loadCapabilityCatalog, loadJsonc, loadManifest, loadRosterCatalog, validateManifest, validateRoster } from '../dist/index.js';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

test('canonical roster passes structural validation', async () => {
  const manifest = await loadManifest(repo);
  const catalog = await loadRosterCatalog(repo);
  const result = await validateRoster(repo, manifest, undefined, { resolvedCatalog: catalog });
  assert.equal(result.valid, true, JSON.stringify(result.diagnostics));
  assert.equal(catalog.agents.length, 45);
  assert.equal(catalog.agents.filter(item => item.coordinator).length, 4);
});

test('Codex roster passes structural and TOML validation', async () => {
  const manifest = await loadManifest(repo);
  const catalog = await loadCapabilityCatalog(repo, manifest.capabilityCatalog);
  const profile = await mkdtemp(path.join(os.tmpdir(), 'agent-forge-validation-profile-'));
  try {
    const result = await validateRoster(repo, manifest, catalog, { target: 'codex', env: { USERPROFILE: profile } });
    assert.equal(result.valid, true, JSON.stringify(result.diagnostics));
  } finally { await rm(profile, { recursive: true, force: true }); }
});

test('strict v6 preview keeps configured models and reports unavailable client mappings', async () => {
  const plan = await createDeploymentPlan(repo, { availableTools: [], availableModels: [], strictCapabilities: true });
  assert.equal(plan.diagnostics.some(item => item.code === 'AF011' && item.severity === 'warning'), true, JSON.stringify(plan.diagnostics));
  assert.equal(plan.diagnostics.some(item => item.code === 'AF011' && item.severity === 'error'), false);
});

test('legacy v5 Codex duplicate discovery blocks personal skill names', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'agent-forge-duplicates-'));
  const profile = path.join(root, 'profile');
  try {
    const fixtureManifest = path.join(repo, 'packages/core/test/fixtures/legacy-v5/agent-forge.manifest.jsonc');
    const manifest = validateManifest(await loadJsonc(fixtureManifest));
    const catalog = await loadCapabilityCatalog(repo, manifest.capabilityCatalog);
    await mkdir(path.join(profile, '.codex', 'skills', 'agent-forge-engineering'), { recursive: true });
    const result = await validateRoster(repo, manifest, catalog, { target: 'codex', env: { USERPROFILE: profile } });
    assert.equal(result.valid, false);
    assert.equal(result.diagnostics.some(item => item.code === 'AF002'), true, JSON.stringify(result.diagnostics));
  } finally { await rm(root, { recursive: true, force: true }); }
});
