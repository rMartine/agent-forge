import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
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

test('Codex duplicate discovery blocks project agents and personal bundle names', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'agent-forge-duplicates-'));
  const profile = path.join(root, 'profile');
  const fixture = path.join(root, 'repo');
  try {
    await mkdir(fixture, { recursive: true });
    for (const entry of ['agent-forge.manifest.jsonc', 'agents', 'skills', 'instructions', 'config']) {
      await cp(path.join(repo, entry), path.join(fixture, entry), { recursive: true });
    }
    await mkdir(path.join(fixture, '.codex', 'agents'), { recursive: true });
    await writeFile(path.join(fixture, '.codex', 'agents', 'backend-developer.toml'), 'name = "backend-developer"');
    await mkdir(path.join(profile, '.codex', 'skills', 'agent-forge-engineering'), { recursive: true });
    const manifest = await loadManifest(fixture);
    const catalog = await loadCapabilityCatalog(fixture, manifest.capabilityCatalog);
    const result = await validateRoster(fixture, manifest, catalog, { target: 'codex', env: { USERPROFILE: profile } });
    assert.equal(result.valid, false);
    assert.equal(result.diagnostics.filter(item => item.code === 'AF002').length >= 2, true, JSON.stringify(result.diagnostics));
  } finally { await rm(root, { recursive: true, force: true }); }
});
