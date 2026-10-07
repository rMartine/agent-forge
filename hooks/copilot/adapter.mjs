import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { observe, updateObservation, runRoster, rosters, runtimeRoot, stateRoot, readInput, fromCopilotAgentName } from './runtime.mjs';

const events = { sessionStart: 'SessionStart', subagentStart: 'SubagentStart', subagentStop: 'SubagentStop', preToolUse: 'PreToolUse', postToolUse: 'PostToolUse', postToolUseFailure: 'PostToolUse', agentStop: 'Stop', sessionEnd: 'SessionEnd' };
const safeIdentifier = /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,255}$/;
const text = value => typeof value === 'string' && value.length ? value : undefined;
const object = value => {
  if (typeof value === 'string') { try { return JSON.parse(value); } catch { return value; } }
  return value;
};

export function normalizeInput(raw, harness, event) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Expected hook JSON object.');
  if (!['copilot', 'local'].includes(harness)) throw new Error('Unknown harness.');
  const eventName = harness === 'copilot' ? events[event] : event;
  if (!Object.values(events).includes(eventName)) throw new Error('Unsupported event.');
  if (harness === 'local' && raw.hook_event_name && raw.hook_event_name !== eventName) throw new Error('Event mismatch.');
  const input = { hook_event_name: eventName, session_id: harness === 'copilot' ? text(raw.sessionId) : text(raw.session_id), cwd: text(raw.cwd) };
  const pairs = harness === 'copilot'
    ? { agent_id: 'agentId', parent_agent_id: 'parentAgentId', root_session_id: 'rootSessionId', assignment_id: 'assignmentId', task_name: 'taskName', agent_type: 'agentName', tool_name: 'toolName', tool_use_id: 'toolUseId', turn_id: 'turnId', model: 'model' }
    : { agent_id: 'agent_id', parent_agent_id: 'parent_agent_id', root_session_id: 'root_session_id', assignment_id: 'assignment_id', task_name: 'task_name', agent_type: 'agent_type', tool_name: 'tool_name', tool_use_id: 'tool_use_id', turn_id: 'turn_id', model: 'model' };
  for (const [target, source] of Object.entries(pairs)) if (text(raw[source])) input[target] = raw[source];
  if (harness === 'copilot' && !input.agent_type && text(raw.agentType)) input.agent_type = raw.agentType;
  // Keep the exact host-supplied name until the installed roster catalog can
  // validate it. Do not strip an arbitrary prefix or turn a role into an ID.
  for (const key of ['agent_id', 'parent_agent_id', 'root_session_id', 'assignment_id', 'agent_type', 'tool_use_id', 'turn_id']) if (input[key] && !safeIdentifier.test(input[key])) throw new Error('Invalid event identifier.');
  const toolInput = harness === 'copilot' ? raw.toolArgs : raw.tool_input;
  if (toolInput !== undefined) input.tool_input = object(toolInput);
  const response = harness === 'copilot' ? raw.toolResult : raw.tool_response;
  if (response !== undefined) input.tool_response = object(response);
  if (event === 'postToolUseFailure') input.tool_response = { isError: true };
  if (typeof raw.stop_hook_active === 'boolean') input.stop_hook_active = raw.stop_hook_active;
  // A cancel explicitly reported as session termination is a termination. A
  // normal Stop is never recast as SessionEnd or Interrupt.
  return input;
}

export function encodeOutput(outputs, harness, event) {
  const contexts = [], notices = [], reasons = [], denials = [];
  for (const output of outputs) {
    if (output.systemMessage) notices.push(portableText(output.systemMessage));
    const specific = output.hookSpecificOutput ?? {};
    if (specific.additionalContext) contexts.push(portableText(specific.additionalContext));
    if (specific.permissionDecision === 'deny') denials.push(portableText(specific.permissionDecisionReason));
    if (output.decision === 'block' && output.reason) reasons.push(portableText(output.reason));
  }
  const result = {};
  if (harness === 'copilot') {
    if (['SessionStart', 'SubagentStart', 'PostToolUse'].includes(event) && [...contexts, ...notices].length) result.additionalContext = [...contexts, ...notices].join('\n');
    if (event === 'PreToolUse' && denials.length) Object.assign(result, { permissionDecision: 'deny', permissionDecisionReason: denials.join('\n') });
    if (['Stop', 'SubagentStop'].includes(event) && reasons.length) Object.assign(result, { decision: 'block', reason: reasons.join('\n') });
    // The Copilot stop/pretool contracts do not consume systemMessage. Keep
    // diagnostics on stderr rather than inventing an ignored output field.
    if (!['SessionStart', 'SubagentStart', 'PostToolUse'].includes(event)) for (const notice of [...notices, ...contexts]) process.stderr.write(`${notice}\n`);
    return result;
  }
  if (notices.length) result.systemMessage = notices.join('\n');
  const specific = {};
  if (contexts.length && ['SessionStart', 'SubagentStart', 'PreToolUse', 'PostToolUse'].includes(event)) specific.additionalContext = contexts.join('\n');
  if (event === 'PreToolUse' && denials.length) Object.assign(specific, { permissionDecision: 'deny', permissionDecisionReason: denials.join('\n') });
  if (reasons.length && event === 'Stop') Object.assign(specific, { decision: 'block', reason: reasons.join('\n') });
  else if (reasons.length && event === 'SubagentStop') Object.assign(result, { decision: 'block', reason: reasons.join('\n') });
  if (Object.keys(specific).length) result.hookSpecificOutput = { hookEventName: event, ...specific };
  return result;
}

