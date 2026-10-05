import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { mkdir, open, readFile, realpath, rename, unlink } from 'node:fs/promises';
import { setTimeout as pause } from 'node:timers/promises';
import * as development from '../development/product-session.mjs';
import { runProductHook } from '../development/product-hooks.mjs';
import * as research from '../research-specialists/scripts/research-session.mjs';
import { runResearchHook } from '../research-specialists/scripts/research-hooks.mjs';
import * as communication from '../independent-specialists/assignment.mjs';
import { runSpecialistHook } from '../independent-specialists/hooks.mjs';
import * as consulting from '../consulting-specialist/assignment.mjs';
import { runConsultingHook } from '../consulting-specialist/hooks.mjs';

export const runtimeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const stateRoot = path.resolve(runtimeRoot, '..', 'state');
const identifier = /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,255}$/;
export const rosters = ['development', 'research', 'communication', 'consulting'];
export const modules = { development, research, communication, consulting };
const handlers = { development: runProductHook, research: runResearchHook, communication: runSpecialistHook, consulting: runConsultingHook };

let roleNames;
async function knownRoleNames() {
  if (!roleNames) {
    const product = JSON.parse(await readFile(path.join(runtimeRoot, 'development', 'product-roles.json'), 'utf8'));
    const scientific = JSON.parse(await readFile(path.join(runtimeRoot, 'research-specialists', 'research-roster.json'), 'utf8'));
    if (!product.agents || !Array.isArray(scientific.specialists)) throw new Error('Invalid installed roster identity catalog.');
    const ids = [...Object.keys(product.agents), ...scientific.specialists.map(role => role.id), ...communication.ROLES, ...consulting.ROLES];
    if (ids.some(id => typeof id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) || new Set(ids).size !== ids.length) throw new Error('Invalid or ambiguous installed specialist roles.');
    roleNames = new Map(ids.map(id => [`agent-forge-copilot-${id}`, id]));
  }
  return roleNames;
}

export async function fromCopilotAgentName(name) {
  // Exact catalog lookup deliberately ignores unprefixed legacy agents. A name
  // is a role selector only; instance IDs are always preserved independently.
  return (await knownRoleNames()).get(name);
}

export async function toCopilotAgentName(role) {
  const name = `agent-forge-copilot-${role}`;
  if ((await knownRoleNames()).get(name) !== role) throw new Error('Role is not present in the installed Copilot rosters.');
  return name;
}

export function optionsFor(roster, sessionId) {
  if (!rosters.includes(roster)) throw new Error('Unknown roster.');
  // These compatibility aliases exist only in this process. They never address
  // the user's Codex profile or borrow its session identity.
  const environment = { ...process.env, CODEX_HOME: runtimeRoot, CODEX_THREAD_ID: sessionId,
    COPILOT_SESSION_ID: sessionId, AGENT_FORGE_SESSION_ROOT: path.join(stateRoot, 'development') };
  if (roster === 'development') return { environment, sessionRoot: environment.AGENT_FORGE_SESSION_ROOT,
    rolesPath: path.join(runtimeRoot, 'development', 'product-roles.json') };
  if (roster === 'research') return { environment, pluginRoot: path.join(runtimeRoot, 'research-specialists'), dataRoot: path.join(stateRoot, 'research') };
  return { environment, packageRoot: path.join(runtimeRoot, roster === 'communication' ? 'independent-specialists' : 'consulting-specialist'), dataRoot: path.join(stateRoot, roster) };
}

export async function identity(sessionId, project) {
  if (typeof sessionId !== 'string' || !identifier.test(sessionId)) throw new Error('A real session identifier is required.');
  if (typeof project !== 'string' || !path.isAbsolute(project)) throw new Error('An absolute project is required.');
  const canonical = await realpath(project);
  const normalized = process.platform === 'win32' ? canonical.toLowerCase() : canonical;
  const key = createHash('sha256').update(JSON.stringify([sessionId, normalized])).digest('hex');
  return { sessionId, project: canonical, key, receiptPath: path.join(stateRoot, 'observations', `${key}.json`) };
}

