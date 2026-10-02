import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, mkdir, open, readFile, realpath, rename, stat, unlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const MAX_JSON_BYTES = 1024 * 1024;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const RECORD_VERSION = 1;
const LOCK_WAIT_MS = 650;

export function validateIdentifier(value, label) {
  if (typeof value !== 'string' || !IDENTIFIER.test(value)) {
    throw new Error(`${label} must contain 1–128 letters, digits, underscores or hyphens and start with a letter or digit.`);
  }
  return value;
}

function text(value, label, maximum = 4000) {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum || value.includes('\0')) {
    throw new Error(`${label} must be nonempty text of at most ${maximum} characters.`);
  }
  return value;
}

function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value;
}

function onlyKeys(value, allowed, label) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new Error(`${label} contains unsupported field ${key}.`);
  }
}

function stringList(value, label, maximum = 40) {
  if (!Array.isArray(value) || value.length > maximum) throw new Error(`${label} must be an array with at most ${maximum} entries.`);
  return value.map(item => text(item, label));
}

export function validateEvidence(input) {
  object(input, 'Evidence');
  onlyKeys(input, ['status', 'summary', 'checks', 'verificationNotRunReason', 'artifacts', 'limitations'], 'Evidence');
  if (!['completed', 'blocked', 'interrupted'].includes(input.status)) throw new Error('Evidence status must be completed, blocked or interrupted.');
  text(input.summary, 'Evidence summary');
  if (!Array.isArray(input.checks) || input.checks.length > 100) throw new Error('Evidence checks must be an array with at most 100 entries.');
  const checks = input.checks.map(check => {
    object(check, 'Check');
    onlyKeys(check, ['name', 'command', 'result', 'details'], 'Check');
    text(check.name, 'Check name', 300);
    if (check.command !== undefined) text(check.command, 'Check command', 2000);
    if (!['passed', 'failed', 'blocked', 'not-run'].includes(check.result)) throw new Error('A check result must be passed, failed, blocked or not-run.');
    text(check.details, 'Check details');
    return { ...check };
  });
  if (checks.length === 0) text(input.verificationNotRunReason, 'Reason no verification was run');
  else if (input.verificationNotRunReason !== undefined) text(input.verificationNotRunReason, 'Reason no verification was run');
  const evidence = { status: input.status, summary: input.summary, checks };
  if (input.verificationNotRunReason !== undefined) evidence.verificationNotRunReason = input.verificationNotRunReason;
  if (input.artifacts !== undefined) evidence.artifacts = stringList(input.artifacts, 'Evidence artifacts');
  if (input.limitations !== undefined) evidence.limitations = stringList(input.limitations, 'Evidence limitations');
  return evidence;
}

function normalizedPath(value) {
  return process.platform === 'win32' ? value.toLowerCase() : value;
}

