import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createDeploymentPlan, loadDeploymentPlan, parseCodexToml, saveDeploymentPlan } from '../dist/index.js';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

test('Codex preview contains 16 native agents and five prefixed bundles', async () => {
  const profile = await mkdtemp(path.join(os.tmpdir(), 'agent-forge-codex-plan-'));
  const previous = process.env.USERPROFILE;
  process.env.USERPROFILE = profile;
  try {
    const plan = await createDeploymentPlan(repo, { target: 'codex' });
    const agents = plan.artifacts.filter(item => item.type === 'agent');
    const skillEntries = plan.artifacts.filter(item => item.type === 'skill' && path.basename(item.targetPath) === 'SKILL.md');
    assert.equal(agents.length, 16);
    assert.equal(skillEntries.length, 5);
    assert.equal(plan.diagnostics.some(item => item.severity === 'error'), false, JSON.stringify(plan.diagnostics));
    for (const agent of agents) {
      const parsed = parseCodexToml(agent.content.toString('utf8'));
      assert.equal('tools' in parsed, false);
      assert.equal('agents' in parsed, false);
      assert.equal('model' in parsed, false);
    }
    assert.equal(plan.artifacts.some(item => item.targetPath.includes(path.join('.codex', 'skills'))), false);
    const statePath = path.join(profile, '.agent-forge', 'state.json');
    await saveDeploymentPlan(plan, statePath);
    const loaded = await loadDeploymentPlan(statePath, plan.deploymentId);
    assert.deepEqual(loaded.artifacts.map(item => item.sourceHash), plan.artifacts.map(item => item.sourceHash));
    assert.deepEqual(loaded.artifacts.map(item => item.content.toString('base64')), plan.artifacts.map(item => item.content.toString('base64')));
  } finally {
    if (previous === undefined) delete process.env.USERPROFILE; else process.env.USERPROFILE = previous;
    await rm(profile, { recursive: true, force: true });
  }
});
