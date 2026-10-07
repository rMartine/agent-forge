import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  activateSession, createSessionContext, deactivateSession, readSession, recordEvidence,
  runSessionCommand, updateSession, validateEvidence, validateSessionMetadata,
} from '../../../hooks/codex/product-session.mjs';
import { runProductHook } from '../../../hooks/codex/product-hooks.mjs';

const sessionScript = fileURLToPath(new URL('../../../hooks/codex/product-session.mjs', import.meta.url));
const hookScript = fileURLToPath(new URL('../../../hooks/codex/product-hooks.mjs', import.meta.url));
const completeEvidence = {
  status: 'completed', summary: 'Implemented and checked the requested behavior.',
  checks: [{ name: 'Acceptance case', command: 'node --test', result: 'passed', details: 'One isolated synthetic acceptance case passed.' }],
};

test('nested instances inherit read-only and stop or end without closing the root', async t => {
  const f = await fixture(t);
  await activateSession(f.context, 'Review the requested product.');
  await f.hook('SubagentStart', { agent_id: 'review-parent', agent_type: 'software-architect' });
  for (const agentId of ['same-role-one', 'same-role-two']) {
    await f.hook('SubagentStart', { session_id: 'review-parent', parent_agent_id: 'review-parent', agent_id: agentId, agent_type: 'backend-developer', assignment_id: `assignment-${agentId}` });
  }
  let record = await readSession(f.context);
  assert.equal(Object.keys(record.agents).length, 3);
  assert.equal(record.agents['same-role-one'].parentAgentId, 'review-parent');
  assert.equal(record.agents['same-role-two'].readOnly, true);
  assert.equal(record.agents['same-role-two'].rootSessionId, 'session-1');
  const denied = await f.hook('PreToolUse', { session_id: 'same-role-one', tool_name: 'functions.apply_patch' });
  assert.equal(denied.hookSpecificOutput.permissionDecision, 'deny');
  assert.deepEqual(await f.hook('PreToolUse', { session_id: 'same-role-one', tool_name: 'collaboration.spawn_agent' }), {});
  await f.hook('Stop', { session_id: 'same-role-one' });
  await f.hook('SessionEnd', { session_id: 'same-role-one' });
  await f.hook('Interrupt', { session_id: 'same-role-two' });
  record = await readSession(f.context);
  assert.equal(record.status, 'active');
  assert.equal(record.agents['same-role-one'].status, 'ended');
  assert.equal(record.agents['same-role-two'].status, 'interrupted');
  await recordEvidence(f.context, { status: 'interrupted', summary: 'Second child was interrupted.', checks: [], verificationNotRunReason: 'Interrupted before verification.' }, 'same-role-two');
  assert.equal((await readSession(f.context)).agents['same-role-two'].evidence.status, 'interrupted');
});

function indexObservation(project) {
  return {
    status: 'fresh', observedAt: '2026-10-02T20:00:00Z',
    metadata: {
      schemaVersion: 1, repositoryPath: project, projectId: 'a'.repeat(64), runtimeId: 'python-runtime',
      generationId: 'test-generation', contentHash: 'b'.repeat(64), graphPath: 'deliberately-not-read.json',
      graphHash: 'c'.repeat(64), scopeHash: 'd'.repeat(64), builtAt: '2026-10-02T20:00:00Z', fileCount: 3, excludedCount: 1, nodeCount: 4, edgeCount: 2,
    },
  };
}

async function fixture(t) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'agent-forge-product-hooks-'));
  const project = path.join(temporary, 'project');
  const sessionRoot = path.join(temporary, 'sessions');
  const rolesPath = path.join(temporary, 'product-roles.json');
  await mkdir(project);
  await writeFile(rolesPath, JSON.stringify({ agents: {
    'backend-developer': { skillNames: ['test-services'], instructions: 'Implement the assigned service behavior.', evidence: ['Observed API behavior', 'Executed verification and results'] },
    'qa-engineer': { skillNames: ['test-product'], instructions: 'Verify the assigned acceptance criteria.', evidence: ['Reproducible checks'] },
    'software-architect': { skillNames: ['review-architecture'], instructions: 'Review architecture without writing files.', evidence: ['Architecture findings'], evidenceWriter: 'principal' },
    'cybersecurity-engineer': { skillNames: ['review-security'], instructions: 'Review security without writing files.', evidence: ['Security findings'], evidenceWriter: 'principal' },
  } }));
  t.after(async () => { await rm(temporary, { recursive: true, force: true }); });
  const options = { sessionRoot, rolesPath };
  const context = await createSessionContext({ sessionId: 'session-1', project, sessionRoot });
  const event = (name, extra = {}) => ({ session_id: 'session-1', cwd: project, hook_event_name: name, turn_id: 'turn-1', ...extra });
  const hook = (name, extra) => runProductHook(event(name, extra), options);
  return { temporary, project, sessionRoot, rolesPath, options, context, event, hook };
}

