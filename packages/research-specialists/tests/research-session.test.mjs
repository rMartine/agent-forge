import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, symlink, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  MARKER, sessionContext, startSession, assignResearch, spawnInput, readState, recordEvidence,
  updateState, runCommand, endSession, validateAuthorization,
} from '../scripts/research-session.mjs';
import { runResearchHook } from '../scripts/research-hooks.mjs';
import { verifyResearchPackageIntegrity } from '../scripts/research-integrity.mjs';
import { generateResearchDefinitions } from '../scripts/research-definitions.mjs';

const actualPluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const authorization = { reference: 'User request in synthetic test turn 1', purpose: 'Review the supplied synthetic method', sources: ['synthetic input only'], actions: ['read and report'], limits: ['no real data or external requests'] };

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'agent-forge-research-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const project = path.join(root, 'project');
  const pluginRoot = path.join(root, 'plugin');
  const dataRoot = path.join(root, 'data');
  await mkdir(project);
  await mkdir(path.join(pluginRoot, 'roles'), { recursive: true });
  await writeFile(path.join(pluginRoot, 'roles', 'review.md'), 'Review only the assigned synthetic method. Return actual limitations.');
  await writeFile(path.join(pluginRoot, 'roles', 'research-specialist-common.md'), 'Apply only the assigned synthetic research work.');
  await mkdir(path.join(pluginRoot, 'skills', 'review'), { recursive: true });
  await writeFile(path.join(pluginRoot, 'skills', 'review', 'SKILL.md'), '---\nname: review\ndescription: Synthetic review only\n---\nReview the fixture.');
  await writeFile(path.join(pluginRoot, 'research-roster.json'), JSON.stringify({ version: 1, coordinator: { id: 'research-director', model: 'gpt-test', reasoning: 'high', skill: 'skills/direct-research/SKILL.md' }, specialists: [
    { id: 'research-review', name: 'Research reviewer', model: 'gpt-review', reasoning: 'high', roleFile: 'roles/review.md', skills: ['skills/review/SKILL.md'], externalSkills: [], completionEvidence: ['Identify methodological limitations'], readOnly: true },
    { id: 'research-analysis', name: 'Research analyst', model: 'gpt-analysis', reasoning: 'medium', roleFile: 'roles/review.md', skills: [], externalSkills: [], completionEvidence: ['Return reproducible calculations'], readOnly: false },
  ] }));
  const sessionId = 'parent-session';
  const context = await sessionContext({ sessionId, project, dataRoot });
  const options = { dataRoot, pluginRoot };
  const hook = (event, extra = {}) => runResearchHook({ hook_event_name: event, session_id: sessionId, cwd: project, ...extra }, { dataRoot, pluginRoot });
  const start = () => startSession(context, { authorization }, { pluginRoot });
  const assign = (roleId = 'research-review', taskName) => assignResearch(context, { roleId, task: 'Inspect the supplied synthetic example.', ...(taskName ? { taskName } : {}) }, { pluginRoot });
  const preparedSpawn = async (roleId = 'research-review', agentId = 'child-one') => {
    const entry = await assign(roleId);
    const toolInput = spawnInput(entry);
    assert.notEqual((await hook('PreToolUse', { tool_name: 'collaboration.spawn_agent', tool_use_id: entry.id, tool_input: toolInput })).hookSpecificOutput?.permissionDecision, 'deny');
    await hook('PostToolUse', { tool_name: 'collaboration.spawn_agent', tool_use_id: entry.id, tool_response: { agent_id: agentId, task_name: `/root/${entry.taskName}` } });
    return entry;
  };
  return { root, project, pluginRoot, dataRoot, sessionId, context, options, hook, start, assign, preparedSpawn };
}

function evidence(roleId, extra = {}) {
  return { roleId, status: 'completed', summary: 'Synthetic evidence only.', checks: [{ name: 'Fixture check', result: 'passed', details: 'Checked a synthetic fixture; no scientific validation of real data.' }], ...extra };
}

async function addIntegrityInventory(f) {
  const runtime = ['manifest.json', 'scripts/research-definitions.mjs', 'scripts/research-session.mjs', 'scripts/research-hooks.mjs', 'scripts/research-integrity.mjs', 'scripts/run-research-python.mjs', 'hooks/hooks.json'];
  for (const file of runtime) {
    await mkdir(path.dirname(path.join(f.pluginRoot, file)), { recursive: true });
    await copyFile(path.join(actualPluginRoot, file), path.join(f.pluginRoot, file));
  }
  await writeFile(path.join(f.pluginRoot, 'scripts', 'fixture-analysis.py'), '# Synthetic fixture; no helper is executed by these hook tests.\n');
  const files = await Promise.all([...runtime, 'research-roster.json', 'roles/research-specialist-common.md', 'roles/review.md', 'skills/review/SKILL.md', 'scripts/fixture-analysis.py'].sort().map(async file => ({ path: file, sha256: createHash('sha256').update(await readFile(path.join(f.pluginRoot, file))).digest('hex') })));
  const definitions = await generateResearchDefinitions(f.pluginRoot, f.pluginRoot, path.dirname(f.pluginRoot));
  for (const definition of definitions) {
    await mkdir(path.dirname(definition.path), { recursive: true });
    await writeFile(definition.path, definition.bytes);
  }
  const generatedDefinitions = definitions.map(definition => ({ kind: definition.kind, name: definition.name, sha256: createHash('sha256').update(definition.bytes).digest('hex') }));
  const inventory = { version: 1, files, generatedDefinitions, packageHash: createHash('sha256').update(JSON.stringify({ files, generatedDefinitions })).digest('hex') };
  await writeFile(path.join(f.pluginRoot, 'package-integrity.json'), JSON.stringify(inventory));
  return inventory;
}

function literalArgument(value) { return `'${value.replaceAll("'", "''")}'`; }
function helperCommand(f, policy, script = 'scripts/fixture-analysis.py') {
  return `node ${literalArgument(path.join(f.pluginRoot, 'scripts', 'run-research-python.mjs'))} --authorization ${literalArgument(policy)} --script ${literalArgument(script)} -- '--help'`;
}

