import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveAgentModel, validateCodexModelAvailability, validateCodexModelConfiguration } from '../dist/index.js';

const agent = { id: 'architect', modelProfile: 'reasoning' };

test('model resolution chooses only available configured models', () => {
  const model = resolveAgentModel(agent, { version: 1, profiles: { reasoning: ['missing', 'ready'] } }, ['ready']);
  assert.equal(model, 'ready');
});

const codexAgents = { architect: { id: 'architect', model: 'gpt-6-astra', modelReasoningEffort: 'high' } };

test('unknown Codex model availability does not block explicit configuration', () => {
  assert.deepEqual(validateCodexModelAvailability(codexAgents, {}), []);
  assert.equal(validateCodexModelConfiguration('gpt-6-astra', 'high'), undefined);
});

test('available Codex catalogs reject missing models and unsupported reasoning without fallback', () => {
  const before = structuredClone(codexAgents);
  const missing = validateCodexModelAvailability(codexAgents, { availableModels: ['gpt-6.1-sol'], modelCatalogSource: 'fixture cache' });
  assert.equal(missing[0].code, 'AF011');
  assert.equal(missing[0].severity, 'error');
  assert.match(missing[0].message, /gpt-6-astra.*fixture cache/);
  const unsupported = validateCodexModelAvailability(codexAgents, { availableModels: ['gpt-6-astra'], availableReasoningEfforts: { 'gpt-6-astra': ['low'] } });
  assert.match(unsupported[0].message, /high reasoning/);
  assert.deepEqual(validateCodexModelAvailability(codexAgents, { availableModels: ['gpt-6-astra'], availableReasoningEfforts: { 'gpt-6-astra': ['high'] } }), []);
  assert.deepEqual(codexAgents, before);
});

test('model resolution falls back to inheritance when no mapping is available', () => {
  assert.equal(resolveAgentModel(agent, { version: 1, profiles: { reasoning: ['missing'] } }, ['ready']), undefined);
});
