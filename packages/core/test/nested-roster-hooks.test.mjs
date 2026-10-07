import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import * as communication from '../../independent-specialists/assignment.mjs';
import { runSpecialistHook } from '../../independent-specialists/hooks.mjs';
import * as consulting from '../../consulting-specialist/assignment.mjs';
import { runConsultingHook } from '../../consulting-specialist/hooks.mjs';

for (const [name, runtime, hook, role, restrictionField] of [
  ['communication', communication, runSpecialistHook, 'brand-and-graphic-design-specialist', 'toolAuthorizations'],
  ['consulting', consulting, runConsultingHook, 'technology-ai-logistics-consultant', 'toolConstraints'],
]) {
  test(`${name}: pending siblings remain distinct and cross-roster descendants inherit explicit limits`, async t => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'agent-forge-nested-hooks-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    const project = path.join(root, 'project');
    await mkdir(project);
    const options = { dataRoot: path.join(root, 'state'), environment: { ...process.env, CODEX_THREAD_ID: 'root-session' } };
    const args = ['--session', 'root-session', '--project', project];
    const assignment = { role, objective: 'Complete the synthetic authorized assignment.', expectedDeliverables: [], authorizationReference: 'Synthetic user instruction', [restrictionField]: [{ toolName: 'createDesign', inputMaxima: { count: 5 } }] };
    await runtime.runCommand(['open', ...args], { ...options, input: assignment });
    await runtime.runCommand(['open', ...args], { ...options, input: assignment });
    const context = await runtime.sessionContext('root-session', project, options);
    let state = await runtime.readState(context);
    const ids = Object.keys(state.assignments);
    assert.equal(ids.length, 2);
    const event = (hook_event_name, extra = {}) => ({ hook_event_name, session_id: 'root-session', cwd: project, ...extra });
    // No role-only guess when two prepared assignments could match. The unmatched
    // actor gets an isolated no-authorization record; both prepared assignments stay intact.
    await hook(event('SubagentStart', { agent_id: 'ambiguous', agent_type: role }), options);
    state = await runtime.readState(context);
    assert.equal(Object.keys(state.assignments).length, 3);
    assert.equal(state.assignments.ambiguous[restrictionField].length, 0);
    assert.equal(ids.every(id => state.assignments[id].status === 'prepared'), true);
    for (const [index, assignmentId] of ids.entries()) await hook(event('SubagentStart', { agent_id: `sibling-${index}`, agent_type: role, assignment_id: assignmentId }), options);
    await hook(event('SubagentStart', { session_id: 'sibling-0', parent_agent_id: 'sibling-0', agent_id: 'foreign-child', agent_type: 'backend-developer' }), options);
    await hook(event('SubagentStart', { session_id: 'foreign-child', parent_agent_id: 'foreign-child', agent_id: 'grandchild', agent_type: 'qa-engineer' }), options);
    state = await runtime.readState(context);
    assert.equal(state.assignments['foreign-child'].parentAgentId, 'sibling-0');
    assert.equal(state.assignments.grandchild.parentAgentId, 'foreign-child');
    assert.equal(state.assignments.grandchild.observedRole, 'qa-engineer');
    assert.equal(state.assignments.grandchild.rootSessionId, 'root-session');
    const denial = await hook(event('PreToolUse', { session_id: 'grandchild', tool_name: 'createDesign', tool_input: { count: 6 } }), options);
    assert.equal(denial.hookSpecificOutput.permissionDecision, 'deny');
    const permitted = await hook(event('PreToolUse', { session_id: 'grandchild', tool_name: 'createDesign', tool_input: { count: 3 } }), options);
    assert.notEqual(permitted.hookSpecificOutput?.permissionDecision, 'deny');
    await hook(event('SessionEnd', { session_id: 'grandchild' }), options);
    await hook(event('Interrupt', { session_id: 'sibling-1' }), options);
    state = await runtime.readState(context);
    assert.equal(state.assignments['sibling-0'].status, 'running');
    assert.equal(state.assignments['sibling-1'].status, 'interrupted');
    assert.equal(state.assignments.grandchild.status, 'ended');
  });
}