function execute(script, args, environment, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], { env: { ...process.env, ...environment }, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', value => { stdout += value; });
    child.stderr.on('data', value => { stderr += value; });
    child.on('error', reject);
    child.on('close', code => resolve({ code, stdout, stderr }));
    child.stdin.end(input);
  });
}

test('unregistered sessions and unsupported events neither inject context nor create storage', async t => {
  const f = await fixture(t);
  for (const event of ['SubagentStart', 'SubagentStop', 'Stop', 'Interrupt', 'SessionEnd', 'PreToolUse']) {
    assert.deepEqual(await f.hook(event, { agent_id: 'agent-1', agent_type: 'backend-developer' }), {});
  }
  await assert.rejects(readdir(f.sessionRoot), { code: 'ENOENT' });
  assert.deepEqual(await readdir(f.project), []);
});

test('session and canonical project jointly identify isolated assignments', async t => {
  const f = await fixture(t);
  await activateSession(f.context, 'Build the requested application.');
  const otherProject = path.join(f.temporary, 'another-project');
  await mkdir(otherProject);
  assert.deepEqual(await runProductHook(f.event('Stop', { cwd: otherProject }), f.options), {});
  assert.deepEqual(await f.hook('Stop', { session_id: 'session-2' }), {});
  const alias = await createSessionContext({ sessionId: 'session-1', project: path.join(f.project, '..', 'project'), sessionRoot: f.sessionRoot });
  assert.equal(alias.recordPath, f.context.recordPath);
  assert.equal((await readSession(f.context)).principal.continuationRequested, false);
});

test('activation is idempotent for one assignment and rejects changing its objective in place', async t => {
  const f = await fixture(t);
  await activateSession(f.context, 'Build application.');
  await recordEvidence(f.context, completeEvidence);
  await activateSession(f.context, 'Build application.');
  assert.equal((await readSession(f.context)).principal.evidence.summary, completeEvidence.summary);
  await assert.rejects(activateSession(f.context, 'Build a different application.'), /already exists/);
  await deactivateSession(f.context);
  await activateSession(f.context, 'Build a different application.');
  assert.equal((await readSession(f.context)).principal.evidence, undefined);
});

test('subagent context selects its assigned skills and passes actual parent and agent identifiers', async t => {
  const f = await fixture(t);
  await activateSession(f.context, 'Build application.');
  const result = await f.hook('SubagentStart', { agent_id: 'agent-1', agent_type: 'backend-developer' });
  assert.equal(result.hookSpecificOutput.hookEventName, 'SubagentStart');
  assert.match(result.hookSpecificOutput.additionalContext, /test-services/);
  assert.doesNotMatch(result.hookSpecificOutput.additionalContext, /test-product/);
  assert.match(result.hookSpecificOutput.additionalContext, /session-1/);
  assert.match(result.hookSpecificOutput.additionalContext, /agent-1/);
  assert.match(result.hookSpecificOutput.additionalContext, /Do not substitute the child CODEX_THREAD_ID/);
  assert.equal((await readSession(f.context)).agents['agent-1'].type, 'backend-developer');
  assert.deepEqual(await f.hook('SubagentStart', { agent_id: 'agent-2', agent_type: 'unknown-agent' }), {});
  assert.equal(Object.hasOwn((await readSession(f.context)).agents, 'agent-2'), false);
});

test('unknown roles and malformed role definitions cannot inject a context', async t => {
  const f = await fixture(t);
  await activateSession(f.context, 'Build application.');
  await writeFile(f.rolesPath, JSON.stringify({ agents: { 'backend-developer': { skillNames: ['../escape'], instructions: 'text', evidence: [] } } }));
  await assert.rejects(f.hook('SubagentStart', { agent_id: 'agent-1', agent_type: 'backend-developer' }), /Invalid skills/);
  assert.deepEqual((await readSession(f.context)).agents, {});
});