async function policyFile(f, reference = authorization.reference) {
  const file = path.join(f.project, 'authorization.json');
  await writeFile(file, JSON.stringify({ version: 1, authorizationReference: reference, purpose: authorization.purpose, readRoots: [f.project], writeRoots: [], network: { rules: [] } }));
  return file;
}

test('inactive and unrelated sessions create no storage and inject no scientific or product instructions', async t => {
  const f = await fixture(t);
  for (const event of ['PreToolUse', 'PostToolUse', 'SubagentStart', 'SubagentStop', 'Stop', 'Interrupt', 'SessionEnd', 'Unknown']) assert.deepEqual(await f.hook(event), {});
  assert.equal((await readdir(f.root)).includes('data'), false);
});

test('authorization remains a referenced human scope and cannot change inside an active session', async t => {
  const f = await fixture(t);
  const initial = await f.start();
  assert.deepEqual(initial.authorization, authorization);
  assert.equal((await f.start()).createdAt, initial.createdAt);
  await assert.rejects(startSession(f.context, { authorization: { ...authorization, actions: ['additional unauthorized operation'] } }, f.options), /before changing/);
  assert.throws(() => validateAuthorization({ ...authorization, approvedByAgent: true }), /Unsupported/);
  assert.throws(() => validateAuthorization({ ...authorization, reference: '' }), /authorization reference/);
});

test('CLI accepts absolute JSON input files and rejects mixing file and literal inputs', async t => {
  const f = await fixture(t);
  const options = { ...f.options, environment: { CODEX_THREAD_ID: f.sessionId } };
  const startFile = path.join(f.project, 'session input.json');
  const assignmentFile = path.join(f.project, 'assignment input.json');
  const evidenceFile = path.join(f.project, 'evidence input.json');
  await writeFile(startFile, '\uFEFF' + JSON.stringify({ authorization }));
  await writeFile(assignmentFile, JSON.stringify({ roleId: 'research-review', task: 'Review the authorized synthetic method.' }));
  await writeFile(evidenceFile, JSON.stringify(evidence('research-review', { status: 'blocked', summary: 'The synthetic assignment was not executed.' })));
  const started = await runCommand(['start', '--project', f.project, '--input-file', startFile], options);
  assert.equal(started.status, 'active');
  const assigned = await runCommand(['assign', '--project', f.project, '--input-file', assignmentFile], options);
  const recorded = await runCommand(['evidence', '--project', f.project, '--assignment', assigned.assignmentId, '--input-file', evidenceFile], options);
  assert.equal(recorded.assignments[0].evidenceRecorded, true);
  await assert.rejects(runCommand(['start', '--project', f.project, '--input-file', startFile, '--input', JSON.stringify({ authorization })], options), /not both/);
  await assert.rejects(runCommand(['start', '--project', f.project, '--input-file', 'relative.json'], options), /must be absolute/);
});

test('principal CLI and hooks share installed storage despite different PLUGIN_DATA environments', async t => {
  const f = await fixture(t);
  await writeFile(path.join(f.pluginRoot, 'runtime.json'), JSON.stringify({ pythonExecutable: process.execPath, sessionDataRoot: f.dataRoot }));
  const parentOptions = { pluginRoot: f.pluginRoot, environment: { CODEX_THREAD_ID: f.sessionId } };
  await runCommand(['start', '--project', f.project, '--input', JSON.stringify({ authorization })], parentOptions);
  const unrelatedPluginData = path.join(f.root, 'unrelated-hook-data');
  const hookOptions = { pluginRoot: f.pluginRoot, environment: { PLUGIN_DATA: unrelatedPluginData, CODEX_PLUGIN_DATA: path.join(f.root, 'another-hook-data') } };
  const result = await runResearchHook({ hook_event_name: 'Stop', session_id: f.sessionId, cwd: f.project }, hookOptions);
  assert.equal(result.decision, 'block');
  const principalContext = await sessionContext({ sessionId: f.sessionId, project: f.project, pluginRoot: f.pluginRoot });
  const hookContext = await sessionContext({ sessionId: f.sessionId, project: f.project, ...hookOptions });
  assert.equal(principalContext.recordPath, hookContext.recordPath);
  assert.equal(principalContext.recordPath, f.context.recordPath);
  assert.equal((await readState(principalContext)).principal.continuationRequested, true);
  assert.equal((await runCommand(['status', '--project', f.project], parentOptions)).status, 'active');
  assert.equal((await readdir(f.root)).includes('unrelated-hook-data'), false);
  assert.equal((await readdir(f.root)).includes('another-hook-data'), false);
});

test('explicit test storage takes precedence and invalid installed storage cannot silently fall back', async t => {
  const f = await fixture(t);
  await writeFile(path.join(f.pluginRoot, 'runtime.json'), JSON.stringify({ sessionDataRoot: 'relative-invalid-storage' }));
  await assert.rejects(sessionContext({ sessionId: f.sessionId, project: f.project, pluginRoot: f.pluginRoot }), /absolute sessionDataRoot/);
  const explicit = await sessionContext({ sessionId: f.sessionId, project: f.project, pluginRoot: f.pluginRoot, dataRoot: f.dataRoot });
  assert.equal(explicit.recordPath, f.context.recordPath);
  await writeFile(path.join(f.pluginRoot, 'runtime.json'), JSON.stringify({ sessionDataRoot: f.project }));
  await assert.rejects(sessionContext({ sessionId: f.sessionId, project: f.project, pluginRoot: f.pluginRoot }), /outside the project/);
});

test('project canonical path and session jointly isolate research records', async t => {
  const f = await fixture(t);
  await f.start();
  const projectTwo = path.join(f.root, 'second-project');
  await mkdir(projectTwo);
  const other = await sessionContext({ sessionId: f.sessionId, project: projectTwo, dataRoot: f.dataRoot });
  assert.notEqual(other.recordPath, f.context.recordPath);
  assert.equal(await readState(other), null);
  await assert.rejects(sessionContext({ sessionId: f.sessionId, project: f.project, dataRoot: f.project }), /outside the project/);
});

