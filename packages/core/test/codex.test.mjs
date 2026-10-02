import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createDeploymentPlan, loadDeploymentPlan, loadManifest, loadExternalSkillCatalog, parseCodexToml, saveDeploymentPlan } from '../dist/index.js';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

test('Codex preview contains the declared agents, complete skills and scoped hooks', async () => {
  const profile = await mkdtemp(path.join(os.tmpdir(), 'agent-forge-codex-plan-'));
  const previous = process.env.USERPROFILE;
  process.env.USERPROFILE = profile;
  try {
    const plan = await createDeploymentPlan(repo, { target: 'codex' });
    const manifest = await loadManifest(repo);
    const external = await loadExternalSkillCatalog(repo, manifest);
    const agents = plan.artifacts.filter(item => item.type === 'agent');
    const skillEntries = plan.artifacts.filter(item => item.type === 'skill' && path.basename(item.targetPath) === 'SKILL.md');
    assert.equal(agents.length, Object.keys(manifest.codex.agents).length);
    assert.equal(skillEntries.length, Object.keys(manifest.codex.skillBundles).length + external.skills.length + 1);
    const hook = plan.artifacts.find(item => item.sharedHooks);
    const hooks = JSON.parse(hook.content.toString()).hooks;
    assert.equal(hooks.SubagentStart.length, agents.length);
    assert.equal(hooks.SubagentStop.length, agents.length);
    assert.equal(hooks.Stop.length, 1);
    const hookNames = Object.values(hooks).flatMap(groups => groups.flatMap(group => group.hooks.map(handler => handler.statusMessage)));
    assert.equal(new Set(hookNames).size, agents.length * 2 + 3);
    const hookReference = plan.artifacts.find(item => item.id === `${manifest.codex.productDevelopment.deploymentName}/references/hooks.md`);
    for (const name of hookNames) {
      assert.equal(typeof name, 'string');
      assert.ok(hookReference.content.toString('utf8').includes(`## ${name}`));
    }
    for (const skill of external.skills) {
      for (const file of skill.files) assert.ok(plan.artifacts.some(item => item.id === `${skill.deploymentName}/${file.path}`));
    }
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
