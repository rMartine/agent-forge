import path from 'node:path';
import { lstat, realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  MARKER, MAX_BYTES, MODULE_ROOT, readJson, readState, resolveHookContext, spawnInput, updateState, writeAgentLink,
} from './research-session.mjs';
import { verifyResearchPackageIntegrity } from './research-integrity.mjs';

const EVENTS = new Set(['PreToolUse', 'PostToolUse', 'SubagentStart', 'SubagentStop', 'Stop', 'Interrupt', 'SessionEnd']);
const SPAWN_TOOLS = new Set(['Agent', 'spawn_agent', 'collaboration.spawn_agent', 'functions.collaboration.spawn_agent', 'collaborationspawn_agent']);
const WRITING_TOOLS = new Set(['apply_patch', 'functions.apply_patch', 'Write', 'Edit', 'MultiEdit', 'NotebookEdit']);
const SHELL_TOOLS = new Set(['exec_command', 'functions.exec_command', 'Bash', 'powershell', 'shell_command', 'write_stdin', 'functions.write_stdin']);
const OBSERVED_TOOLS = new Set([...SPAWN_TOOLS, ...WRITING_TOOLS, ...SHELL_TOOLS, 'functions.exec', 'functions.wait', 'Read', 'Glob', 'Grep', 'WebSearch', 'WebFetch', 'read_file', 'list_files', 'read_mcp_resource', 'functions.read_mcp_resource', 'web.run', 'functions.web__run']);
const SAFE_TOOL_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,159}$/;
const DIRECT_EXEC_COMMAND_FIELDS = new Map([
  ['Bash', 'command'],
  ['exec_command', 'cmd'],
  ['functions.exec_command', 'cmd'],
]);
const LAUNCHER_NAME = 'run-research-python.mjs';
const SENSITIVE_WORDS = /(?:^|[_.:/])(write|edit|delete|remove|upload|send|publish|deploy|install|update|create|execute|exec|run|commit|merge|push|connect)(?:$|[_.:/])/i;

function deny(reason) {
  return { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } };
}

function note(message) { return { systemMessage: message }; }
function isSpawn(name) { return SPAWN_TOOLS.has(name); }
function writingOrExecution(name) { return WRITING_TOOLS.has(name) || SHELL_TOOLS.has(name) || SENSITIVE_WORDS.test(name); }
function knownRead(name) { return /(?:^|[_.:/])(read|list|find|search|fetch|view|get|open)(?:$|[_.:/])/i.test(name) && !writingOrExecution(name); }

function assignmentFromInput(record, input) {
  const body = input.tool_input;
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { entry: null, marked: false };
  const message = typeof body.message === 'string' ? body.message : typeof body.prompt === 'string' ? body.prompt : '';
  const marked = message.includes(MARKER);
  const byName = Object.values(record.assignments).find(entry => entry.taskName === body.task_name);
  if (!marked) return { entry: byName ?? null, marked: false };
  const line = message.split(/\r?\n/).find(item => item.startsWith(MARKER));
  let marker;
  try { marker = JSON.parse(line.slice(MARKER.length)); }
  catch { return { entry: null, marked: true }; }
  const entry = record.assignments[marker.assignmentId];
  if (!entry || entry.token !== marker.token || marker.parentSessionId !== record.sessionId || marker.taskName !== entry.taskName) return { entry: null, marked: true };
  return { entry, marked: true };
}

function actorAssignment(record, actorId) {
  return actorId ? Object.values(record.assignments).find(entry => entry.agentId === actorId) : undefined;
}

function observeModel(entry, model) {
  if (typeof model !== 'string' || !model.trim()) return;
  entry.observedModel = model;
  if (model !== entry.model) {
    entry.modelMismatch = true;
    entry.diagnostic = 'The model reported by the subagent event differs from the prepared assignment. Sensitive actions must stop; the principal must resolve this before accepting completion.';
  }
}

function observeAgentType(entry, agentType) {
  if (typeof agentType !== 'string' || !agentType.trim()) return;
  entry.observedAgentType = agentType;
  if (agentType !== entry.roleId) {
    entry.roleMismatch = true;
    entry.diagnostic = 'The reported global agent type differs from the prepared research role. Sensitive actions and completed evidence require the principal to resolve this mismatch.';
  }
}