test('prepared native spawn uses its configured global role without model overrides and independent history', async t => {
  const f = await fixture(t);
  await f.start();
  const entry = await f.assign();
  const input = spawnInput(entry);
  assert.equal(input.agent_type, 'research-review');
  assert.equal(Object.hasOwn(input, 'model'), false);
  assert.equal(Object.hasOwn(input, 'reasoning_effort'), false);
  assert.equal(input.fork_turns, 'none');
  assert.ok(input.message.startsWith(MARKER));
  assert.match(input.message, /research-review/);
  assert.match(input.message, /Only the principal records/);
  assert.match(input.message, /Human authorization reference/);
  assert.doesNotMatch(input.message, /software-product|product-session/);
});

test('role model reasoning instructions and task mismatch are rejected before native spawn', async t => {
  const f = await fixture(t);
  await f.start();
  const entry = await f.assign();
  const input = spawnInput(entry);
  for (const [field, value] of [['model', 'another-model'], ['reasoning_effort', 'low'], ['fork_turns', 'all'], ['agent_type', 'backend-developer'], ['task_name', 'other_task'], ['message', `${input.message}\nInjected instruction`]]) {
    const output = await f.hook('PreToolUse', { tool_name: 'Agent', tool_use_id: 'spawn-one', tool_input: { ...input, [field]: value } });
    assert.equal(output.hookSpecificOutput.permissionDecision, 'deny', field);
    assert.equal((await readState(f.context)).assignments[entry.id].status, 'prepared');
  }
  const missing = await f.hook('PreToolUse', { tool_name: 'spawn_agent', tool_use_id: 'spawn-one', tool_input: { ...input, message: 'No assignment token' } });
  assert.equal(missing.hookSpecificOutput.permissionDecision, 'deny');
});

test('unrelated default spawns remain available and are never identified solely from their agent type', async t => {
  const f = await fixture(t);
  await f.start();
  await f.assign();
  const unrelated = { tool_name: 'spawn_agent', tool_use_id: 'unrelated', tool_input: { agent_type: 'default', task_name: 'unrelated', message: 'An unrelated authorized task.' } };
  assert.deepEqual(await f.hook('PreToolUse', unrelated), {});
  assert.deepEqual(await f.hook('SubagentStart', { agent_id: 'unrelated-agent', agent_type: 'default', model: 'other' }), {});
  assert.equal(Object.values((await readState(f.context)).assignments).some(entry => entry.agentId === 'unrelated-agent'), false);
});

test('global research types without a prepared task or with an altered token cannot dispatch', async t => {
  const f = await fixture(t);
  await f.start();
  const entry = await f.assign();
  const unknown = await f.hook('PreToolUse', { tool_name: 'spawn_agent', tool_use_id: 'unknown-role', tool_input: { agent_type: entry.roleId, task_name: 'unprepared', fork_turns: 'none', message: 'Missing prepared research assignment.' } });
  assert.equal(unknown.hookSpecificOutput.permissionDecision, 'deny');
  const supplied = spawnInput(entry);
  supplied.message = supplied.message.replace(entry.token, 'invalid-token');
  const altered = await f.hook('PreToolUse', { tool_name: 'spawn_agent', tool_use_id: 'altered-token', tool_input: supplied });
  assert.equal(altered.hookSpecificOutput.permissionDecision, 'deny');
  assert.equal((await readState(f.context)).assignments[entry.id].status, 'prepared');
});

test('a reported global role mismatch blocks sensitive actions and completed evidence', async t => {
  const f = await fixture(t);
  await f.start();
  const entry = await f.preparedSpawn('research-analysis');
  await f.hook('SubagentStart', { agent_id: 'child-one', agent_type: 'research-review', model: entry.model });
  const output = await f.hook('PreToolUse', { agent_id: 'child-one', tool_name: 'functions.exec_command', tool_input: { cmd: 'some command' } });
  assert.equal(output.hookSpecificOutput.permissionDecision, 'deny');
  await assert.rejects(recordEvidence(f.context, evidence(entry.roleId), entry.id), /global role mismatch/);
  assert.equal((await readState(f.context)).assignments[entry.id].roleMismatch, true);
});

test('spawn rejection reports field comparisons without recording supplied content or unknown keys', async t => {
  const f = await fixture(t);
  await f.start();
  const entry = await f.assign();
  const input = spawnInput(entry);
  const output = await f.hook('PreToolUse', { tool_name: 'Agent', tool_use_id: 'comparison-only', tool_input: { ...input, message: 'PRIVATE_CONTENT', PRIVATE_KEY_NAME: 'PRIVATE_VALUE' } });
  assert.equal(output.hookSpecificOutput.permissionDecision, 'deny');
  const record = await readState(f.context);
  assert.deepEqual(record.assignments[entry.id].spawnValidationFailure, { mismatchedFields: ['message'], unknownFieldCount: 1, hasAssignmentMarker: false, messageMatchesAfterNormalizingLineEndings: false });
  assert.doesNotMatch(JSON.stringify({ output, record }), /PRIVATE_CONTENT|PRIVATE_KEY_NAME|PRIVATE_VALUE/);
  const lineEndingOutput = await f.hook('PreToolUse', { tool_name: 'Agent', tool_use_id: 'different-line-endings', tool_input: { ...input, message: input.message.replaceAll('\n', '\r\n') } });
  assert.notEqual(lineEndingOutput.hookSpecificOutput?.permissionDecision, 'deny');
  assert.equal(lineEndingOutput.hookSpecificOutput?.updatedInput, undefined);
});

