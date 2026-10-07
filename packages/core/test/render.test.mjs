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

test('VS Code rendering is byte-stable across Windows line endings', () => {
  const source = '---\r\nname: worker\r\ndescription: Test\r\ntools: []\r\n---\r\n# Worker\r\nBody\r\n';
  const agent = {
    id: 'worker', source: 'worker', visibility: 'worker', capabilityProfile: 'implementation',
    modelProfile: 'coding', requiredSkills: [], optionalSkills: [], allowedSubagents: [], handoffs: [],
    requiredCapabilities: [], optionalCapabilities: [],
  };
  const rendered = renderAgent(source, agent, { tools: ['read'], missingRequiredCapabilities: [], missingOptionalCapabilities: [] });
  assert.equal((rendered.match(/\r\n/g) ?? []).length, 1);
  assert.equal(rendered.endsWith('\r\n'), true);
});

test('Codex renderer emits the explicit specialist model and keeps permission settings', async () => {
  const manifest = await loadManifest(repo);
  const entry = manifest.codex.agents['software-architect'];
  const source = manifest.agents[entry.sourceAgent];
  const rendered = renderCodexAgent(await readFile(path.join(repo, source.source), 'utf8'), entry, manifest);
  const parsed = parseCodexToml(rendered);
  assert.deepEqual(Object.keys(parsed).sort(), ['description', 'developer_instructions', 'model', 'model_reasoning_effort', 'name', 'sandbox_mode']);
  assert.equal(parsed.sandbox_mode, 'read-only');
  assert.equal(parsed.model, 'gpt-6-astra');
  assert.equal(parsed.model_reasoning_effort, 'high');
  assert.doesNotMatch(parsed.developer_instructions, /Inherit the parent model/);
  assert.doesNotMatch(rendered, /^tools\s*=/m);
  assert.doesNotMatch(rendered, /^agents\s*=/m);
});

test('legacy v3 and v4 rendering preserves inheritance without model fields', async () => {
  for (const schemaVersion of [3, 4]) {
    const manifest = structuredClone(await loadManifest(repo));
    manifest.schemaVersion = schemaVersion;
    delete manifest.codex.graphify;
    for (const agent of Object.values(manifest.codex.agents)) {
      delete agent.model;
      delete agent.modelReasoningEffort;
    }
    if (schemaVersion === 3) { delete manifest.codex.productDevelopment; delete manifest.codex.externalSkillCatalog; }
    const agent = manifest.codex.agents['software-architect'];
    const source = await readFile(path.join(repo, manifest.agents[agent.sourceAgent].source), 'utf8');
    const rendered = parseCodexToml(renderCodexAgent(source, agent, manifest));
    assert.equal(rendered.model, undefined);
    assert.equal(rendered.model_reasoning_effort, undefined);
    assert.match(rendered.developer_instructions, /Inherit the parent model/);
  }
});

test('all initial Codex model assignments round-trip without changing Copilot rendering', async () => {
  const manifest = await loadManifest(repo);
  for (const entry of Object.values(manifest.codex.agents)) {
    const canonical = manifest.agents[entry.sourceAgent];
    const source = await readFile(path.join(repo, canonical.source), 'utf8');
    const parsed = parseCodexToml(renderCodexAgent(source, entry, manifest));
    const model = ['software-architect', 'cybersecurity-engineer'].includes(entry.id) ? 'gpt-6-astra' : entry.id === 'technical-writer' ? 'gpt-6-luna' : 'gpt-6.1-sol';
    const effort = ['frontend-developer', 'ux-engineer'].includes(entry.id) ? 'medium' : 'high';
    assert.equal(parsed.model, model);
    assert.equal(parsed.model_reasoning_effort, effort);
    const copilot = renderAgent(source, canonical, { tools: [], missingRequiredCapabilities: [], missingOptionalCapabilities: [] });
    assert.doesNotMatch(copilot, /gpt-6|model_reasoning_effort/);
  }
});
