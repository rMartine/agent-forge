import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createDeploymentPlan, loadDeploymentPlan, loadRosterCatalog, parseCodexToml, saveDeploymentPlan } from '../dist/index.js';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

test('Codex preview includes all canonical agents, skills and roster-scoped lifecycle hooks', async () => {
  const profile = await mkdtemp(path.join(os.tmpdir(), 'agent-forge-codex-plan-'));
  const previous = process.env.USERPROFILE;
  process.env.USERPROFILE = profile;
  try {
    const plan = await createDeploymentPlan(repo, { target: 'codex' });
    const catalog = await loadRosterCatalog(repo);
    const agents = plan.artifacts.filter(item => item.type === 'agent');
    const skillEntries = plan.artifacts.filter(item => item.type === 'skill' && path.basename(item.targetPath) === 'SKILL.md');
    const skillIds = new Set(catalog.resources.filter(resource => resource.kind === 'skill').map(resource => resource.relativePath.replaceAll('\\', '/').split('/')[0]));
    assert.equal(agents.length, 45);
    assert.equal(new Set(agents.map(item => item.id)).size, 45);
    assert.equal(skillIds.size, 70);
    assert.equal(skillEntries.length, 70);

    const hook = plan.artifacts.find(item => item.sharedHooks);
    assert.ok(hook);
    const hooks = JSON.parse(hook.content.toString()).hooks;
    for (const event of ['SubagentStart', 'SubagentStop', 'PreToolUse', 'PostToolUse', 'Stop', 'Interrupt', 'SessionEnd']) {
      assert.equal(hooks[event].length, 4, `${event} is registered once for each roster`);
    }
    const hookNames = Object.values(hooks).flatMap(groups => groups.flatMap(group => group.hooks.map(handler => handler.statusMessage)));
    assert.equal(new Set(hookNames).size, 28);

    const rolesArtifact = plan.artifacts.find(item => item.id === 'development/product-roles');
    assert.ok(rolesArtifact);
    const roles = JSON.parse(rolesArtifact.content.toString('utf8')).agents;
    const developmentAgents = catalog.agents.filter(agent => agent.roster === 'development' && !agent.coordinator);
    assert.equal(Object.keys(roles).length, developmentAgents.length);
    for (const agent of developmentAgents) {
      assert.equal(roles[agent.id].expectedModel, agent.model);
      assert.equal(roles[agent.id].expectedReasoningEffort, agent.reasoning);
      assert.deepEqual(roles[agent.id].evidence, agent.completionEvidence);
    }

    for (const artifact of agents) {
      const parsed = parseCodexToml(artifact.content.toString('utf8'));
      assert.equal(parsed.name, artifact.id);
      assert.equal('tools' in parsed, false);
      assert.equal('agents' in parsed, false);
      const source = catalog.agents.find(agent => agent.id === artifact.id);
      assert.equal(parsed.model, source.model);
      assert.equal(parsed.model_reasoning_effort, source.reasoning);
      assert.match(parsed.developer_instructions, /Subagents may delegate further/);
      if (source.readOnly) assert.equal(parsed.sandbox_mode, 'read-only');
    }
    assert.equal(plan.diagnostics.some(item => item.severity === 'error'), false, JSON.stringify(plan.diagnostics));

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
