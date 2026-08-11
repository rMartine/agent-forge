import test from 'node:test';
import assert from 'node:assert/strict';
import { renderAgent } from '../dist/index.js';

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