test('opaque native messages preserve client transport while recording the comparison limitation', async t => {
  const f = await fixture(t);
  await addIntegrityInventory(f);
  await f.start();
  const entry = await f.assign();
  const expected = spawnInput(entry);
  const supplied = { ...expected, message: `gAAAA${'A'.repeat(100)}` };
  const wrongModel = await f.hook('PreToolUse', { tool_name: 'collaborationspawn_agent', tool_use_id: 'restore-instructions', tool_input: { ...supplied, model: 'another-model' } });
  assert.equal(wrongModel.hookSpecificOutput.permissionDecision, 'deny');
  assert.equal((await readState(f.context)).assignments[entry.id].status, 'prepared');
  const original = structuredClone(supplied);
  const result = await f.hook('PreToolUse', { tool_name: 'collaborationspawn_agent', tool_use_id: 'native-instructions', tool_input: supplied });
  assert.notEqual(result.hookSpecificOutput?.permissionDecision, 'deny');
  assert.equal(result.hookSpecificOutput?.updatedInput, undefined);
  assert.deepEqual(supplied, original);
  assert.ok(!JSON.stringify({ result, record: await readState(f.context) }).includes(supplied.message));
  assert.equal((await readState(f.context)).assignments[entry.id].instructionVerification, 'opaque-native-message-not-compared');
  const status = await runCommand(['status', '--project', f.project, '--session', f.sessionId], { pluginRoot: f.pluginRoot, dataRoot: f.dataRoot });
  assert.equal(status.assignments[0].instructionVerification, 'opaque-native-message-not-compared');
  await f.hook('PostToolUse', { tool_name: 'collaborationspawn_agent', tool_use_id: 'native-instructions', tool_response: { task_name: `/root/${entry.taskName}` } });
  const started = await f.hook('SubagentStart', { agent_id: 'native-child', agent_type: entry.roleId, model: entry.model });
  assert.ok(started.hookSpecificOutput.additionalContext.includes(entry.task));
  assert.equal((await readState(f.context)).assignments[entry.id].diagnostic, undefined);
});

test('opaque native transport cannot skip installed integrity verification', async t => {
  const f = await fixture(t);
  await addIntegrityInventory(f);
  await f.start();
  const entry = await f.assign();
  await writeFile(path.join(f.pluginRoot, 'scripts', 'fixture-analysis.py'), '# Changed since preparation.');
  const result = await f.hook('PreToolUse', { tool_name: 'collaborationspawn_agent', tool_use_id: 'changed-package', tool_input: { ...spawnInput(entry), message: `gAAAA${'A'.repeat(100)}` } });
  assert.equal(result.hookSpecificOutput.permissionDecision, 'deny');
  assert.equal(result.hookSpecificOutput.updatedInput, undefined);
});

test('only one unbound assignment is created under concurrent assign attempts', async t => {
  const f = await fixture(t);
  await f.start();
  const outcomes = await Promise.allSettled([f.assign(), f.assign(), f.assign(), f.assign()]);
  assert.equal(outcomes.filter(item => item.status === 'fulfilled').length, 1);
  assert.equal(Object.keys((await readState(f.context)).assignments).length, 1);
});

test('SubagentStart before PostToolUse binds a unique candidate through a canonical task name', async t => {
  const f = await fixture(t);
  await f.start();
  const entry = await f.assign();
  const tool = { tool_name: 'spawn_agent', tool_use_id: 'spawn-one', tool_input: spawnInput(entry) };
  await f.hook('PreToolUse', tool);
  assert.deepEqual(await f.hook('SubagentStart', { agent_id: 'actual-child', agent_type: entry.roleId, model: 'gpt-review' }), {});
  await f.hook('PreToolUse', tool); // An idempotent retry must preserve the candidate.
  await f.hook('PostToolUse', { ...tool, tool_response: { content: [{ type: 'text', text: JSON.stringify({ task_name: `/root/${entry.taskName}` }) }] } });
  const bound = (await readState(f.context)).assignments[entry.id];
  assert.equal(bound.agentId, 'actual-child');
  assert.equal(bound.status, 'running');
  assert.equal(bound.observedModel, 'gpt-review');
});

test('collaborationspawn_agent alias validates and correlates the complete simulated event sequence', async t => {
  const f = await fixture(t);
  await f.start();
  const entry = await f.assign();
  const tool = { tool_name: 'collaborationspawn_agent', tool_use_id: 'aliased-spawn', tool_input: spawnInput(entry) };
  const mismatch = await f.hook('PreToolUse', { ...tool, tool_input: { ...tool.tool_input, model: 'wrong-model' } });
  assert.equal(mismatch.hookSpecificOutput.permissionDecision, 'deny');
  assert.equal((await readState(f.context)).assignments[entry.id].status, 'prepared');
  assert.notEqual((await f.hook('PreToolUse', tool)).hookSpecificOutput?.permissionDecision, 'deny');
  assert.equal((await readState(f.context)).assignments[entry.id].toolUseId, 'aliased-spawn');
  assert.deepEqual(await f.hook('SubagentStart', { agent_id: 'aliased-child', agent_type: entry.roleId, model: 'gpt-review' }), {});
  await f.hook('PostToolUse', { ...tool, tool_response: { task_name: `/root/${entry.taskName}` } });
  const bound = (await readState(f.context)).assignments[entry.id];
  assert.equal(bound.agentId, 'aliased-child');
  assert.equal(bound.status, 'running');
  assert.equal(bound.observedModel, 'gpt-review');
  assert.equal(bound.modelMismatch, false);
});

test('PostToolUse before SubagentStart binds the later unique event', async t => {
  const f = await fixture(t);
  await f.start();
  const entry = await f.assign();
  const tool = { tool_name: 'spawn_agent', tool_use_id: 'spawn-one', tool_input: spawnInput(entry) };
  await f.hook('PreToolUse', tool);
  await f.hook('PostToolUse', { ...tool, tool_response: { task_name: `/root/${entry.taskName}` } });
  const output = await f.hook('SubagentStart', { agent_id: 'actual-child', agent_type: entry.roleId, model: 'gpt-review' });
  assert.match(output.hookSpecificOutput.additionalContext, /research-review/);
  assert.equal((await readState(f.context)).assignments[entry.id].agentId, 'actual-child');
  assert.equal((await readState(f.context)).assignments[entry.id].diagnostic, undefined);
});