test('principal stop requests one continuation only and closes without repeating work', async t => {
  const f = await fixture(t);
  await activateSession(f.context, 'Build application.');
  assert.equal((await f.hook('Stop')).decision, 'block');
  const second = await f.hook('Stop');
  assert.equal(second.decision, undefined);
  assert.match(second.systemMessage, /incomplete evidence/);
  assert.equal((await readSession(f.context)).status, 'inactive');
  assert.deepEqual(await f.hook('Stop'), {});
});

test('stop_hook_active skips even the first continuation request', async t => {
  const f = await fixture(t);
  await activateSession(f.context, 'Build application.');
  assert.equal((await f.hook('Stop', { stop_hook_active: true })).decision, undefined);
  assert.equal((await readSession(f.context)).status, 'inactive');
});

test('each subagent has separate evidence, a bounded continuation and a fresh record for a later assignment', async t => {
  const f = await fixture(t);
  await activateSession(f.context, 'Build application.');
  const agent = { agent_id: 'agent-1', agent_type: 'backend-developer' };
  await f.hook('SubagentStart', agent);
  assert.equal((await f.hook('SubagentStop', agent)).decision, 'block');
  assert.equal((await f.hook('SubagentStop', agent)).decision, undefined);
  await recordEvidence(f.context, completeEvidence, 'agent-1');
  await f.hook('SubagentStart', agent);
  assert.equal((await readSession(f.context)).agents['agent-1'].evidence.status, 'completed');
  await f.hook('SubagentStart', { ...agent, turn_id: 'turn-2' });
  assert.equal((await readSession(f.context)).agents['agent-1'].evidence, undefined);
  await assert.rejects(recordEvidence(f.context, completeEvidence, 'unregistered-agent'), /not registered/);
  await assert.rejects(f.hook('SubagentStart', { ...agent, agent_type: 'qa-engineer' }), /differs/);
});

test('principal completion accounts for missing specialist evidence before closing', async t => {
  const f = await fixture(t);
  await activateSession(f.context, 'Build application.');
  await f.hook('SubagentStart', { agent_id: 'agent-1', agent_type: 'backend-developer' });
  await recordEvidence(f.context, completeEvidence);
  assert.equal((await f.hook('Stop')).decision, 'block');
  await recordEvidence(f.context, completeEvidence, 'agent-1');
  assert.deepEqual(await f.hook('Stop', { stop_hook_active: true }), {});
  assert.equal((await readSession(f.context)).status, 'inactive');
});

test('read-only specialists return evidence to their principal without write instructions or continuations', async t => {
  const f = await fixture(t);
  await activateSession(f.context, 'Build application.');
  const agents = [
    { agent_id: 'architect-1', agent_type: 'software-architect' },
    { agent_id: 'security-1', agent_type: 'cybersecurity-engineer' },
  ];
  for (const agent of agents) {
    const result = await f.hook('SubagentStart', agent);
    const context = result.hookSpecificOutput.additionalContext;
    assert.match(context, /The principal agent writes your evidence record/);
    assert.match(context, /Return the evidence JSON in your final response/);
    assert.doesNotMatch(context, /Use Node with script|command record-evidence/);
    assert.equal((await readSession(f.context)).agents[agent.agent_id].evidenceWriter, 'principal');
    assert.deepEqual(await f.hook('SubagentStop', agent), {});
    assert.deepEqual(await f.hook('SubagentStop', agent), {});
  }
  await recordEvidence(f.context, completeEvidence);
  assert.equal((await f.hook('Stop')).decision, 'block');
  for (const agent of agents) await recordEvidence(f.context, completeEvidence, agent.agent_id);
  assert.deepEqual(await f.hook('Stop', { stop_hook_active: true }), {});
  assert.equal((await readSession(f.context)).status, 'inactive');
});

test('interruption while awaiting read-only specialist evidence never requests resumption', async t => {
  const f = await fixture(t);
  await activateSession(f.context, 'Build application.');
  const agent = { agent_id: 'security-1', agent_type: 'cybersecurity-engineer' };
  await f.hook('SubagentStart', agent);
  await f.hook('Interrupt');
  assert.deepEqual(await f.hook('SubagentStop', agent), {});
  assert.deepEqual(await f.hook('Stop'), {});
  assert.equal((await readSession(f.context)).status, 'interrupted');
  await recordEvidence(f.context, { status: 'interrupted', summary: 'The user interrupted the review.', checks: [], verificationNotRunReason: 'No check completed before interruption.' }, agent.agent_id);
  assert.equal((await readSession(f.context)).status, 'interrupted');
  await f.hook('SessionEnd');
  assert.equal((await readSession(f.context)).status, 'ended');
});

