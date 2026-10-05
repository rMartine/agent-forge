import {identityFile, resolveRegistered} from './hook-storage.mjs';
import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, open, readFile, realpath, rename, unlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PACKAGE_ROOT = path.dirname(fileURLToPath(import.meta.url));
export const MAX_BYTES = 1024 * 1024;
export const ROLES = new Set(['marketing-and-sales-specialist', 'brand-and-graphic-design-specialist', 'adult-education-specialist', 'audiovisual-production-specialist']);
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,255}$/;
const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const digest = value => createHash('sha256').update(value).digest('hex');
export const now = () => new Date().toISOString();

function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Se requiere un objeto: ${label}.`);
  return value;
}
function onlyKeys(value, keys) {
  if (Object.keys(value).some(key => !keys.includes(key))) throw new Error('El registro contiene campos no admitidos.');
}
function summary(value, label, maximum = 1500) {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum || /[\u0000-\u0008\u000b-\u001f]/.test(value)) throw new Error(`Texto inválido: ${label}.`);
  // This catches common accidental credentials; it cannot classify all private text.
  if (/-----BEGIN .*PRIVATE KEY-----|\b(?:sk-[A-Za-z0-9_-]{20,}|Bearer\s+[A-Za-z0-9._-]{16,})|https?:\/\/\S*[?&](?:token|key|signature|sig|x-amz-signature)=/i.test(value)) throw new Error('No guarde credenciales ni enlaces firmados en las asignaciones.');
  return value;
}
function identifier(value, label) {
  if (typeof value !== 'string' || !IDENTIFIER.test(value) || FORBIDDEN_KEYS.has(value)) throw new Error(`Identificador inválido: ${label}.`);
  return value;
}
function summaries(value, label) {
  if (!Array.isArray(value) || value.length > 40) throw new Error(`Lista inválida: ${label}.`);
  return value.map(item => summary(item, label, 350));
}
function fieldName(value) {
  if (!/^[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*$/.test(value) || value.split('.').some(part => FORBIDDEN_KEYS.has(part))) throw new Error('Campo de herramienta inválido.');
  if (/(?:^|\.)(?:api_?key|password|secret|access_?token|authorization)$/i.test(value)) throw new Error('No almacene campos de credenciales.');
}

function validateToolAuthorization(value) {
  object(value, 'autorización de herramienta');
  onlyKeys(value, ['toolName', 'inputEquals', 'inputHashes', 'inputOrigins', 'inputMaxima']);
  const result = { toolName: identifier(value.toolName, 'herramienta') };
  for (const kind of ['inputEquals', 'inputHashes', 'inputOrigins', 'inputMaxima']) {
    if (value[kind] === undefined) continue;
    object(value[kind], kind);
    if (Object.keys(value[kind]).length > 30) throw new Error('Demasiadas restricciones de herramienta.');
    result[kind] = {};
    for (const [field, expected] of Object.entries(value[kind])) {
      fieldName(field);
      if (kind === 'inputEquals') {
        if (!['string', 'number', 'boolean'].includes(typeof expected) && expected !== null) throw new Error('inputEquals admite valores escalares.');
        if (typeof expected === 'string') summary(expected, 'valor permitido', 350);
        if (typeof expected === 'number' && !Number.isFinite(expected)) throw new Error('Número inválido.');
      } else if (kind === 'inputHashes') {
        if (typeof expected !== 'string' || !/^[a-f0-9]{64}$/.test(expected)) throw new Error('inputHashes requiere SHA-256 de una cadena UTF-8 exacta.');
      } else if (kind === 'inputOrigins') {
        if (!Array.isArray(expected) || !expected.length || expected.length > 20) throw new Error('Orígenes inválidos.');
        for (const origin of expected) {
          const parsed = new URL(origin);
          if (parsed.protocol !== 'https:' || parsed.origin !== origin) throw new Error('Use orígenes HTTPS sin rutas, credenciales ni parámetros.');
        }
      } else if (typeof expected !== 'number' || !Number.isFinite(expected) || expected < 0) throw new Error('inputMaxima requiere números no negativos.');
      result[kind][field] = expected;
    }
  }
  return result;
}

export function validateAssignmentInput(input) {
  object(input, 'encargo');
  onlyKeys(input, ['role', 'objective', 'expectedDeliverables', 'authorizationReference', 'toolAuthorizations']);
  if (!ROLES.has(input.role)) throw new Error('Rol independiente desconocido.');
  const authorizations = input.toolAuthorizations ?? [];
  if (!Array.isArray(authorizations) || authorizations.length > 100) throw new Error('Autorizaciones inválidas.');
  if (authorizations.length && !input.authorizationReference) throw new Error('La autorización externa necesita referencia al encargo humano vigente.');
  return {
    role: input.role,
    objective: summary(input.objective, 'objetivo sin datos sensibles'),
    expectedDeliverables: summaries(input.expectedDeliverables ?? [], 'entregables'),
    authorizationReference: input.authorizationReference === undefined ? null : summary(input.authorizationReference, 'referencia de autorización', 500),
    toolAuthorizations: authorizations.map(validateToolAuthorization),
  };
}

export async function readJson(file) {
  const metadata = await lstat(file);
  if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size > MAX_BYTES) throw new Error('Se requiere un archivo regular de tamaño limitado.');
  return JSON.parse((await readFile(file, 'utf8')).replace(/^\uFEFF/, ''));
}

export async function loadManifest(packageRoot = PACKAGE_ROOT) {
  const manifest = await readJson(path.join(packageRoot, 'manifest.json'));
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.agents)) throw new Error('Manifiesto inválido.');
  for (const role of ROLES) {
    const entries = manifest.agents.filter(agent => agent.name === role);
    if (entries.length !== 1 || !Array.isArray(entries[0].skills)) throw new Error('Falta un perfil único en el manifiesto.');
  }
  if (manifest.externalTools !== undefined && (!Array.isArray(manifest.externalTools) || manifest.externalTools.some(tool => typeof tool !== 'string' || !IDENTIFIER.test(tool)))) throw new Error('Inventario de herramientas inválido.');
  return manifest;
}

export async function sessionContext(sessionId, project, options = {}) {
  identifier(sessionId, 'sesión');
  if (typeof project !== 'string' || !path.isAbsolute(project)) throw new Error('El proyecto requiere una ruta absoluta.');
  const canonical = await realpath(project);
  const environment = options.environment ?? process.env;
  const home = environment.USERPROFILE || os.homedir();
  const manifest = await loadManifest(options.packageRoot);
  const root = path.resolve(options.dataRoot ?? path.join(manifest.stateDirectory ?? path.join(home, '.agent-forge-independent-specialists'), 'sessions'));
  const normalized = process.platform === 'win32' ? canonical.toLowerCase() : canonical;
  const key = digest(JSON.stringify([sessionId, normalized]));
  return { sessionId, project: canonical, root, recordPath: path.join(root, `${key}.json`), lockPath: path.join(root, `${key}.lock`) };
}

function validateState(record, context) {
  object(record, 'estado');
  if (record.version !== 1 || record.sessionId !== context.sessionId || record.project !== context.project) throw new Error('La identidad del registro no coincide.');
  object(record.assignments, 'asignaciones');
  if (Object.keys(record.assignments).length > 100) throw new Error('Demasiadas asignaciones en la sesión.');
  for (const [key, assignment] of Object.entries(record.assignments)) {
    identifier(key, 'asignación');
    if (!ROLES.has(assignment.role) || !['prepared', 'running', 'returned', 'interrupted', 'ended', 'closed'].includes(assignment.status)) throw new Error('Asignación inválida.');
    if (assignment.agentId) identifier(assignment.agentId, 'agente');
    validateAssignmentInput(Object.fromEntries(['role', 'objective', 'expectedDeliverables', 'authorizationReference', 'toolAuthorizations'].filter(key => assignment[key] !== null).map(key => [key, assignment[key]])));
    summaries(assignment.delivered ?? [], 'entregables registrados');
  }
  return record;
}

export async function readState(context) {
  try { return validateState(await readJson(context.recordPath), context); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

async function atomicJson(file, value) {
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  if (Buffer.byteLength(serialized) > MAX_BYTES) throw new Error('El estado supera el límite de tamaño.');
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    const handle = await open(temporary, 'wx', 0o600);
    try { await handle.writeFile(serialized, 'utf8'); await handle.sync(); }
    finally { await handle.close(); }
    for (let attempt=0;;attempt++) {
      try {await rename(temporary, file);break;}
      catch(error){if(process.platform!=='win32'||!['EPERM','EACCES','EBUSY'].includes(error.code)||attempt>=4)throw error;await new Promise(resolve=>setTimeout(resolve,20*(attempt+1)));}
    }
  } finally { await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
}

export async function updateState(context, callback, create = false) {
  if (!create && !(await readState(context))) return null;
  if (create) await mkdir(context.root, { recursive: true, mode: 0o700 });
  let lock;
  const started = Date.now();
  while (!lock) {
    try { lock = await open(context.lockPath, 'wx', 0o600); }
    catch (error) {
      if (error.code !== 'EEXIST' || Date.now() - started > 800) throw error;
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  }
  try {
    await lock.writeFile(JSON.stringify({processId:process.pid, createdAt:now()}));
    const previous = await readState(context);
    const next = await callback(previous);
    if (next) { next.updatedAt = now(); validateState(next, context); await atomicJson(context.recordPath, next); }
    return next ?? previous;
  } finally { await lock.close(); await unlink(context.lockPath); }
}

function linkFile(context, agentId) {
  identifier(agentId, 'agente');
  const project = process.platform === 'win32' ? context.project.toLowerCase() : context.project;
  return path.join(context.root, `agent-${digest(JSON.stringify([agentId, project]))}.json`);
}
export async function writeAgentLink(context, agentId) {
  const identity = { version: 1, sessionId: context.sessionId, project: context.project, agentId };
  await atomicJson(linkFile(context, agentId), identity);
  await atomicJson(identityFile(context, agentId), identity);
}
export async function resolveHookContext(input, options = {}) {
  return resolveRegistered(input, {makeContext:(sessionId, project)=>sessionContext(sessionId, project, options), readState, readJson});
}

export function findAssignment(record, actorId) {
  return actorId ? Object.values(record?.assignments ?? {}).find(entry => entry.agentId === actorId) : undefined;
}

export async function readStdinJson() {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of process.stdin) {
    bytes += chunk.length;
    if (bytes > MAX_BYTES) throw new Error('Entrada demasiado grande.');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8').replace(/^\uFEFF/, '')); }
  catch { throw new Error('La entrada debe ser JSON válido; no se reproduce su contenido.'); }
}

function status(record) {
  return record ? { sessionId: record.sessionId, assignments: Object.values(record.assignments).map(({ role, agentId, status, expectedDeliverables, delivered, observedModel }) => ({ role, agentId, status, expectedDeliverables, delivered, observedModel })) } : { status: 'unregistered' };
}

export async function runCommand(args, options = {}) {
  const [command, ...rest] = args;
  if (!['open', 'status', 'record', 'close', 'resume'].includes(command)) throw new Error('Use open, status, record, close o resume; --session ID --project RUTA [--agent ID]. open y record leen JSON por stdin.');
  const flags = {};
  for (let i = 0; i < rest.length; i += 2) {
    if (!['--session', '--project', '--agent'].includes(rest[i]) || !rest[i + 1] || flags[rest[i]]) throw new Error('Argumentos inválidos.');
    flags[rest[i]] = rest[i + 1];
  }
  const environment = options.environment ?? process.env;
  const sessionId = flags['--session'] ?? environment.CODEX_THREAD_ID;
  const context = await sessionContext(sessionId, flags['--project'] ?? process.cwd(), options);
  if (command === 'status') return status(await readState(context));
  if (!environment.CODEX_THREAD_ID || environment.CODEX_THREAD_ID !== sessionId) throw new Error('El registro debe modificarse desde la conversación principal correspondiente.');
  const actorId = flags['--agent'];
  if (actorId) identifier(actorId, 'agente');
  if (command === 'open') {
    const input = validateAssignmentInput(options.input ?? await readStdinJson());
    const manifest = await loadManifest(options.packageRoot);
    const role = manifest.agents.find(entry => entry.name === input.role);
    const state = await updateState(context, current => {
      const record = current ?? { version: 1, sessionId, project: context.project, assignments: {}, createdAt: now() };
      const pending = record.assignments[`pending-${input.role}`];
      const existing = actorId ? findAssignment(record, actorId) : pending?.status === 'prepared' ? pending : undefined;
      if (actorId && (!existing || existing.role !== input.role)) throw new Error('El agente no está vinculado a ese rol en esta sesión.');
      if (existing && ['closed', 'ended'].includes(existing.status)) throw new Error('El encargo terminó; prepare un agente nuevo.');
      const key = actorId ?? `pending-${input.role}`;
      record.assignments[key] = { ...existing, ...input, agentId: actorId ?? null, configuredModel: role.model, status: actorId ? 'running' : 'prepared', delivered: existing?.delivered ?? [], operations: existing?.operations ?? [], createdAt: existing?.createdAt ?? now() };
      return record;
    }, true);
    return status(state);
  }
  if (!actorId) throw new Error('Se requiere --agent para record, close o resume.');
  let delivered;
  if (command === 'record') {
    const input = object(options.input ?? await readStdinJson(), 'entrega');
    onlyKeys(input, ['delivered']);
    delivered = summaries(input.delivered, 'nombres de entregables sin contenido');
  }
  const state = await updateState(context, record => {
    const assignment = findAssignment(record, actorId);
    if (!assignment) throw new Error('Asignación desconocida.');
    if (command === 'record') assignment.delivered = delivered;
    if (command === 'close') { assignment.status = 'closed'; assignment.toolAuthorizations = []; }
    if (command === 'resume') {
      if (!['interrupted', 'returned'].includes(assignment.status)) throw new Error('Solo puede reanudar un encargo interrumpido o devuelto.');
      assignment.status = 'running';
    }
    return record;
  });
  if (!state) throw new Error('No existe un registro de esta sesión.');
  return status(state);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.stdout.write(`${JSON.stringify(await runCommand(process.argv.slice(2)), null, 2)}\n`); }
  catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