test('concurrent unrelated spawns make candidate correlation ambiguous instead of claiming an unknown agent', async t => {
  const f = await fixture(t);
  await f.start();
  const entry = await f.assign();
  const tool = { tool_name: 'spawn_agent', tool_use_id: 'spawn-one', tool_input: spawnInput(entry) };
  await f.hook('PreToolUse', tool);
  await f.hook('PreToolUse', { tool_name: 'spawn_agent', tool_use_id: 'unrelated', tool_input: { task_name: 'unrelated', message: 'Unrelated authorized task' } });
  await f.hook('SubagentStart', { agent_id: 'unknown-default', agent_type: 'default', model: 'gpt-review' });
  await f.hook('PostToolUse', { ...tool, tool_response: { task_name: `/root/${entry.taskName}` } });
  const pending = (await readState(f.context)).assignments[entry.id];
  assert.equal(pending.agentId, undefined);
  assert.equal(pending.status, 'spawning');
  await assert.rejects(recordEvidence(f.context, evidence(entry.roleId), entry.id), /unbound/);
});

test('observed model mismatch refuses sensitive actions and cannot be accepted as completed', async t => {
  const f = await fixture(t);
  await f.start();
  const entry = await f.preparedSpawn('research-analysis');
  const output = await f.hook('SubagentStart', { agent_id: 'child-one', agent_type: 'research-analysis', model: 'unexpected-model' });
  assert.match(output.hookSpecificOutput.additionalContext, /differs/);
  const action = await runResearchHook({ hook_event_name: 'PreToolUse', session_id: 'child-one', cwd: f.project, tool_name: 'functions.exec_command', tool_input: { cmd: 'some command' } }, { dataRoot: f.dataRoot });
  assert.equal(action.hookSpecificOutput.permissionDecision, 'deny');
  await assert.rejects(recordEvidence(f.context, evidence(entry.roleId), entry.id), /model mismatch/);
  await recordEvidence(f.context, evidence(entry.roleId, { status: 'blocked' }), entry.id);
});

test('read-only agents cannot use known writing or shell tools but unknown tools are not falsely declared covered', async t => {
  const f = await fixture(t);
  await f.start();
  await f.preparedSpawn();
  for (const tool of ['apply_patch', 'functions.exec_command', 'Write', 'mcp__service__upload_file']) {
    const output = await f.hook('PreToolUse', { agent_id: 'child-one', tool_name: tool, tool_input: {} });
    assert.equal(output.hookSpecificOutput.permissionDecision, 'deny', tool);
  }
  assert.deepEqual(await f.hook('PreToolUse', { agent_id: 'child-one', tool_name: 'Read', tool_input: {} }), {});
  assert.deepEqual(await f.hook('PreToolUse', { agent_id: 'child-one', tool_name: 'unknown_tool', tool_input: {} }), {});
  const delegate = await f.hook('PreToolUse', { agent_id: 'child-one', tool_name: 'spawn_agent', tool_input: {} });
  assert.equal(delegate.hookSpecificOutput.permissionDecision, 'deny');
});

test('covered observed operations store bounded metadata without arguments or response material', async t => {
  const f = await fixture(t);
  await f.start();
  const entry = await f.preparedSpawn('research-analysis');
  const sensitiveInput = { cmd: 'secret_token=NEVER_STORE_THIS', privateInput: 'PRIVATE_RESEARCH_TEXT' };
  await f.hook('PostToolUse', { agent_id: 'child-one', tool_name: 'exec_command', tool_use_id: 'operation-one', tool_input: sensitiveInput, tool_response: { exit_code: 1, output: 'SECRET_RESPONSE' } });
  const duplicated = { agent_id: 'child-one', tool_name: 'Read', tool_use_id: 'operation-two', tool_input: sensitiveInput, tool_response: { content: 'CONFIDENTIAL' } };
  await f.hook('PostToolUse', duplicated);
  await f.hook('PostToolUse', duplicated);
  await f.hook('PostToolUse', { ...duplicated, agent_id: 'unknown-agent', tool_use_id: 'unrelated-operation' });
  await f.hook('PostToolUse', { ...duplicated, tool_name: `Read${'x'.repeat(2000)}`, tool_use_id: 'large-unknown-tool' });
  await f.hook('PostToolUse', { ...duplicated, tool_use_id: 'unsafe\nidentifier' });
  const operations = (await readState(f.context)).assignments[entry.id].operations;
  assert.equal(operations.length, 2);
  assert.deepEqual(operations.map(item => item.status), ['observed-error', 'success-or-unknown']);
  for (const item of operations) assert.deepEqual(Object.keys(item).sort(), ['status', 'time', 'toolName', 'toolUseId']);
  const stored = await readFile(f.context.recordPath, 'utf8');
  assert.doesNotMatch(stored, /NEVER_STORE_THIS|PRIVATE_RESEARCH_TEXT|SECRET_RESPONSE|CONFIDENTIAL/);
});

test('observed operation retention keeps at most the latest one hundred tool events', async t => {
  const f = await fixture(t);
  await f.start();
  const entry = await f.preparedSpawn('research-analysis');
  for (let index = 0; index < 102; index++) await f.hook('PostToolUse', { agent_id: 'child-one', tool_name: 'Read', tool_use_id: `operation-${index}`, tool_response: {} });
  const operations = (await readState(f.context)).assignments[entry.id].operations;
  assert.equal(operations.length, 100);
  assert.equal(operations[0].toolUseId, 'operation-2');
  assert.equal(operations.at(-1).toolUseId, 'operation-101');
});