function responseIdentity(response, depth = 0) {
  if (depth > 6 || response === null || response === undefined) return {};
  if (typeof response === 'string') {
    if (response.length > MAX_BYTES) return {};
    try { return responseIdentity(JSON.parse(response), depth + 1); }
    catch { return {}; }
  }
  if (typeof response !== 'object') return {};
  if (Array.isArray(response)) {
    const identities = response.map(item => responseIdentity(item, depth + 1));
    return identities.reduce((result, identity) => ({ ...result, ...identity }), {});
  }
  const found = {};
  if (typeof response.agent_id === 'string') found.agentId = response.agent_id;
  else if (typeof response.id === 'string') found.agentId = response.id;
  if (typeof response.task_name === 'string') found.taskName = response.task_name;
  if (typeof response.agent_type === 'string') found.agentType = response.agent_type;
  if (typeof response.model === 'string') found.model = response.model;
  if (response.isError === true || response.error) found.failed = true;
  for (const key of ['content', 'structuredContent', 'result', 'text', 'output']) {
    if (response[key] !== undefined) Object.assign(found, responseIdentity(response[key], depth + 1));
  }
  return found;
}

function taskNamesMatch(expected, actual) {
  return actual === expected || (typeof actual === 'string' && actual.endsWith(`/${expected}`));
}

// This recognizes a deliberately restricted literal PowerShell invocation. It
// never evaluates shell text, resolves variables, or inspects JavaScript tools.
function literalCommandArguments(command) {
  if (typeof command !== 'string' || command.length > 32_000 || /[\r\n\u0000-\u0008\u000b-\u001f]/.test(command)) throw new Error('Unsupported helper invocation.');
  let offset = 0;
  const tokens = [];
  const whitespace = () => { while (/[ \t]/.test(command[offset] ?? '') && offset < command.length) offset++; };
  whitespace();
  if (command[offset] === '&') {
    offset++;
    if (!/[ \t]/.test(command[offset] ?? '')) throw new Error('Unsupported call operator.');
    whitespace();
  }
  while (offset < command.length) {
    let token = '';
    if (command[offset] === "'") {
      offset++;
      let closed = false;
      while (offset < command.length) {
        if (command[offset] === "'") {
          if (command[offset + 1] === "'") { token += "'"; offset += 2; continue; }
          offset++;
          closed = true;
          break;
        }
        token += command[offset++];
      }
      if (!closed || (offset < command.length && !/[ \t]/.test(command[offset]))) throw new Error('Unsupported quoted argument.');
    } else {
      const start = offset;
      while (offset < command.length && !/[ \t]/.test(command[offset])) offset++;
      token = command.slice(start, offset);
      if (!/^[A-Za-z0-9_.:/\\-]+$/.test(token)) throw new Error('Only literal helper arguments are supported.');
    }
    if (token.length > 8192 || tokens.length >= 200) throw new Error('Helper arguments exceed the supported limit.');
    tokens.push(token);
    whitespace();
  }
  return tokens;
}

