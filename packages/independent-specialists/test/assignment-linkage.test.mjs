import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, realpath, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runSpecialistHook } from '../hooks.mjs';
import { readState, runCommand, sessionContext } from '../assignment.mjs';

const packageRoot = path.resolve(import.meta.dirname, '..');
const role = 'brand-and-graphic-design-specialist';
const tool = 'mcp__codex_apps__canva_create_design';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'independent-linkage-'));
  const project = path.join(root, 'project');
  await mkdir(project);
  const environment = { CODEX_THREAD_ID: 'root-session', USERPROFILE: root };
  const options = { environment, packageRoot, dataRoot: path.join(root, 'session-state') };
  t.after(async () => {
    const tempRoot = await realpath(os.tmpdir());
    const resolved = await realpath(root);
    const relative = path.relative(tempRoot, resolved);
    if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error(`Refusing cleanup outside os.tmpdir(): ${resolved}`);
    await rm(resolved, { recursive: true, force: true });
  });
  return { project, environment, options };
}

test('unmatched child cannot inherit a sole pending authorization; exact assignment_id still links it', async t => {
  const { project, environment, options } = await fixture(t);
  const authorization = [{ toolName: tool, inputMaxima: { count: 5 } }];
  await runCommand(['open', '--session', environment.CODEX_THREAD_ID, '--project', project], {
    ...options,
    input: { role, objective: 'Task A only', expectedDeliverables: ['Design'], authorizationReference: 'Synthetic approval for task A', toolAuthorizations: authorization },
  });

  const uncorrelated = await runSpecialistHook({
    hook_event_name: 'SubagentStart', session_id: environment.CODEX_THREAD_ID, cwd: project,
    agent_id: 'unrelated-role-instance', agent_type: role,
  }, options);
  assert.match(uncorrelated.hookSpecificOutput.additionalContext, /no recibió su autorización ni su estado/i);
  assert.doesNotMatch(uncorrelated.hookSpecificOutput.additionalContext, /Task A|Synthetic approval/);

  const pendingKey = `pending-${role}`;
  const stateContext = await sessionContext(environment.CODEX_THREAD_ID, project, options);
  let state = await readState(stateContext);
  assert.equal(state.assignments[pendingKey].status, 'prepared');
  assert.equal(state.assignments[pendingKey].authorizationReference, 'Synthetic approval for task A');
  assert.deepEqual(state.assignments['unrelated-role-instance'].toolAuthorizations, []);
  assert.equal(state.assignments['unrelated-role-instance'].authorizationReference, null);

  const denied = await runSpecialistHook({
    hook_event_name: 'PreToolUse', session_id: 'unrelated-role-instance', cwd: project,
    agent_id: 'unrelated-role-instance', agent_type: role, tool_name: tool, tool_input: { count: 3 },
  }, options);
  assert.equal(denied.hookSpecificOutput.permissionDecision, 'deny');

  const correlated = await runSpecialistHook({
    hook_event_name: 'SubagentStart', session_id: environment.CODEX_THREAD_ID, cwd: project,
    agent_id: 'authorized-task-instance', agent_type: role, assignment_id: pendingKey,
  }, options);
  assert.match(correlated.hookSpecificOutput.additionalContext, /Task A only/);
  state = await readState(stateContext);
  assert.equal(state.assignments[pendingKey], undefined);
  assert.equal(state.assignments['authorized-task-instance'].authorizationReference, 'Synthetic approval for task A');
  const allowedByHook = await runSpecialistHook({
    hook_event_name: 'PreToolUse', session_id: 'authorized-task-instance', cwd: project,
    agent_id: 'authorized-task-instance', agent_type: role, tool_name: tool, tool_input: { count: 3 },
  }, options);
  assert.deepEqual(allowedByHook, {});
});