test('source execution reports not-installed without pretending an integrity-verified installation', async t => {
  const f = await fixture(t);
  await f.start();
  const entry = await f.assign();
  const output = await f.hook('PreToolUse', { tool_name: 'spawn_agent', tool_use_id: 'spawn-one', tool_input: spawnInput(entry) });
  assert.equal(output.hookSpecificOutput?.permissionDecision, undefined);
  assert.match(output.systemMessage, /not-installed/);
  assert.equal((await readState(f.context)).assignments[entry.id].packageIntegrity.status, 'not-installed');
});

test('integrity inventory is checked before dispatch and tampered content denies the research spawn', async t => {
  const f = await fixture(t);
  await addIntegrityInventory(f);
  assert.equal((await verifyResearchPackageIntegrity(f.pluginRoot)).status, 'verified');
  await f.start();
  const entry = await f.assign();
  await writeFile(path.join(f.pluginRoot, 'roles', 'review.md'), 'Changed role instructions containing SECRET_TAMPER_TEXT');
  const output = await f.hook('PreToolUse', { tool_name: 'spawn_agent', tool_use_id: 'spawn-one', tool_input: spawnInput(entry) });
  assert.equal(output.hookSpecificOutput.permissionDecision, 'deny');
  assert.doesNotMatch(JSON.stringify(output), /SECRET_TAMPER_TEXT/);
  const record = (await readState(f.context)).assignments[entry.id];
  assert.equal(record.status, 'prepared');
  assert.equal(record.packageIntegrity.status, 'failed');
});

test('integrity verifier rejects path traversal, duplicate references and omitted runtime protection', async t => {
  const f = await fixture(t);
  const inventory = await addIntegrityInventory(f);
  for (const invalid of [
    { version: 1, files: [...inventory.files, { path: '../outside', sha256: '0'.repeat(64) }] },
    { version: 1, files: [...inventory.files, inventory.files[0]] },
    { version: 1, files: inventory.files.filter(file => file.path !== 'scripts/research-hooks.mjs') },
  ]) {
    await writeFile(path.join(f.pluginRoot, 'package-integrity.json'), JSON.stringify(invalid));
    await assert.rejects(verifyResearchPackageIntegrity(f.pluginRoot));
  }
});

test('covered Python launcher invocation checks absolute plugin paths and matching human authorization', async t => {
  const f = await fixture(t);
  await addIntegrityInventory(f);
  await f.start();
  await f.preparedSpawn('research-analysis');
  const policy = await policyFile(f);
  const command = helperCommand(f, policy);
  assert.deepEqual(await f.hook('PreToolUse', { agent_id: 'child-one', tool_name: 'functions.exec_command', tool_input: { cmd: command } }), {});
  assert.deepEqual(await f.hook('PreToolUse', { agent_id: 'child-one', tool_name: 'exec_command', tool_input: { cmd: command.replace(/^node /, `& ${literalArgument(process.execPath)} `) } }), {});
  const apostrophePolicy = path.join(f.project, "reviewer's authorization.json");
  await copyFile(policy, apostrophePolicy);
  assert.deepEqual(await f.hook('PreToolUse', { agent_id: 'child-one', tool_name: 'exec_command', tool_input: { cmd: helperCommand(f, apostrophePolicy) } }), {});
  const recordText = await readFile(f.context.recordPath, 'utf8');
  assert.doesNotMatch(recordText, /authorization\.json|--help/);
});

test('covered Python launcher rejects mismatched authorization and foreign or uninventoried scripts', async t => {
  const f = await fixture(t);
  await addIntegrityInventory(f);
  await f.start();
  await f.preparedSpawn('research-analysis');
  const policy = await policyFile(f, 'A different authorization');
  let output = await f.hook('PreToolUse', { agent_id: 'child-one', tool_name: 'exec_command', tool_input: { cmd: helperCommand(f, policy) } });
  assert.equal(output.hookSpecificOutput.permissionDecision, 'deny');
  await policyFile(f);
  await writeFile(path.join(f.pluginRoot, 'scripts', 'not-in-inventory.py'), '# Not inventoried.');
  for (const script of ['../outside.py', 'scripts/not-in-inventory.py', path.join(f.pluginRoot, 'scripts', 'fixture-analysis.py')]) {
    output = await f.hook('PreToolUse', { agent_id: 'child-one', tool_name: 'exec_command', tool_input: { cmd: helperCommand(f, policy, script) } });
    assert.equal(output.hookSpecificOutput.permissionDecision, 'deny', script);
  }
  const foreignLauncher = path.join(f.root, 'run-research-python.mjs');
  await writeFile(foreignLauncher, '// Foreign launcher');
  const foreign = helperCommand(f, policy).replace(literalArgument(path.join(f.pluginRoot, 'scripts', 'run-research-python.mjs')), literalArgument(foreignLauncher));
  assert.equal((await f.hook('PreToolUse', { agent_id: 'child-one', tool_name: 'exec_command', tool_input: { cmd: foreign } })).hookSpecificOutput.permissionDecision, 'deny');
});

test('ambiguous helper shell commands are denied while literal script arguments remain literal', async t => {
  const f = await fixture(t);
  await addIntegrityInventory(f);
  await f.start();
  await f.preparedSpawn('research-analysis');
  const policy = await policyFile(f);
  const command = helperCommand(f, policy);
  for (const cmd of [`${command}; another-command`, `${command} | another-command`, `${command}\nnext-command`, command.replace(literalArgument(policy), '$ResearchPolicy'), command.replace(literalArgument(policy), `"${policy}"`), `powershell -Command ${literalArgument(command)}`]) {
    const output = await f.hook('PreToolUse', { agent_id: 'child-one', tool_name: 'exec_command', tool_input: { cmd } });
    assert.equal(output.hookSpecificOutput.permissionDecision, 'deny');
  }
  assert.deepEqual(await f.hook('PreToolUse', { agent_id: 'child-one', tool_name: 'exec_command', tool_input: { cmd: `${command} '--label' 'literal; value with $characters'` } }), {});
  assert.equal((await f.hook('PreToolUse', { agent_id: 'child-one', tool_name: 'exec_command', tool_input: { cmd: command, shell: 'cmd.exe' } })).hookSpecificOutput.permissionDecision, 'deny');
});

