import assert from 'node:assert/strict';
import test from 'node:test';
import { applyMcpSetupPlan, createMcpSetupPlan } from '../dist/index.js';

const catalog = {
  version: 1,
  providers: {
    direct: { requiredForFull: true, detection: {}, configuration: { command: 'tool', args: ['mcp'] } },
    indirect: { requiredForFull: true, detection: {}, configuration: { provider: 'direct' } },
  },
};

test('MCP setup distinguishes addable and manual providers', () => {
  const plan = createMcpSetupPlan(catalog);
  assert.equal(plan.changes.find(item => item.provider === 'direct').action, 'add');
  assert.equal(plan.changes.find(item => item.provider === 'indirect').action, 'manual');
});

test('MCP setup never applies an unapproved provider', async () => {
  const result = await applyMcpSetupPlan(createMcpSetupPlan(catalog), [], 'missing-code-command');
  assert.deepEqual(result.applied, []);
  assert.deepEqual(result.skipped.sort(), ['direct', 'indirect']);
});