export async function readObservation(context) {
  try {
    const record = JSON.parse(await readFile(context.receiptPath, 'utf8'));
    if (record.version !== 1 || record.sessionId !== context.sessionId || record.project !== context.project || !record.agents || typeof record.agents !== 'object' || Array.isArray(record.agents)) throw new Error('Invalid observed session.');
    return record;
  } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

export async function updateObservation(context, update) {
  await mkdir(path.dirname(context.receiptPath), { recursive: true });
  const lockPath = `${context.receiptPath}.lock`;
  const deadline = Date.now() + 1000;
  let lock;
  while (!lock) {
    try { lock = await open(lockPath, 'wx', 0o600); }
    catch (error) {
      if (error.code !== 'EEXIST' || Date.now() >= deadline) throw error;
      await pause(25);
    }
  }
  const temporary = `${context.receiptPath}.${process.pid}.tmp`;
  try {
    await lock.writeFile(JSON.stringify({ processId: process.pid }));
    const previous = await readObservation(context);
    const next = await update(previous);
    if (!next) return previous;
    const output = await open(temporary, 'wx', 0o600);
    try { await output.writeFile(JSON.stringify(next, null, 2) + '\n'); await output.sync(); } finally { await output.close(); }
    await rename(temporary, context.receiptPath);
    return next;
  } finally { await lock.close(); await unlink(lockPath); }
}

export async function observe(input, harness) {
  const context = await identity(input.session_id, input.cwd);
  await updateObservation(context, previous => {
    const record = previous ?? { version: 1, sessionId: context.sessionId, project: context.project, harness, status: 'observed', agents: {}, continuationRequested: false };
    record.harness = harness;
    record.lastEvent = input.hook_event_name;
    if (input.agent_id && identifier.test(input.agent_id) && input.agent_type && identifier.test(input.agent_type)) {
      if (Object.keys(record.agents).length >= 256 && !Object.hasOwn(record.agents, input.agent_id)) throw new Error('Observed identity limit reached.');
      const existing = Object.hasOwn(record.agents, input.agent_id) ? record.agents[input.agent_id] : null;
      if (existing && existing.role !== input.agent_type) throw new Error('Observed identity changed roles.');
      Object.defineProperty(record.agents, input.agent_id, { value: { role: input.agent_type, event: input.hook_event_name }, enumerable: true, writable: true, configurable: true });
    }
    if (input.hook_event_name === 'SessionEnd') record.status = 'ended';
    return record;
  });
  return context;
}

export async function stateFor(roster, input) {
  const mod = modules[roster], options = optionsFor(roster, input.session_id);
  if (roster === 'development') {
    const context = await mod.createSessionContext({ sessionId: input.session_id, project: input.cwd, ...options });
    return { context, record: await mod.readSession(context), options };
  }
  const context = roster === 'research'
    ? await mod.sessionContext({ sessionId: input.session_id, project: input.cwd, ...options })
    : await mod.sessionContext(input.session_id, input.cwd, options);
  return { context, record: await mod.readState(context), options };
}

export async function runRoster(roster, input) {
  if (['PreToolUse', 'PostToolUse'].includes(input.hook_event_name)) {
    // Source handlers resolve their own registered identity links and retain
    // their ownership-aware failure policy, including nested project checks.
    return handlers[roster](input, optionsFor(roster, input.session_id));
  }
  const { record, options } = await stateFor(roster, input);
  if (!record) return {};
  if (input.hook_event_name === 'SubagentStart') {
    if (!input.agent_id || !input.agent_type) return {};
    if (roster === 'communication' || roster === 'consulting') {
      const pending = record.assignments?.[`pending-${input.agent_type}`];
      const existing = Object.values(record.assignments ?? {}).find(item => item.agentId === input.agent_id);
      // The source handlers support auto-start; the Copilot adapter requires a
      // prepared human-authorized assignment instead.
      if (!existing && pending?.status !== 'prepared') return {};
    }
  }
  if (roster === 'development' && input.hook_event_name.startsWith('Subagent') && (!input.agent_id || !input.agent_type)) return {};
  return handlers[roster](input, options);
}

export async function readInput() {
  const chunks = []; let bytes = 0;
  for await (const chunk of process.stdin) {
    bytes += chunk.length;
    if (bytes > 1024 * 1024) throw new Error('Hook input exceeds limit.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