test('canonical Bash command events verify the packaged helper and preserve literal PowerShell restrictions', async t => {
  const f = await fixture(t);
  await addIntegrityInventory(f);
  await f.start();
  await f.preparedSpawn('research-analysis');
  const policy = await policyFile(f);
  const command = helperCommand(f, policy);
  const canonicalEvent = commandText => ({ agent_id: 'child-one', tool_name: 'Bash', tool_input: { command: commandText } });
  assert.deepEqual(await f.hook('PreToolUse', canonicalEvent(command)), {});
  assert.deepEqual(await f.hook('PreToolUse', canonicalEvent(command.replace(/^node /, `& ${literalArgument(process.execPath)} `))), {});
  assert.deepEqual(await f.hook('PreToolUse', canonicalEvent(`${command} '--label' 'literal; value with $characters'`)), {});
  for (const ambiguous of [
    `${command}; another-command`, `${command} | another-command`, `${command}\nnext-command`,
    command.replace(literalArgument(policy), '$ResearchPolicy'),
    command.replace(literalArgument(policy), `"${policy}"`),
    `powershell -Command ${literalArgument(command)}`,
  ]) assert.equal((await f.hook('PreToolUse', canonicalEvent(ambiguous))).hookSpecificOutput.permissionDecision, 'deny');
  assert.equal((await f.hook('PreToolUse', { ...canonicalEvent(command), tool_input: { command, shell: 'cmd.exe' } })).hookSpecificOutput.permissionDecision, 'deny');
  await policyFile(f, 'Another authorization');
  assert.equal((await f.hook('PreToolUse', canonicalEvent(command))).hookSpecificOutput.permissionDecision, 'deny');
  await policyFile(f);
  assert.equal((await f.hook('PreToolUse', canonicalEvent(helperCommand(f, policy, '../outside.py')))).hookSpecificOutput.permissionDecision, 'deny');
  await writeFile(path.join(f.pluginRoot, 'scripts', 'uninventoried.py'), '# Not part of the reviewed package.');
  assert.equal((await f.hook('PreToolUse', canonicalEvent(helperCommand(f, policy, 'scripts/uninventoried.py')))).hookSpecificOutput.permissionDecision, 'deny');
  await writeFile(path.join(f.pluginRoot, 'scripts', 'fixture-analysis.py'), '# Modified after inventory.');
  assert.equal((await f.hook('PreToolUse', canonicalEvent(command))).hookSpecificOutput.permissionDecision, 'deny');
});

test('canonical Bash events retain read-only and model restrictions without claiming unrelated commands', async t => {
  const f = await fixture(t);
  await f.start();
  await f.preparedSpawn('research-review', 'reviewer-child');
  const ordinaryCommand = { tool_name: 'Bash', tool_input: { command: 'python -c "print(1 + 1)"' } };
  assert.equal((await f.hook('PreToolUse', { ...ordinaryCommand, agent_id: 'reviewer-child' })).hookSpecificOutput.permissionDecision, 'deny');
  await f.preparedSpawn('research-analysis', 'analyst-child');
  assert.deepEqual(await f.hook('PreToolUse', { ...ordinaryCommand, agent_id: 'analyst-child' }), {});
  assert.deepEqual(await f.hook('PreToolUse', { agent_id: 'unrelated-child', tool_name: 'Bash', tool_input: { command: 'node run-research-python.mjs ambiguous' } }), {});
  await f.hook('SubagentStart', { agent_id: 'analyst-child', agent_type: 'research-analysis', model: 'unexpected-model' });
  assert.equal((await f.hook('PreToolUse', { ...ordinaryCommand, agent_id: 'analyst-child' })).hookSpecificOutput.permissionDecision, 'deny');
});

test('helper checks leave unrelated scientific shell work and unexposed JavaScript orchestration untouched', async t => {
  const f = await fixture(t);
  await f.start();
  await f.preparedSpawn('research-analysis');
  assert.deepEqual(await f.hook('PreToolUse', { agent_id: 'child-one', tool_name: 'exec_command', tool_input: { cmd: 'python -c "print(1 + 1)"' } }), {});
  assert.deepEqual(await f.hook('PreToolUse', { agent_id: 'unknown-agent', tool_name: 'exec_command', tool_input: { cmd: 'node run-research-python.mjs ambiguous' } }), {});
  assert.deepEqual(await f.hook('PreToolUse', { agent_id: 'child-one', tool_name: 'functions.exec', tool_input: { code: 'tools.exec_command({cmd: "node run-research-python.mjs ambiguous"})' } }), {});
});

test('only principal CLI may mutate records and evidence must match the assigned role exactly', async t => {
  const f = await fixture(t);
  await f.start();
  const entry = await f.preparedSpawn();
  await assert.rejects(runCommand(['evidence', '--project', f.project, '--session', f.sessionId, '--assignment', entry.id, '--input', JSON.stringify(evidence(entry.roleId))], { ...f.options, environment: { CODEX_THREAD_ID: 'child-one' } }), /principal/);
  await assert.rejects(recordEvidence(f.context, evidence('research-analysis'), entry.id), /exact assigned role/);
  const result = await runCommand(['evidence', '--project', f.project, '--session', f.sessionId, '--assignment', entry.id, '--input', JSON.stringify(evidence(entry.roleId))], { ...f.options, environment: { CODEX_THREAD_ID: f.sessionId } });
  assert.equal(result.assignments[0].evidenceRecorded, true);
  assert.equal((await readState(f.context)).assignments[entry.id].evidence.roleId, 'research-review');
});

test('concurrent evidence updates preserve every completed assignment', async t => {
  const f = await fixture(t);
  await f.start();
  const first = await f.preparedSpawn('research-review', 'child-one');
  const second = await f.preparedSpawn('research-analysis', 'child-two');
  await Promise.all([recordEvidence(f.context, evidence(first.roleId), first.id), recordEvidence(f.context, evidence(second.roleId), second.id), recordEvidence(f.context, evidence('research-director'))]);
  const record = await readState(f.context);
  assert.ok(record.principal.evidence);
  assert.ok(record.assignments[first.id].evidence);
  assert.ok(record.assignments[second.id].evidence);
});