test('invalid evidence writers fail without registering a specialist', async t => {
  const f = await fixture(t);
  await activateSession(f.context, 'Build application.');
  const roles = JSON.parse(await readFile(f.rolesPath, 'utf8'));
  roles.agents['backend-developer'].evidenceWriter = 'someone-else';
  await writeFile(f.rolesPath, JSON.stringify(roles));
  await assert.rejects(f.hook('SubagentStart', { agent_id: 'agent-1', agent_type: 'backend-developer' }), /Invalid evidence writer/);
  assert.deepEqual((await readSession(f.context)).agents, {});
});

test('recorded blockers and failed checks produce limitations without claiming quality or restarting work', async t => {
  const f = await fixture(t);
  await activateSession(f.context, 'Build application.');
  const agent = { agent_id: 'agent-1', agent_type: 'backend-developer' };
  await f.hook('SubagentStart', agent);
  await recordEvidence(f.context, { status: 'blocked', summary: 'Required service credentials are unavailable.', checks: [], verificationNotRunReason: 'Cannot access the authorized test service.' }, 'agent-1');
  const specialist = await f.hook('SubagentStop', agent);
  assert.equal(specialist.decision, undefined);
  assert.match(specialist.systemMessage, /blocked/);
  await recordEvidence(f.context, { ...completeEvidence, checks: [{ name: 'Integration', result: 'failed', details: 'The expected fixture response was absent.' }] });
  const principal = await f.hook('Stop');
  assert.equal(principal.decision, undefined);
  assert.match(principal.systemMessage, /not evaluated product quality/);
  assert.match(principal.systemMessage, /agent record\(s\) report limitations/);
});

test('a blocked principal reports its limitation even if child evidence is absent', async t => {
  const f = await fixture(t);
  await activateSession(f.context, 'Build application.');
  await f.hook('SubagentStart', { agent_id: 'agent-1', agent_type: 'backend-developer' });
  await recordEvidence(f.context, { status: 'blocked', summary: 'User decision required for the business scope.', checks: [], verificationNotRunReason: 'Implementation is awaiting the product decision.' });
  assert.equal((await f.hook('Stop')).decision, undefined);
  assert.equal((await readSession(f.context)).status, 'inactive');
});

test('Interrupt and SessionEnd prevent later hooks from restarting the session', async t => {
  const f = await fixture(t);
  for (const [event, status] of [['Interrupt', 'interrupted'], ['SessionEnd', 'ended']]) {
    await activateSession(f.context, 'Build application.');
    assert.deepEqual(await f.hook(event), {});
    assert.equal((await readSession(f.context)).status, status);
    assert.deepEqual(await f.hook('Stop'), {});
    assert.deepEqual(await f.hook('SubagentStart', { agent_id: 'agent-1', agent_type: 'backend-developer' }), {});
  }
  await activateSession(f.context, 'Build application.');
  await f.hook('Interrupt');
  await f.hook('SessionEnd');
  assert.equal((await readSession(f.context)).status, 'ended');
  await assert.rejects(recordEvidence(f.context, completeEvidence), /No active or interrupted/);
});

test('identifiers, directories, evidence and hook field types reject malformed data', async t => {
  const f = await fixture(t);
  for (const sessionId of ['../escape', '/root', '', 'x\0y', 'a'.repeat(129)]) {
    await assert.rejects(createSessionContext({ sessionId, project: f.project, sessionRoot: f.sessionRoot }), /Session identifier/);
  }
  await assert.rejects(createSessionContext({ sessionId: 'session-1', project: '.', sessionRoot: f.sessionRoot }), /absolute/);
  await assert.rejects(createSessionContext({ sessionId: 'session-1', project: f.project, sessionRoot: path.join(f.project, 'storage') }), /outside the project/);
  const fakeProfile = path.join(f.temporary, 'profile');
  await assert.rejects(createSessionContext({ sessionId: 'session-1', project: f.project, sessionRoot: path.join(fakeProfile, '.codex', 'storage'), environment: { USERPROFILE: fakeProfile } }), /configuration directories/);
  assert.throws(() => validateEvidence({ status: 'completed', summary: 'done', checks: [] }), /Reason no verification/);
  assert.throws(() => validateEvidence({ ...completeEvidence, arbitraryCommand: 'do-something' }), /unsupported field/);
  assert.throws(() => validateEvidence({ ...completeEvidence, checks: [{ name: 'Example', result: 'passed' }] }), /Check details/);
  await activateSession(f.context, 'Build application.');
  await assert.rejects(f.hook('Stop', { stop_hook_active: 'false' }), /boolean/);
  assert.equal((await readSession(f.context)).status, 'active');
});