const normalizePath = value => process.platform === 'win32' ? value.toLowerCase() : value;
function pathInside(root, file) {
  const relative = path.relative(normalizePath(root), normalizePath(file));
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

async function checkPackagedHelper(input, record, options) {
  const commandField = DIRECT_EXEC_COMMAND_FIELDS.get(input.tool_name);
  const command = commandField ? input.tool_input?.[commandField] : undefined;
  if (typeof command !== 'string' || !command.toLowerCase().includes(LAUNCHER_NAME)) return null;
  try {
    const shell = input.tool_input.shell;
    if (shell !== undefined && (typeof shell !== 'string' || !/(?:^|[\\/])(?:powershell|pwsh)(?:\.exe)?$/i.test(shell))) throw new Error('Unsupported helper shell.');
    const args = literalCommandArguments(command);
    if (args.length < 7 || args[2] !== '--authorization' || args[4] !== '--script' || args[6] !== '--') throw new Error('Unsupported helper argument order.');
    if (!['node', 'node.exe'].includes(args[0].toLowerCase())) {
      if (!path.isAbsolute(args[0]) || normalizePath(await realpath(args[0])) !== normalizePath(await realpath(process.execPath))) throw new Error('Unsupported Node executable.');
    }
    const root = await realpath(options.pluginRoot ?? MODULE_ROOT);
    const expectedLauncher = path.join(root, 'scripts', LAUNCHER_NAME);
    if (!path.isAbsolute(args[1]) || normalizePath(await realpath(args[1])) !== normalizePath(expectedLauncher) || !(await lstat(args[1])).isFile()) throw new Error('Launcher does not belong to this module.');
    const relativeScript = args[5];
    if (path.isAbsolute(relativeScript) || /[:\u0000-\u001f]/.test(relativeScript) || relativeScript.split(/[\\/]/).some(part => !part || part === '.' || part === '..') || !relativeScript.endsWith('.py')) throw new Error('Invalid packaged Python script path.');
    const script = path.resolve(root, relativeScript);
    if (!pathInside(root, script) || !pathInside(root, await realpath(script)) || !(await lstat(script)).isFile()) throw new Error('Python script leaves the installed module.');
    if (!path.isAbsolute(args[3])) throw new Error('Authorization file must have an absolute path.');
    const policy = await readJson(args[3]);
    if (policy.version !== 1 || policy.authorizationReference !== record.authorization.reference || typeof policy.purpose !== 'string' || !policy.purpose.trim()) throw new Error('Helper authorization does not match the research assignment.');
    const integrity = await verifyResearchPackageIntegrity(root);
    if (integrity.status !== 'verified') throw new Error('Helper requires an installed integrity inventory.');
    const inventory = await readJson(path.join(root, 'package-integrity.json'));
    const covered = new Set(inventory.files.map(file => normalizePath(file.path.replaceAll('\\', '/'))));
    if (!covered.has(`scripts/${LAUNCHER_NAME}`) || !covered.has(normalizePath(relativeScript.replaceAll('\\', '/')))) throw new Error('Helper files are not covered by the installed inventory.');
    return {};
  } catch {
    return deny('This packaged research helper invocation could not be verified. Use one literal PowerShell exec_command calling this module\'s absolute run-research-python.mjs path, --authorization with an absolute policy path matching the session authorizationReference, --script with an inventoried relative Python path, and -- followed by literal arguments. Variables, interpolation, extra commands, foreign paths, and ambiguous invocations are not accepted. Exact data, destination, and spending limits remain enforced inside the Python policy.');
  }
}

async function preTool(context, actorId, input, options) {
  let output = {};
  await updateState(context, async record => {
    if (!record) return record;
    const actor = actorAssignment(record, actorId);
    const tool = input.tool_name;
    if (actor) {
      if (isSpawn(tool)) output = deny('Research specialists must return work to the principal; they may not delegate.');
      else if ((actor.modelMismatch || actor.roleMismatch) && !knownRead(tool)) output = deny('The research agent model or global role differs from its assignment. This action requires the principal to resolve that mismatch first.');
      else if (actor.readOnly && writingOrExecution(tool)) output = deny('This research role is read-only. Return proposed changes to the principal; shell execution and known writing tools are unavailable to this role.');
      else if ((record.status !== 'active' || actor.status !== 'running') && !knownRead(tool)) output = deny('This research assignment is not running. The principal must explicitly resume or prepare the authorized assignment before operations.');
      else output = (await checkPackagedHelper(input, record, options)) ?? output;
      return record;
    }
    if (record.status !== 'active' || !isSpawn(tool)) return record;
    const selected = assignmentFromInput(record, input);
    if (!selected.entry && !selected.marked) {
      if (typeof input.tool_input?.agent_type === 'string' && /^research-/.test(input.tool_input.agent_type)) { output = deny('This global research role has no matching prepared assignment. Obtain spawn-input from the active principal session.'); return record; }
      for (const entry of Object.values(record.assignments)) if (entry.status === 'spawning') entry.spawnWindowContested = true;
      return record;
    }
    if (!selected.entry) { output = deny('Research spawn refers to an unknown or invalid prepared assignment. Obtain fresh spawn-input from the principal session.'); return record; }
    const entry = selected.entry;
    if (entry.status !== 'prepared' && !(entry.status === 'spawning' && entry.toolUseId === input.tool_use_id)) {
      output = deny('This research assignment has already been dispatched or closed. Prepare a new assignment if authorized.'); return record;
    }
    const expected = spawnInput(entry);
    const supplied = input.tool_input;
    const fields = ['agent_type', 'fork_turns', 'task_name', 'message'];
    const mismatchedFields = fields.filter(field => supplied[field] !== expected[field]);
    const unknownFieldCount = Object.keys(supplied).filter(field => !fields.includes(field)).length;
    const sameMessageAfterNormalizingLineEndings = typeof supplied.message === 'string' && supplied.message.replaceAll('\r\n', '\n') === expected.message.replaceAll('\r\n', '\n');
    // The native collaboration transport can expose an opaque message. Its
    // format is not proof of authenticity and its contents are not verified.
    // Preserve it for the client's decoder; match the prepared task and all
    // other creation arguments, and supply the task at SubagentStart when bound.
    const opaqueNativeMessage = input.tool_name === 'collaborationspawn_agent' && !selected.marked && typeof supplied.message === 'string' && supplied.message.length >= 80 && supplied.message.length <= MAX_BYTES && /^gAAAA[A-Za-z0-9_-]+={0,2}$/.test(supplied.message);
    if (mismatchedFields.some(field => field !== 'message') || unknownFieldCount || (mismatchedFields.includes('message') && !sameMessageAfterNormalizingLineEndings && !opaqueNativeMessage)) {
      // Report comparisons only. Never record supplied instructions, unknown key
      // names, ciphertext, credentials, or excerpts from the research material.
      entry.spawnValidationFailure = {
        mismatchedFields,
        unknownFieldCount,
        hasAssignmentMarker: selected.marked,
        messageMatchesAfterNormalizingLineEndings: sameMessageAfterNormalizingLineEndings,
      };
      output = deny(`Research spawn differs from its prepared assignment. Validation: ${JSON.stringify(entry.spawnValidationFailure)}. Use spawn-input without alterations.`); return record;
    }
    if (typeof input.tool_use_id !== 'string' || !input.tool_use_id.trim()) { output = deny('Research spawn cannot be correlated without a tool-use identifier.'); return record; }
    try {
      const integrity = await verifyResearchPackageIntegrity(options.pluginRoot);
      entry.packageIntegrity = integrity;
      if (integrity.status === 'not-installed') output = note('Research source checkout has no installed package integrity inventory (not-installed). Installed package integrity has not been verified; do not represent this development execution as an integrity-verified installation.');
    } catch {
      entry.packageIntegrity = { status: 'failed', verifiedFiles: 0 };
      output = deny('Research module integrity verification failed. The prepared research agent cannot be dispatched from this package.');
      return record;
    }
    entry.instructionVerification = opaqueNativeMessage ? 'opaque-native-message-not-compared' : 'prepared-message-matched-after-normalizing-line-endings';
    if (entry.status === 'spawning') return record;
    entry.status = 'spawning';
    entry.toolUseId = input.tool_use_id;
    entry.spawnWindowContested = false;
    entry.startCandidates = [];
    return record;
  });
  return output;
}

function operationSummary(input) {
  if (!OBSERVED_TOOLS.has(input.tool_name) || !SAFE_TOOL_IDENTIFIER.test(input.tool_name)) return null;
  if (typeof input.tool_use_id !== 'string' || !SAFE_TOOL_IDENTIFIER.test(input.tool_use_id)) return null;
  const response = input.tool_response;
  const observedError = !!response && typeof response === 'object' && !Array.isArray(response) && (response.isError === true || (response.error !== undefined && response.error !== null && response.error !== false) || (Number.isInteger(response.exit_code) && response.exit_code !== 0));
  return { toolName: input.tool_name, toolUseId: input.tool_use_id, time: new Date().toISOString(), status: observedError ? 'observed-error' : 'success-or-unknown' };
}

async function postTool(context, actorId, input) {
  if (!isSpawn(input.tool_name)) {
    const summary = operationSummary(input);
    if (!summary || !actorId) return {};
    await updateState(context, record => {
      if (record?.status !== 'active') return record;
      const actor = actorAssignment(record, actorId);
      if (!actor) return record;
      const previous = actor.operations ?? [];
      if (!previous.some(item => item.toolUseId === summary.toolUseId && item.toolName === summary.toolName)) actor.operations = [...previous, summary].slice(-100);
      return record;
    });
    return {};
  }
  const identity = responseIdentity(input.tool_response);
  let output = {};
  let bind;
  await updateState(context, record => {
    if (record?.status !== 'active') return record;
    const entry = Object.values(record.assignments).find(item => item.status === 'spawning' && item.toolUseId === input.tool_use_id);
    if (!entry) return record;
    if (identity.failed) {
      entry.status = 'blocked';
      entry.diagnostic = 'The prepared spawn failed. No agent was accepted as its result.';
      delete entry.startCandidates;
      output = note(entry.diagnostic);
      return record;
    }
    if (identity.taskName && !taskNamesMatch(entry.taskName, identity.taskName)) {
      entry.status = 'blocked';
      entry.diagnostic = 'The returned task name does not match the prepared research assignment.';
      output = note(entry.diagnostic);
      return record;
    }
    const candidates = entry.startCandidates ?? [];
    let candidate = identity.agentId ? candidates.find(item => item.agentId === identity.agentId) : undefined;
    if (!identity.agentId && identity.taskName && !entry.spawnWindowContested && candidates.length === 1) candidate = candidates[0];
    const agentId = identity.agentId ?? candidate?.agentId;
    if (agentId) {
      if (Object.values(record.assignments).some(item => item.id !== entry.id && item.agentId === agentId)) {
        entry.status = 'blocked';
        entry.diagnostic = 'The returned agent is already bound to another research assignment.';
        output = note(entry.diagnostic);
        return record;
      }
      entry.agentId = agentId;
      entry.status = 'running';
      if (candidate) observeModel(entry, candidate.model);
      observeModel(entry, identity.model);
      observeAgentType(entry, identity.agentType);
      if (!entry.modelMismatch && !entry.roleMismatch) delete entry.diagnostic;
      bind = agentId;
      delete entry.startCandidates;
      output = entry.modelMismatch || entry.roleMismatch ? note(entry.diagnostic) : {};
    } else {
      entry.returnedTaskName = identity.taskName;
      entry.spawnReturned = true;
      entry.diagnostic = 'Research spawn is awaiting an unambiguous agent identifier. No unknown global agent has been claimed; do not begin sensitive actions before identification.';
      output = note(entry.diagnostic);
    }
    return record;
  });
  if (bind) await writeAgentLink(context, bind);
  return output;
}

async function subagentStart(context, input) {
  if (typeof input.agent_id !== 'string' || !input.agent_id.trim()) return {};
  let output = {};
  let bind;
  await updateState(context, record => {
    if (record?.status !== 'active') return record;
    let entry = actorAssignment(record, input.agent_id);
    if (!entry) {
      const pending = Object.values(record.assignments).filter(item => item.status === 'spawning');
      if (pending.length !== 1 || input.agent_type !== pending[0].roleId) return record;
      const item = pending[0];
      if (typeof input.task_name === 'string' && !taskNamesMatch(item.taskName, input.task_name)) { item.spawnWindowContested = true; return record; }
      if (item.spawnReturned && !item.spawnWindowContested && taskNamesMatch(item.taskName, item.returnedTaskName)) {
        item.agentId = input.agent_id;
        item.status = 'running';
        entry = item;
        bind = input.agent_id;
      } else {
        const candidates = item.startCandidates ?? [];
        if (!candidates.some(candidate => candidate.agentId === input.agent_id) && candidates.length < 8) candidates.push({ agentId: input.agent_id, ...(typeof input.model === 'string' ? { model: input.model } : {}) });
        item.startCandidates = candidates;
        return record;
      }
    }
    observeModel(entry, input.model);
    observeAgentType(entry, input.agent_type);
    if (!entry.modelMismatch && !entry.roleMismatch) delete entry.diagnostic;
    output = { hookSpecificOutput: { hookEventName: 'SubagentStart', additionalContext: [
      `Research assignment ${entry.id}, role ${entry.roleId}, parent session ${context.sessionId}.`,
      `Prepared task for this assignment: ${entry.task}`,
      'Return evidence to the principal. Do not write research session records or spawn other agents. Hooks verify recorded structure and known tool patterns; they do not certify scientific validity or provide a complete security sandbox.',
      entry.readOnly ? 'This role is read-only. Return proposed edits; do not execute writing tools or shell commands.' : 'Current platform permissions and the referenced human authorization remain in force.',
      entry.modelMismatch || entry.roleMismatch ? entry.diagnostic : `Configured model: ${entry.model}. Reasoning effort is configured as ${entry.reasoning} in the global agent definition; hooks do not independently observe the executed effort.`,
    ].join('\n') } };
    return record;
  });
  if (bind) await writeAgentLink(context, bind);
  return output;
}

async function stop(context, actorId, input) {
  let output = {};
  await updateState(context, record => {
    if (record?.status !== 'active') return record;
    if (input.hook_event_name === 'SubagentStop' || actorId) {
      const entry = actorAssignment(record, actorId ?? input.agent_id);
      if (entry) {
        entry.stoppedAt = new Date().toISOString();
        output = note('The research specialist may stop. The principal records its evidence; this hook does not require specialist writes or another turn.');
      }
      return record;
    }
    const missing = !record.principal.evidence || Object.values(record.assignments).some(entry => !entry.evidence);
    const limited = record.principal.evidence && record.principal.evidence.status !== 'completed';
    if (missing && !limited && !record.principal.continuationRequested && input.stop_hook_active !== true) {
      record.principal.continuationRequested = true;
      output = { decision: 'block', reason: 'The registered research assignment lacks evidence. The principal should make one focused pass to record the actual result or limitation for itself and each assigned role. Do not repeat completed research, expand sources, or ask specialists to write session state. This hook requests at most one continuation.' };
      return record;
    }
    record.status = 'completed';
    const limitations = Object.values(record.assignments).filter(entry => entry.modelMismatch || entry.roleMismatch || (entry.evidence && (entry.evidence.status !== 'completed' || entry.evidence.checks.some(check => check.result !== 'passed')))).length;
    output = note([
      missing ? 'Research closed with missing evidence. Report that limitation; the hook does not request another continuation.' : 'Research evidence records are present. Their presence does not certify scientific correctness, source validity, or successful independent evaluation.',
      limitations ? `${limitations} specialist record(s) report a model mismatch, incomplete work, or checks that did not pass. The principal must explain their effect on the requested conclusions.` : '',
    ].filter(Boolean).join(' '));
    return record;
  });
  return output;
}

async function runResearchHookUnchecked(input, options = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid hook input.');
  if (!EVENTS.has(input.hook_event_name)) return {};
  const { context, actorId, owned } = await resolveHookContext(input, options);
  const record = await readState(context);
  if (!record) { if (owned) throw new Error('Registered research identity has no state.'); return {}; }
  if (input.hook_event_name === 'PreToolUse') return preTool(context, actorId, input, options);
  if (record.status !== 'active') return {};
  if (input.hook_event_name === 'Interrupt' || input.hook_event_name === 'SessionEnd') {
    await updateState(context, current => {
      if (current?.status !== 'active') return current;
      if (actorId) {
        const entry = actorAssignment(current, actorId);
        if (entry) entry.status = 'interrupted';
      } else {
        current.status = input.hook_event_name === 'Interrupt' ? 'interrupted' : 'ended';
        for (const entry of Object.values(current.assignments)) if (['prepared', 'spawning', 'running'].includes(entry.status)) entry.status = 'interrupted';
      }
      return current;
    });
    return {};
  }
  if (input.hook_event_name === 'PreToolUse') return preTool(context, actorId, input, options);
  if (input.hook_event_name === 'PostToolUse') return postTool(context, actorId, input);
  if (input.hook_event_name === 'SubagentStart') return subagentStart(context, input);
  return stop(context, actorId, input);
}

export async function runResearchHook(input, options = {}) {
 try {return await runResearchHookUnchecked(input,options);}
 catch(error){
  let owned=error.rosterOwned===true;
  if(!owned){try{owned=(await resolveHookContext(input,options)).owned===true;}catch(e){owned=e.rosterOwned===true;}}
  const marked=input?.hook_event_name==='PreToolUse' && isSpawn(input.tool_name) && (JSON.stringify(input.tool_input??{}).includes(MARKER)||/^research-/.test(input.tool_input?.agent_type??''));
  process.stderr.write('Research state verification failed; no source material or credentials were logged.\n');
  return input?.hook_event_name==='PreToolUse' && (owned||marked) ? deny('The registered research assignment could not be verified. Recover its state before continuing.') : owned ? note('Research state verification was unavailable; retain the assignment restrictions.') : {};
 }
}

async function readInput() {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of process.stdin) {
    bytes += chunk.length;
    if (bytes > MAX_BYTES) throw new Error('Hook input exceeds size limit.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let input;
  try { input = await readInput(); process.stdout.write(`${JSON.stringify(await runResearchHook(input))}\n`); }
  catch {
    // Invalid lifecycle storage must not trap an interrupted turn. A marked research
    // spawn cannot proceed when its prepared assignment cannot be verified.
    const researchSpawn = input?.hook_event_name === 'PreToolUse' && isSpawn(input.tool_name) && (JSON.stringify(input.tool_input ?? {}).includes(MARKER) || /^research-/.test(input.tool_input?.agent_type ?? ''));
    process.stderr.write('Research hook could not verify its registered state. No input, credentials, or source material were logged.\n');
    process.stdout.write(`${JSON.stringify(researchSpawn ? deny('The prepared research assignment could not be verified; this research spawn is denied.') : note('Research hook verification was unavailable. Do not claim that model, evidence, or tool restrictions were enforced.'))}\n`);
  }
}
