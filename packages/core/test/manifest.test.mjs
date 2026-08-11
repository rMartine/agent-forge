import test from 'node:test';
import assert from 'node:assert/strict';
import { validateManifest } from '../dist/index.js';

test('manifest v2 validates the VS Code user deployment contract', () => {
  const manifest = validateManifest({
    schemaVersion: 2,
    platform: 'vscode',
    scope: 'user',
    targets: { agents: 'a', instructions: 'i', skills: 's', hooks: 'h', state: 'state' },
    capabilityCatalog: 'capabilities',
    modelProfiles: 'models',
    mcpProviders: 'mcp',
    agents: {
      worker: {
        id: 'worker', source: 'agents/worker.agent.md', visibility: 'worker',
        capabilityProfile: 'implementation', modelProfile: 'coding',
        requiredSkills: [], optionalSkills: [], allowedSubagents: [], handoffs: [],
        requiredCapabilities: [], optionalCapabilities: [],
      },
    },
    instructions: [], skills: [], hooks: [],
  });
  assert.equal(manifest.schemaVersion, 2);
  assert.equal(manifest.targets.agents, 'a');
});

test('manifest rejects broken agent references', () => {
  assert.throws(() => validateManifest({
    schemaVersion: 2, platform: 'vscode', scope: 'user',
    targets: { agents: 'a', instructions: 'i', skills: 's', hooks: 'h', state: 'state' },
    capabilityCatalog: 'capabilities', modelProfiles: 'models', mcpProviders: 'mcp',
    agents: {
      lead: {
        id: 'lead', source: 'lead', visibility: 'entry', capabilityProfile: 'p',
        modelProfile: 'inherit', requiredSkills: [], optionalSkills: [],
        allowedSubagents: ['missing'], handoffs: [], requiredCapabilities: [], optionalCapabilities: [],
      },
    },
    instructions: [], skills: [], hooks: [],
  }), /unknown agent/);
});
