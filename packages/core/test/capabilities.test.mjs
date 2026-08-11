import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAgentCapabilities } from '../dist/index.js';

const agent = {
  id: 'worker', source: 'worker', visibility: 'worker', capabilityProfile: 'implementation',
  modelProfile: 'coding', requiredSkills: [], optionalSkills: [], allowedSubagents: [], handoffs: [],
  requiredCapabilities: ['repo-read'], optionalCapabilities: ['cloud-read'],
};
const catalog = {
  version: 1,
  providers: {},
  capabilities: {
    'repo-read': { access: 'read', tools: ['git/status'] },
    'cloud-read': { access: 'read', tools: ['cloud/apps-list'] },
  },
  profiles: { implementation: { builtins: ['read', 'edit'], required: [], optional: [] } },
};

test('capability resolution includes only available exact tools', () => {
  const result = resolveAgentCapabilities(agent, catalog, ['git/status']);
  assert.deepEqual(result.tools, ['read', 'edit', 'git/status']);
  assert.deepEqual(result.missingRequiredCapabilities, []);
  assert.deepEqual(result.missingOptionalCapabilities, ['cloud-read']);
});

test('write capability requires every access-gating tool', () => {
  const writeAgent = { ...agent, requiredCapabilities: ['repo-write'], optionalCapabilities: [] };
  const writeCatalog = {
    ...catalog,
    capabilities: {
      'repo-write': {
        access: 'write',
        tools: ['git/status', 'git/add', 'git/commit'],
        requiredTools: ['git/add', 'git/commit'],
      },
    },
  };
  const blocked = resolveAgentCapabilities(writeAgent, writeCatalog, ['git/status', 'git/add']);
  assert.deepEqual(blocked.missingRequiredCapabilities, ['repo-write']);
  const ready = resolveAgentCapabilities(writeAgent, writeCatalog, ['git/status', 'git/add', 'git/commit']);
  assert.deepEqual(ready.missingRequiredCapabilities, []);
  assert.deepEqual(ready.tools, ['read', 'edit', 'git/status', 'git/add', 'git/commit']);
});