test('missing verification is explicit and failed specialist checks are reported at closure', async t => {
  const f = await fixture(t);
  await f.start();
  const entry = await f.preparedSpawn();
  await assert.rejects(recordEvidence(f.context, evidence(entry.roleId, { checks: [] }), entry.id), /verification was not run/);
  await recordEvidence(f.context, evidence(entry.roleId, { checks: [{ name: 'Synthetic check', result: 'failed', details: 'The fixture did not meet the expected condition.' }] }), entry.id);
  await recordEvidence(f.context, evidence('research-director', { checks: [], verificationNotRunReason: 'This fixture only checks bookkeeping; it does not evaluate science.' }));
  const output = await f.hook('Stop');
  assert.equal(output.decision, undefined);
  assert.match(output.systemMessage, /checks that did not pass/);
  assert.match(output.systemMessage, /does not certify/);
});

test('specialists can stop without writing evidence and the principal gets at most one continuation', async t => {
  const f = await fixture(t);
  await f.start();
  await f.preparedSpawn();
  const specialist = await f.hook('SubagentStop', { agent_id: 'child-one', agent_type: 'research-analysis' });
  assert.equal(specialist.decision, undefined);
  const stops = await Promise.all([f.hook('Stop'), f.hook('Stop'), f.hook('Stop')]);
  assert.equal(stops.filter(item => item.decision === 'block').length, 1);
  assert.equal((await readState(f.context)).status, 'completed');
  assert.deepEqual(await f.hook('Stop'), {});
});

test('stop_hook_active and recorded principal blockers never request another continuation', async t => {
  const f = await fixture(t);
  await f.start();
  assert.equal((await f.hook('Stop', { stop_hook_active: true })).decision, undefined);
  await f.start();
  await f.assign();
  await recordEvidence(f.context, evidence('research-director', { status: 'blocked' }));
  assert.equal((await f.hook('Stop')).decision, undefined);
});

test('interruption preserves evidence recording but never restarts or resumes automatically', async t => {
  const f = await fixture(t);
  await f.start();
  const entry = await f.preparedSpawn();
  assert.deepEqual(await f.hook('Interrupt'), {});
  assert.equal((await readState(f.context)).status, 'interrupted');
  assert.deepEqual(await f.hook('Stop'), {});
  await assert.rejects(f.start(), /cannot restart automatically/);
  await recordEvidence(f.context, evidence(entry.roleId, { status: 'interrupted' }), entry.id);
  await endSession(f.context);
  await f.start();
  assert.equal((await readState(f.context)).status, 'active');
});

test('subagent SessionEnd changes only its assignment and failed spawn releases the pending slot', async t => {
  const f = await fixture(t);
  await f.start();
  const first = await f.preparedSpawn();
  await runResearchHook({ hook_event_name: 'SessionEnd', session_id: 'child-one', cwd: f.project }, { dataRoot: f.dataRoot });
  let record = await readState(f.context);
  assert.equal(record.status, 'active');
  assert.equal(record.assignments[first.id].status, 'interrupted');
  const second = await f.assign();
  const tool = { tool_name: 'spawn_agent', tool_use_id: 'spawn-failed', tool_input: spawnInput(second) };
  await f.hook('PreToolUse', tool);
  await f.hook('PostToolUse', { ...tool, tool_response: { isError: true } });
  record = await readState(f.context);
  assert.equal(record.assignments[second.id].status, 'blocked');
  assert.ok(await f.assign());
});

test('record locks and malformed storage fail without overwriting prior state', async t => {
  const f = await fixture(t);
  await f.start();
  const before = await readFile(f.context.recordPath);
  await writeFile(f.context.lockPath, 'occupied');
  await assert.rejects(updateState(f.context, record => record, { lockWaitMs: 20 }), /locked/);
  assert.deepEqual(await readFile(f.context.recordPath), before);
  await rm(f.context.lockPath);
  await writeFile(f.context.recordPath, '{broken');
  await assert.rejects(f.assign());
  assert.equal(await readFile(f.context.recordPath, 'utf8'), '{broken');
});

test('project directory aliases cannot redirect state storage into the project', async t => {
  const f = await fixture(t);
  const alias = path.join(f.root, 'project-alias');
  try { await symlink(f.project, alias, process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) { if (['EPERM', 'EACCES'].includes(error.code)) { t.skip('Host cannot create a directory alias.'); return; } throw error; }
  await assert.rejects(sessionContext({ sessionId: f.sessionId, project: f.project, dataRoot: alias }), /outside the project/);
});

test('real hook entrypoint returns JSON on malformed input without exposing supplied secrets', async () => {
  const result = spawnSync(process.execPath, [path.join(actualPluginRoot, 'scripts', 'research-hooks.mjs')], { input: '{malformed secret_token=DO_NOT_LOG', encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.doesNotThrow(() => JSON.parse(result.stdout));
  assert.doesNotMatch(result.stdout + result.stderr, /DO_NOT_LOG|secret_token/);
});

test('hook manifest declares exactly the seven lifecycle events with bounded commands', async () => {
  const hooks = JSON.parse(await readFile(path.join(actualPluginRoot, 'hooks', 'hooks.json'), 'utf8')).hooks;
  assert.deepEqual(Object.keys(hooks).sort(), ['Interrupt', 'PostToolUse', 'PreToolUse', 'SessionEnd', 'Stop', 'SubagentStart', 'SubagentStop'].sort());
  for (const groups of Object.values(hooks)) for (const group of groups) for (const handler of group.hooks) {
    assert.equal(handler.type, 'command');
    assert.ok(handler.timeout <= 10);
    assert.match(handler.command, /research-hooks\.mjs/);
    assert.doesNotMatch(handler.command, /product|powershell|cmd /i);
  }
});