function within(parent, child) {
  const relative = path.relative(normalizedPath(parent), normalizedPath(child));
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

async function resolveProspectivePath(value) {
  try {
    return await realpath(value);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const parent = path.dirname(value);
    if (parent === value) throw error;
    return path.join(await resolveProspectivePath(parent), path.basename(value));
  }
}

export async function createSessionContext({ sessionId, project, sessionRoot, environment = process.env }) {
  validateIdentifier(sessionId, 'Session identifier');
  text(project, 'Project directory', 8192);
  if (!path.isAbsolute(project)) throw new Error('Project directory must be absolute.');
  const canonicalProject = await realpath(project);
  if (!(await stat(canonicalProject)).isDirectory()) throw new Error('Project must be an existing directory.');
  const requestedRoot = sessionRoot ?? environment.AGENT_FORGE_SESSION_ROOT ?? path.join(os.tmpdir(), 'agent-forge-product-sessions');
  if (typeof requestedRoot !== 'string' || !path.isAbsolute(requestedRoot)) throw new Error('Session storage directory must be absolute.');
  const root = await resolveProspectivePath(requestedRoot);
  const profile = environment.USERPROFILE || environment.HOME || os.homedir();
  const protectedDirectories = [canonicalProject, ...['.codex', '.agents', '.copilot'].map(name => path.join(profile, name))];
  if (environment.CODEX_HOME) protectedDirectories.push(environment.CODEX_HOME);
  for (const directory of protectedDirectories) {
    const canonicalDirectory = await resolveProspectivePath(path.resolve(directory));
    if (within(canonicalDirectory, root)) throw new Error('Session storage must be outside the project and assistant configuration directories.');
  }
  const key = createHash('sha256').update(JSON.stringify([sessionId, normalizedPath(canonicalProject)])).digest('hex');
  return { sessionId, project: canonicalProject, root, recordPath: path.join(root, `${key}.json`), lockPath: path.join(root, `${key}.lock`) };
}

async function ensureRegularFile(file) {
  const info = await lstat(file);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error('Session storage contains a nonregular file.');
  if (info.size > MAX_JSON_BYTES) throw new Error('Session record exceeds the supported size.');
}

export async function readJsonFile(file) {
  await ensureRegularFile(file);
  const bytes = await readFile(file);
  if (bytes.length > MAX_JSON_BYTES) throw new Error('JSON file exceeds the supported size.');
  return JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
}

function validateStoredEvidence(entry) {
  if (entry.evidence === undefined) return;
  const { recordedAt, ...evidence } = object(entry.evidence, 'Stored evidence');
  text(recordedAt, 'Evidence timestamp', 40);
  validateEvidence(evidence);
}

function validateRecord(record, context) {
  object(record, 'Session record');
  if (record.version !== RECORD_VERSION || record.sessionId !== context.sessionId || normalizedPath(record.project) !== normalizedPath(context.project)) {
    throw new Error('Session record identity or version does not match.');
  }
  if (!['active', 'inactive', 'interrupted', 'ended'].includes(record.status)) throw new Error('Invalid session status.');
  text(record.objective, 'Product objective', 2000);
  object(record.principal, 'Principal record');
  if (typeof record.principal.continuationRequested !== 'boolean') throw new Error('Invalid principal continuation state.');
  validateStoredEvidence(record.principal);
  object(record.agents, 'Agent records');
  if (Object.keys(record.agents).length > 128) throw new Error('Session has too many agent records.');
  for (const [identifier, agent] of Object.entries(record.agents)) {
    validateIdentifier(identifier, 'Agent identifier');
    object(agent, 'Agent record');
    validateIdentifier(agent.type, 'Agent type');
    if (agent.evidenceWriter !== undefined && !['agent', 'principal'].includes(agent.evidenceWriter)) throw new Error('Invalid agent evidence writer.');
    if (typeof agent.continuationRequested !== 'boolean') throw new Error('Invalid agent continuation state.');
    validateStoredEvidence(agent);
  }
  return record;
}

export async function readSession(context) {
  try {
    return validateRecord(await readJsonFile(context.recordPath), context);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function writeSession(context, record) {
  validateRecord(record, context);
  const content = `${JSON.stringify(record, null, 2)}\n`;
  if (Buffer.byteLength(content) > MAX_JSON_BYTES) throw new Error('Session record exceeds the supported size.');
  const temporaryPath = path.join(context.root, `${path.basename(context.recordPath)}.${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await open(temporaryPath, 'wx', 0o600);
    await handle.writeFile(content, 'utf8');
    await handle.sync();
    await handle.close();
    handle = undefined;
    const renameStarted = Date.now();
    while (true) {
      try {
        await rename(temporaryPath, context.recordPath);
        break;
      } catch (error) {
        const readerStillHasFileOpen = process.platform === 'win32' && ['EPERM', 'EACCES', 'EBUSY'].includes(error.code);
        if (!readerStillHasFileOpen || Date.now() - renameStarted >= 400) throw error;
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
  } finally {
    await handle?.close();
    await unlink(temporaryPath).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
}

export async function updateSession(context, updater, { create = false, lockWaitMs = LOCK_WAIT_MS } = {}) {
  if (!create && !(await readSession(context))) return null;
  if (create) await mkdir(context.root, { recursive: true, mode: 0o700 });
  const started = Date.now();
  let lock;
  while (!lock) {
    try {
      lock = await open(context.lockPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
    } catch (error) {
      // Windows can report a sharing violation while a previous owner's unlink
      // is completing. Retry only for this short, bounded acquisition window.
      const windowsSharingViolation = process.platform === 'win32' && ['EPERM', 'EACCES', 'EBUSY'].includes(error.code);
      if (error.code !== 'EEXIST' && !windowsSharingViolation) throw error;
      if (Date.now() - started >= lockWaitMs) throw new Error('Session record is locked; no update was applied. Inspect a stale lock only after its owning process has ended.');
      await new Promise(resolve => setTimeout(resolve, 15));
    }
  }
  try {
    await lock.writeFile(JSON.stringify({ processId: process.pid, createdAt: new Date().toISOString() }));
    const previous = await readSession(context);
    const result = await updater(previous);
    if (result !== undefined && result !== null) {
      result.updatedAt = new Date().toISOString();
      await writeSession(context, result);
    }
    return result ?? previous;
  } finally {
    await lock.close();
    await unlink(context.lockPath);
  }
}

export async function activateSession(context, objective) {
  text(objective, 'Product objective', 2000);
  return updateSession(context, previous => {
    if (previous?.status === 'active') {
      if (previous.objective !== objective) throw new Error('An active product assignment already exists. Finish or deactivate it before activating a different assignment.');
      return previous;
    }
    return {
      version: RECORD_VERSION, sessionId: context.sessionId, project: context.project,
      objective, status: 'active', createdAt: new Date().toISOString(),
      principal: { continuationRequested: false }, agents: {},
    };
  }, { create: true });
}

export async function recordEvidence(context, evidence, agentId) {
  const validated = validateEvidence(evidence);
  if (agentId !== undefined) validateIdentifier(agentId, 'Agent identifier');
  let recorded = false;
  const result = await updateSession(context, record => {
    if (!record || !['active', 'interrupted'].includes(record.status)) throw new Error('No active or interrupted product assignment is registered.');
    const entry = agentId === undefined ? record.principal : (Object.hasOwn(record.agents, agentId) ? record.agents[agentId] : undefined);
    if (!entry) throw new Error('Agent is not registered in this product session. Use the parent session and agent identifiers supplied by SubagentStart.');
    entry.evidence = { ...validated, recordedAt: new Date().toISOString() };
    recorded = true;
    return record;
  });
  if (!recorded) throw new Error('No product assignment is registered.');
  return result;
}

export async function deactivateSession(context, status = 'inactive') {
  if (!['inactive', 'interrupted', 'ended'].includes(status)) throw new Error('Invalid closing session status.');
  return updateSession(context, record => {
    if (record) record.status = status;
    return record;
  });
}

export async function runSessionCommand(arguments_, environment = process.env) {
  const [command, ...argumentsList] = arguments_;
  const allowed = {
    activate: ['session', 'project', 'objective'], status: ['session', 'project'],
    deactivate: ['session', 'project'], 'record-evidence': ['session', 'project', 'agent', 'file'],
  };
  if (!Object.hasOwn(allowed, command)) throw new Error('Use activate, status, deactivate or record-evidence.');
  const options = Object.create(null);
  for (let index = 0; index < argumentsList.length; index += 2) {
    const option = argumentsList[index];
    const name = option?.startsWith('--') ? option.slice(2) : '';
    const value = argumentsList[index + 1];
    if (!allowed[command].includes(name) || value === undefined || Object.hasOwn(options, name)) throw new Error('Invalid, duplicate or incomplete command option.');
    options[name] = value;
  }
  const context = await createSessionContext({ sessionId: options.session ?? environment.CODEX_THREAD_ID, project: options.project, environment });
  let record;
  if (command === 'activate') record = await activateSession(context, options.objective);
  if (command === 'status') record = await readSession(context);
  if (command === 'deactivate') record = await deactivateSession(context);
  if (command === 'record-evidence') {
    text(options.file, 'Evidence file path', 8192);
    record = await recordEvidence(context, await readJsonFile(path.resolve(options.file)), options.agent);
  }
  return { status: record?.status ?? 'unregistered', recordPath: context.recordPath, record };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.stdout.write(`${JSON.stringify(await runSessionCommand(process.argv.slice(2)))}\n`);
  } catch (error) {
    process.stderr.write(`Agent Forge product session: ${error.message}\n`);
    process.exitCode = 1;
  }
}
