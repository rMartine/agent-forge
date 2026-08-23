import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { loadManifest, parseCodexToml, renderAgent, renderCodexAgent } from '../dist/index.js';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

test('render injects tools and visibility without mutating body', () => {
  const source = '---\nname: worker\ndescription: Test\ntools: []\n---\n# Worker\nBody\n';
  const agent = {
    id: 'worker', source: 'worker', visibility: 'worker', capabilityProfile: 'implementation',
    modelProfile: 'coding', requiredSkills: [], optionalSkills: [], allowedSubagents: [], handoffs: [],
    requiredCapabilities: [], optionalCapabilities: [],
  };
  const rendered = renderAgent(source, agent, {
    tools: ['read', 'edit'], model: undefined,
    missingRequiredCapabilities: [], missingOptionalCapabilities: [],
  });
  assert.match(rendered, /tools: \["read", "edit"\]/);
  assert.match(rendered, /user-invocable: false/);
  assert.match(rendered, /# Worker\nBody/);
  assert.doesNotMatch(rendered, /^model:/m);
});

test('Codex renderer emits only native fields and inherited model policy', async () => {
  const manifest = await loadManifest(repo);
  const entry = manifest.codex.agents['software-architect'];
  const source = manifest.agents[entry.sourceAgent];
  const rendered = renderCodexAgent(await readFile(path.join(repo, source.source), 'utf8'), entry, manifest);
  const parsed = parseCodexToml(rendered);
  assert.deepEqual(Object.keys(parsed).sort(), ['description', 'developer_instructions', 'name', 'sandbox_mode']);
  assert.equal(parsed.sandbox_mode, 'read-only');
  assert.equal('model' in parsed, false);
  assert.doesNotMatch(rendered, /^tools\s*=/m);
  assert.doesNotMatch(rendered, /^agents\s*=/m);
});