test('a symlink cannot redirect a record write outside temporary session storage', async t => {
  const f = await fixture(t);
  const outside = path.join(f.temporary, 'outside.json');
  await writeFile(outside, '{"preserve":true}');
  await mkdir(f.sessionRoot);
  try {
    await symlink(outside, f.context.recordPath, 'file');
  } catch (error) {
    if (error.code === 'EPERM') { t.skip('Creating file symlinks is not permitted by this Windows account.'); return; }
    throw error;
  }
  await assert.rejects(activateSession(f.context, 'Build application.'), /nonregular file/);
  assert.equal(await readFile(outside, 'utf8'), '{"preserve":true}');
});

test('a directory alias into the project is rejected before writing session storage', async t => {
  const f = await fixture(t);
  const alias = path.join(f.temporary, 'project-alias');
  await symlink(f.project, alias, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(createSessionContext({ sessionId: 'session-1', project: f.project, sessionRoot: path.join(alias, 'records') }), /outside the project/);
  assert.deepEqual(await readdir(f.project), []);
});

test('concurrent agent registrations and evidence writes preserve each result atomically', async t => {
  const f = await fixture(t);
  await activateSession(f.context, 'Build application.');
  await Promise.all(Array.from({ length: 8 }, (_, index) => f.hook('SubagentStart', { agent_id: `agent-${index}`, agent_type: 'backend-developer' })));
  const evidenceFile = path.join(f.temporary, 'evidence.json');
  await writeFile(evidenceFile, JSON.stringify(completeEvidence));
  const writes = await Promise.all(Array.from({ length: 8 }, (_, index) => execute(sessionScript, [
    'record-evidence', '--session', 'session-1', '--project', f.project, '--agent', `agent-${index}`, '--file', evidenceFile,
  ], { AGENT_FORGE_SESSION_ROOT: f.sessionRoot })));
  for (const result of writes) assert.equal(result.code, 0, result.stderr);
  const record = await readSession(f.context);
  assert.equal(Object.keys(record.agents).length, 8);
  for (const entry of Object.values(record.agents)) assert.equal(entry.evidence.summary, completeEvidence.summary);
  assert.deepEqual((await readdir(f.sessionRoot)).filter(file => !file.endsWith('.json')), []);
  assert.deepEqual(await readdir(f.project), []);
});

test('concurrent stop requests produce at most one continuation', async t => {
  const f = await fixture(t);
  await activateSession(f.context, 'Build application.');
  const results = await Promise.all(Array.from({ length: 6 }, () => f.hook('Stop')));
  assert.equal(results.filter(result => result.decision === 'block').length, 1);
  assert.equal((await readSession(f.context)).status, 'inactive');
});

test('lock contention and corrupt storage fail without overwriting state', async t => {
  const f = await fixture(t);
  await activateSession(f.context, 'Build application.');
  const original = await readFile(f.context.recordPath, 'utf8');
  await writeFile(f.context.lockPath, JSON.stringify({ processId: process.pid }));
  const started = Date.now();
  await assert.rejects(updateSession(f.context, current => { current.status = 'inactive'; return current; }, { lockWaitMs: 45 }), /locked/);
  assert.ok(Date.now() - started < 1000);
  assert.equal(await readFile(f.context.recordPath, 'utf8'), original);
  await rm(f.context.lockPath);
  await writeFile(f.context.recordPath, '{broken-json');
  await assert.rejects(f.hook('Stop'), SyntaxError);
  assert.equal(await readFile(f.context.recordPath, 'utf8'), '{broken-json');
});

test('command-line session identity uses validated environment and explicit parent override', async t => {
  const f = await fixture(t);
  const environment = { ...process.env, AGENT_FORGE_SESSION_ROOT: f.sessionRoot, CODEX_THREAD_ID: 'actual-session' };
  const activated = await runSessionCommand(['activate', '--project', f.project, '--objective', 'Build application.'], environment);
  assert.equal(activated.record.sessionId, 'actual-session');
  const explicit = await runSessionCommand(['status', '--session', 'session-1', '--project', f.project], environment);
  assert.equal(explicit.status, 'unregistered');
  await assert.rejects(runSessionCommand(['status', '--project', f.project], { ...environment, CODEX_THREAD_ID: '../invalid' }), /Session identifier/);
  await assert.rejects(runSessionCommand(['status', '--project', f.project, '--project', f.project], environment), /duplicate/);
  const cli = await execute(sessionScript, ['status', '--project', f.project], environment);
  assert.equal(cli.code, 0, cli.stderr);
  assert.equal(JSON.parse(cli.stdout).status, 'active');
});

test('native hook process emits valid JSON and reports malformed input without forcing continuation', async t => {
  const f = await fixture(t);
  for (const input of ['{broken', JSON.stringify(f.event('Stop', { session_id: '../invalid' })), 'x'.repeat(256 * 1024 + 1)]) {
    const result = await execute(hookScript, [], { AGENT_FORGE_SESSION_ROOT: f.sessionRoot }, input);
    assert.equal(result.code, 0);
    assert.deepEqual(JSON.parse(result.stdout), {});
    assert.match(result.stderr, /hook skipped/);
  }
  const inactive = await execute(hookScript, [], { AGENT_FORGE_SESSION_ROOT: f.sessionRoot }, JSON.stringify(f.event('Stop')));
  assert.equal(inactive.code, 0);
  assert.deepEqual(JSON.parse(inactive.stdout), {});
  assert.equal(inactive.stderr, '');
});

test('copied bundle scripts perform the complete registered lifecycle using neighboring roles', async t => {
  const f = await fixture(t);
  const scriptsDirectory = path.join(f.temporary, 'installed-skill', 'scripts');
  await mkdir(scriptsDirectory, { recursive: true });
  const installedSession = path.join(scriptsDirectory, 'product-session.mjs');
  const installedHook = path.join(scriptsDirectory, 'product-hooks.mjs');
  await copyFile(sessionScript, installedSession);
  await copyFile(hookScript, installedHook);
  await copyFile(fileURLToPath(new URL('../../../hooks/codex/hook-storage.mjs', import.meta.url)), path.join(scriptsDirectory, 'hook-storage.mjs'));
  await copyFile(f.rolesPath, path.join(scriptsDirectory, 'product-roles.json'));
  const environment = { AGENT_FORGE_SESSION_ROOT: f.sessionRoot };
  const identity = ['--session', 'session-1', '--project', f.project];
  const activation = await execute(installedSession, ['activate', ...identity, '--objective', 'Build application.'], environment);
  assert.equal(activation.code, 0, activation.stderr);
  const agent = { agent_id: 'agent-1', agent_type: 'backend-developer' };
  const start = await execute(installedHook, [], environment, JSON.stringify(f.event('SubagentStart', agent)));
  assert.equal(start.code, 0, start.stderr);
  const startContext = JSON.parse(start.stdout).hookSpecificOutput.additionalContext;
  assert.ok(startContext.includes(JSON.stringify(installedSession)));
  const evidenceFile = path.join(f.temporary, 'bundle-evidence.json');
  await writeFile(evidenceFile, JSON.stringify(completeEvidence));
  for (const agentArguments of [['--agent', 'agent-1'], []]) {
    const evidence = await execute(installedSession, ['record-evidence', ...identity, ...agentArguments, '--file', evidenceFile], environment);
    assert.equal(evidence.code, 0, evidence.stderr);
  }
  const specialistStop = await execute(installedHook, [], environment, JSON.stringify(f.event('SubagentStop', agent)));
  assert.deepEqual(JSON.parse(specialistStop.stdout), {});
  const principalStop = await execute(installedHook, [], environment, JSON.stringify(f.event('Stop')));
  assert.deepEqual(JSON.parse(principalStop.stdout), {});
  assert.equal((await readSession(f.context)).status, 'inactive');
  assert.deepEqual(await readdir(f.project), []);
});

test('record names contain only a digest and no supplied path fragments', async t => {
  const f = await fixture(t);
  const project = process.platform === 'win32' ? f.context.project.toLowerCase() : f.context.project;
  const expected = createHash('sha256').update(JSON.stringify(['session-1', project])).digest('hex');
  assert.equal(path.basename(f.context.recordPath), `${expected}.json`);
  assert.equal(path.dirname(f.context.recordPath), f.sessionRoot);
});

// These tests exercise metadata transport, not a model's guide selection or Graphify.
test('Start transports supplied assignment, stack versions, index metadata and conditional guides without reading project files', async t => {
  const f = await fixture(t);
  const roles = JSON.parse(await readFile(f.rolesPath, 'utf8'));
  Object.assign(roles.agents['backend-developer'], {
    expectedModel: 'gpt-6.1-sol', expectedReasoningEffort: 'high',
    conditionalSkills: [{ name: 'test-postgres', activationCondition: 'Use for PostgreSQL schema or query changes in the assigned product.' }],
  });
  await writeFile(f.rolesPath, JSON.stringify(roles));
  const metadata = {
    task: 'Build an inventory product.', scope: ['Inventory only'], context: 'Local product proof',
    stackVersion: { PostgreSQL: '16' },
    assignments: { 'backend-developer': { task: 'Implement stock adjustment.', ownership: ['api/stock.mjs'], scope: ['Local endpoint'], stackVersion: { Express: '5.2.1' }, context: 'Use the approved API contract.' } },
    graphify: indexObservation(f.project),
  };
  const contextFile = path.join(f.temporary, 'context.json');
  await writeFile(contextFile, JSON.stringify(metadata));
  await runSessionCommand(['activate', '--session', 'session-1', '--project', f.project, '--objective', 'Build inventory.', '--context-file', contextFile], { ...process.env, AGENT_FORGE_SESSION_ROOT: f.sessionRoot });
  const result = await f.hook('SubagentStart', { agent_id: 'backend-1', agent_type: 'backend-developer', model: 'gpt-6.1-sol' });
  const context = result.hookSpecificOutput.additionalContext;
  assert.match(context, /PostgreSQL.*16/);
  assert.match(context, /Express.*5.2.1/);
  assert.match(context, /api\/stock.mjs/);
  assert.match(context, /Conditional guide \$test-postgres: Use for PostgreSQL/);
  assert.match(context, /not proof the current repository is indexed or unchanged/);
  const entry = (await readSession(f.context)).agents['backend-1'];
  assert.deepEqual(entry.assignment, metadata.assignments['backend-developer']);
  assert.equal(entry.expectedModel, 'gpt-6.1-sol');
  assert.equal(entry.expectedReasoningEffort, 'high');
  assert.equal(entry.observedModel, 'gpt-6.1-sol');
  assert.equal(entry.modelMismatch, false);
  assert.deepEqual(await readdir(f.project), []);
});

test('repeated activation updates future context without erasing earlier evidence or inventing missing role assignment', async t => {
  const f = await fixture(t);
  await activateSession(f.context, 'Build inventory.', { assignments: { 'backend-developer': { task: 'First task' } } });
  await f.hook('SubagentStart', { agent_id: 'backend-1', agent_type: 'backend-developer' });
  await recordEvidence(f.context, completeEvidence, 'backend-1');
  await activateSession(f.context, 'Build inventory.', { assignments: { 'backend-developer': { task: 'Second task' } } });
  await f.hook('SubagentStart', { agent_id: 'backend-1', agent_type: 'backend-developer' });
  let record = await readSession(f.context);
  assert.equal(record.agents['backend-1'].assignment.task, 'First task');
  assert.equal(record.agents['backend-1'].evidence.status, 'completed');
  await f.hook('SubagentStart', { agent_id: 'backend-2', agent_type: 'backend-developer' });
  const result = await f.hook('SubagentStart', { agent_id: 'qa-1', agent_type: 'qa-engineer' });
  record = await readSession(f.context);
  assert.equal(record.agents['backend-2'].assignment.task, 'Second task');
  assert.equal(record.agents['qa-1'].assignment, undefined);
  assert.doesNotMatch(result.hookSpecificOutput.additionalContext, /Parent-supplied responsibility/);
  assert.equal(record.agents['qa-1'].observedModel, undefined);
});

test('model mismatches are observable warnings and never trigger a model change or continuation', async t => {
  const f = await fixture(t);
  const roles = JSON.parse(await readFile(f.rolesPath, 'utf8'));
  Object.assign(roles.agents['backend-developer'], { expectedModel: 'gpt-6.1-sol', expectedReasoningEffort: 'high' });
  await writeFile(f.rolesPath, JSON.stringify(roles));
  await activateSession(f.context, 'Build inventory.');
  const start = await f.hook('SubagentStart', { agent_id: 'backend-1', agent_type: 'backend-developer', model: 'gpt-6-luna' });
  assert.match(start.hookSpecificOutput.additionalContext, /expected gpt-6.1-sol, received gpt-6-luna/);
  assert.equal(start.decision, undefined);
  await recordEvidence(f.context, completeEvidence, 'backend-1');
  const stop = await f.hook('SubagentStop', { agent_id: 'backend-1', agent_type: 'backend-developer' });
  assert.equal(stop.decision, undefined);
  assert.match(stop.systemMessage, /cannot change or block the model/);
  await recordEvidence(f.context, completeEvidence);
  const principal = await f.hook('Stop');
  assert.equal(principal.decision, undefined);
  assert.match(principal.systemMessage, /1 agent record\(s\) observed a model different/);
});

test('Graphify evidence requires consulted references only when Graphify was used', async t => {
  const f = await fixture(t);
  await activateSession(f.context, 'Build inventory.');
  const evidence = { ...completeEvidence, graphify: { status: 'used', referencesConsulted: ['api/stock.mjs#L10', 'tests/stock.test.mjs'] } };
  await recordEvidence(f.context, evidence);
  assert.deepEqual((await readSession(f.context)).principal.evidence.graphify, evidence.graphify);
  assert.deepEqual(await f.hook('Stop'), {});
  assert.throws(() => validateEvidence({ ...evidence, graphify: { status: 'used', referencesConsulted: [] } }), /actually consulted/);
  for (const reference of ['../private.txt', '/root/private.txt', 'C:/private.txt', 'api/../private.txt', 'api\\private.txt']) {
    assert.throws(() => validateEvidence({ ...evidence, graphify: { status: 'used', referencesConsulted: [reference] } }), /relative/);
  }
  assert.deepEqual(validateEvidence(completeEvidence), completeEvidence);
});

test('unavailable Graphify permits truthful completion and preserves cancellation behavior', async t => {
  const f = await fixture(t);
  await activateSession(f.context, 'Build inventory.', { graphify: { status: 'failed', error: 'Python unavailable in isolated test.' } });
  await f.hook('SubagentStart', { agent_id: 'backend-1', agent_type: 'backend-developer' });
  await recordEvidence(f.context, { ...completeEvidence, graphify: { status: 'failed', referencesConsulted: [], error: 'Synthetic index error; used direct inspection.' } }, 'backend-1');
  await recordEvidence(f.context, { ...completeEvidence, graphify: { status: 'unavailable', referencesConsulted: [], error: 'Python unavailable in isolated test; checked files directly.' } });
  const result = await f.hook('Stop');
  assert.equal(result.decision, undefined);
  assert.match(result.systemMessage, /Graphify was unavailable/);
  assert.match(result.systemMessage, /1 agent record\(s\) report limitations/);
  await activateSession(f.context, 'Next product assignment.', { graphify: { status: 'missing' } });
  await f.hook('Interrupt');
  assert.deepEqual(await f.hook('Stop'), {});
  assert.equal((await readSession(f.context)).status, 'interrupted');
});

test('malformed context, cross-project index metadata and invalid observed models fail without corrupting session', async t => {
  const f = await fixture(t);
  for (const metadata of [{ scope: 'all files' }, { stackVersion: { Express: 5 } }, { assignments: { '../agent': {} } }, { graphify: { status: 'imagined' } }, { unexpected: true }]) {
    assert.throws(() => validateSessionMetadata(metadata));
  }
  await assert.rejects(activateSession(f.context, 'Build inventory.', { graphify: indexObservation(path.join(f.temporary, 'other-project')) }), /different project/);
  assert.equal(await readSession(f.context), null);
  await activateSession(f.context, 'Build inventory.');
  await assert.rejects(f.hook('SubagentStart', { agent_id: 'backend-1', agent_type: 'backend-developer', model: 'invalid\nmodel' }), /Observed model/);
  assert.deepEqual((await readSession(f.context)).agents, {});
});