function portableText(value) {
  return String(value).replaceAll('CODEX_THREAD_ID', 'COPILOT_SESSION_ID').replaceAll('Codex', 'Copilot')
    .replaceAll('product-session.mjs record-evidence', 'hooks/session.mjs development record-evidence')
    .replace(/\bagent-forge-(?!copilot-)([a-z][a-z0-9-]*)(?= skill|\$|\b)/g, 'agent-forge-copilot-$1');
}

function sessionContext(input) {
  return [
    `Agent Forge Copilot: real parent session ${JSON.stringify(input.session_id)}, project ${JSON.stringify(input.cwd)}.`,
    `Runtime ${JSON.stringify(runtimeRoot)}; isolated records ${JSON.stringify(stateRoot)}.`,
    `For an explicitly assigned roster, use Node ${JSON.stringify(path.join(runtimeRoot, 'hooks', 'session.mjs'))} <development|research|communication|consulting> <command> --session ${JSON.stringify(input.session_id)} --project ${JSON.stringify(input.cwd)}.`,
    'Prepare only the roster assignments actually authorized by the current task. This hook observes identity; it does not open assignments or authorize work.',
    'Use the session helper for evidence, suspension and end; do not execute the original source session scripts directly. Stop completes a turn, not the conversation. Never invent an agent identifier or claim hook coverage when the client omits it.',
  ].join('\n');
}

export async function runAdapter(raw, harness, event) {
  if (harness === 'copilot' && raw?.session_id && !raw.sessionId) {
    return { systemMessage: 'Agent Forge: this hook profile is configured for Copilot Agent Host, but the event uses the Local schema. Select Copilot as the session target or reinstall the one profile with --harness local. No assignment was changed.' };
  }
  const input = normalizeInput(raw, harness, event);
  if (!input.session_id || !input.cwd) return encodeOutput([{ systemMessage: 'Agent Forge coverage unavailable: this event supplies no real session ID or working directory; no assignment was modified.' }], harness, input.hook_event_name);
  if (input.agent_type) {
    const role = await fromCopilotAgentName(input.agent_type);
    if (!role) return {};
    input.agent_type = role;
  }
  const outputs = [];
  if (['PreToolUse', 'PostToolUse'].includes(input.hook_event_name) && !input.agent_id) {
    // Neither a role name, a sole running assignment nor the parent session ID
    // proves which specialist invoked this tool. Do not apply another actor's
    // authorizations or write operations against them.
    outputs.push({ systemMessage: 'Agent Forge tool coverage unavailable: this event has no explicit specialist identity; no specialist authorization or operation was attributed.' });
    return encodeOutput(outputs, harness, input.hook_event_name);
  }
  const context = await observe(input, harness);
  if (input.hook_event_name === 'SessionStart') return encodeOutput([{ hookSpecificOutput: { additionalContext: sessionContext(input) } }], harness, input.hook_event_name);
  if (input.hook_event_name.startsWith('Subagent') && !input.agent_id) {
    outputs.push({ hookSpecificOutput: { additionalContext: `${sessionContext(input)}\nCoverage limitation: the client supplied a role name without an instance ID. No specialist identity, authorization or operation was attributed. Return evidence to the coordinator.` } });
    return encodeOutput(outputs, harness, input.hook_event_name);
  }
  for (const roster of rosters) {
    try { outputs.push(await runRoster(roster, input)); }
    catch {
      const reason = `Agent Forge ${roster}: registered state could not be verified; recover its lock or state without claiming enforcement.`;
      outputs.push(input.hook_event_name === 'PreToolUse'
        ? { hookSpecificOutput: { permissionDecision: 'deny', permissionDecisionReason: reason } }
        : { systemMessage: reason });
    }
  }
  if (['Stop', 'SubagentStop'].includes(input.hook_event_name) && outputs.some(output => output.decision === 'block')) {
    let granted = false;
    await updateObservation(context, previous => {
      if (!previous) throw new Error('Missing observed session.');
      // A single aggregate continuation across all four rosters prevents one
      // roster from asking for another pass after a different roster did so.
      if (!previous.continuationRequested && input.stop_hook_active !== true) { previous.continuationRequested = true; granted = true; }
      return previous;
    });
    if (!granted) for (const output of outputs) if (output.decision === 'block') {
      delete output.decision; delete output.reason;
      output.systemMessage = 'Agent Forge: the one continuation was already used; report remaining missing evidence without repeating work.';
    }
  }
  return encodeOutput(outputs, harness, input.hook_event_name);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [harness, event] = process.argv.slice(2);
  try { process.stdout.write(JSON.stringify(await runAdapter(await readInput(), harness, event)) + '\n'); }
  catch {
    const isPretool = ['preToolUse', 'PreToolUse'].includes(event);
    const reason = 'Agent Forge hook could not verify its input or isolated state. No payload, credentials or source material were logged.';
    process.stderr.write(reason + '\n');
    process.stdout.write(JSON.stringify(encodeOutput(isPretool ? [{ hookSpecificOutput: { permissionDecision: 'deny', permissionDecisionReason: reason } }] : [], harness, isPretool ? 'PreToolUse' : event)) + '\n');
  }
}
