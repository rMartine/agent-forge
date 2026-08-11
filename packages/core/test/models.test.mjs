import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveAgentModel } from '../dist/index.js';

const agent = { id: 'architect', modelProfile: 'reasoning' };

test('model resolution chooses only available configured models', () => {
  const model = resolveAgentModel(agent, { version: 1, profiles: { reasoning: ['missing', 'ready'] } }, ['ready']);
  assert.equal(model, 'ready');
});

test('model resolution falls back to inheritance when no mapping is available', () => {
  assert.equal(resolveAgentModel(agent, { version: 1, profiles: { reasoning: ['missing'] } }, ['ready']), undefined);
});
