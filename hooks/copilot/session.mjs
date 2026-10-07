import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { identity, readObservation, runRoster, stateFor, modules, optionsFor, rosters, toCopilotAgentName } from './runtime.mjs';

function flag(args, name) {
  const indexes = args.flatMap((value, index) => value === name ? [index] : []);
  if (indexes.length !== 1 || !args[indexes[0] + 1]) throw new Error(`Exactly one ${name} is required.`);
  return args[indexes[0] + 1];
}

async function bind(roster, args, observed, input) {
  const agentId = flag(args, '--agent');
  if (!Object.hasOwn(observed.agents, agentId)) throw new Error('The hook has not observed that real agent ID in this session and project.');
  const role = observed.agents[agentId].role;
  const { context, record } = await stateFor(roster, input);
  if (!record) throw new Error('Prepare the authorized roster assignment first.');
  const mod = modules[roster];
  if (roster === 'development') {
    if (record.status !== 'active') throw new Error('The product assignment is not active.');
    const roles = await mod.readJsonFile(optionsFor(roster, input.session_id).rolesPath);
    if (!Object.hasOwn(roles.agents, role)) throw new Error('Observed role is outside the product roster.');
    // Explicit registration against a host-observed identity. No instance ID is
    // generated and this does not assert that a start event supplied one.
    return { binding: 'explicit-observed-identity', agentId, output: await runRoster(roster, { ...input, hook_event_name: 'SubagentStart', agent_id: agentId, agent_type: role }) };
  }
  if (roster === 'research') {
    const assignmentId = flag(args, '--assignment');
    await mod.updateState(context, current => {
      const entry = current?.assignments?.[assignmentId];
      if (current?.status !== 'active' || !entry || entry.roleId !== role) throw new Error('Observed role does not match the prepared research assignment.');
      if (entry.agentId && entry.agentId !== agentId) throw new Error('Research assignment already has another identity.');
      if (!['prepared', 'spawning', 'running'].includes(entry.status)) throw new Error('Research assignment is closed.');
      if (Object.values(current.assignments).some(item => item.id !== assignmentId && item.agentId === agentId)) throw new Error('Identity already belongs to another research assignment.');
      entry.agentId = agentId; entry.status = 'running'; entry.instructionVerification = 'principal-explicit-binding-to-host-observed-identity';
      return current;
    });
    await mod.writeAgentLink(context, agentId);
    return { binding: 'explicit-observed-identity', agentId, assignmentId };
  }
  await mod.updateState(context, current => {
    if (!current || !mod.ROLES.has(role)) throw new Error('Observed role is outside the selected roster.');
    const existing = mod.findAssignment(current, agentId);
    if (existing) {
      if (existing.role !== role || ['closed', 'ended'].includes(existing.status)) throw new Error('Identity is closed or belongs to another role.');
      return current;
    }
    const key = `pending-${role}`, pending = current.assignments[key];
    if (pending?.status !== 'prepared') throw new Error('No prepared authorized assignment for that role.');
    Object.defineProperty(current.assignments, agentId, { value: { ...pending, agentId, status: 'running' }, enumerable: true, writable: true, configurable: true });
    delete current.assignments[key];
    return current;
  });
  await mod.writeAgentLink(context, agentId);
  return { binding: 'explicit-observed-identity', agentId, role };
}

export async function runSession(args) {
  const [roster, command, ...rest] = args;
  if (!rosters.includes(roster) || !command) throw new Error('Use session.mjs <development|research|communication|consulting> <command> --session REAL_ID --project ABSOLUTE_PATH.');
  const sessionId = flag(rest, '--session'), project = flag(rest, '--project');
  const context = await identity(sessionId, project);
  const observed = await readObservation(context);
  if (!observed) throw new Error('No hook-observed session with this ID and project. Start a Copilot chat with the installed hooks before preparing assignments.');
  if (command === 'observations') {
    if (rest.length !== 4) throw new Error('Observations accept only --session and --project.');
    return { sessionId, project: context.project, harness: observed.harness, status: observed.status,
      agents: Object.entries(observed.agents).map(([agentId, value]) => ({ agentId, role: value.role, lastEvent: value.event })) };
  }
  if (observed.status === 'ended' && !['status', 'end'].includes(command)) throw new Error('The host reported this session ended.');
  const input = { session_id: sessionId, cwd: context.project };
  const options = optionsFor(roster, sessionId), mod = modules[roster];
  if (command === 'bind') {
    const allowed = new Set(['--session', '--project', '--agent', ...(roster === 'research' ? ['--assignment'] : [])]);
    for (let i = 0; i < rest.length; i += 2) if (!allowed.has(rest[i]) || rest[i + 1] === undefined) throw new Error('Invalid binding option.');
    return bind(roster, rest, observed, input);
  }
  if (['suspend', 'end'].includes(command)) {
    if (rest.length !== 4) throw new Error('Lifecycle commands accept only --session and --project.');
    if (command === 'end' && roster === 'research') return mod.runCommand(['end', ...rest], options);
    return runRoster(roster, { ...input, hook_event_name: command === 'suspend' ? 'Interrupt' : 'SessionEnd' });
  }
  if (roster === 'development') return mod.runSessionCommand([command, ...rest], options.environment);
  const result = await mod.runCommand([command, ...rest], options);
  if (roster === 'research' && command === 'spawn-input') {
    // Return native delegation inputs together with the complete original
    // message. Binding is explicit when the client exposes an actual ID.
    return { agentName: await toCopilotAgentName(result.agent_type), prompt: result.message,
      binding: 'After a real instance ID is observed, use research bind --agent ID --assignment ASSIGNMENT with the same --session and --project. Never replace the instance ID with the role name.' };
  }
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.stdout.write(JSON.stringify(await runSession(process.argv.slice(2)), null, 2) + '\n'); }
  catch (error) { process.stderr.write(`Agent Forge Copilot session: ${error.message}\n`); process.exitCode = 1; }
}
