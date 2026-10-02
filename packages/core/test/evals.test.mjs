import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadManifest, loadExternalSkillCatalog } from '../dist/index.js';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

async function ids(directory) {
  const files = (await readdir(directory)).filter(file => file.endsWith('.yaml')).sort();
  return Promise.all(files.map(async file => {
    const text = await readFile(path.join(directory, file), 'utf8');
    assert.match(text, /^schemaVersion: 1/m);
    assert.match(text, /^(prompt|fault): /m);
    return text.match(/^id:\s*(.+)$/m)?.[1].trim();
  }));
}

test('every canonical agent and skill has a forward evaluation fixture', async () => {
  const manifest = await loadManifest(repo);
  assert.deepEqual((await ids(path.join(repo, 'evals', 'agents'))).sort(), Object.keys(manifest.agents).sort());
  assert.deepEqual((await ids(path.join(repo, 'evals', 'skills'))).sort(), manifest.skills.map(item => item.id).sort());
});

test('lifecycle and failure-mode release fixtures are complete', async () => {
  assert.equal((await ids(path.join(repo, 'evals', 'lifecycle'))).length, 5);
  assert.equal((await ids(path.join(repo, 'evals', 'failures'))).length, 7);
});

test('Codex agents, bundles, lifecycle, and failure evaluations are complete', async () => {
  const manifest = await loadManifest(repo);
  assert.deepEqual((await ids(path.join(repo, 'evals', 'codex', 'agents'))).sort(), Object.keys(manifest.codex.agents).sort());
  const catalog = await loadExternalSkillCatalog(repo, manifest);
  const skills = [...Object.keys(manifest.codex.skillBundles), ...catalog.skills.map(skill => skill.deploymentName), manifest.codex.productDevelopment.deploymentName];
  assert.deepEqual((await ids(path.join(repo, 'evals', 'codex', 'skills'))).sort(), skills.sort());
  assert.equal((await ids(path.join(repo, 'evals', 'codex', 'lifecycle'))).length, 6);
  assert.equal((await ids(path.join(repo, 'evals', 'codex', 'failures'))).length, 7);
});
