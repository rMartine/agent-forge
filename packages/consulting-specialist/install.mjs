import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, readdir, lstat, unlink, rename } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const sourceRoot = path.dirname(fileURLToPath(import.meta.url));
const command = process.argv[2] ?? 'preview';
const option = name => { const index = process.argv.indexOf(name); return index < 0 ? undefined : process.argv[index + 1]; };
const profile = process.env.USERPROFILE || os.homedir();
const codexHome = path.resolve(option('--codex-home') || process.env.CODEX_HOME || path.join(profile, '.codex'));
const stateHome = path.resolve(option('--state-home') || path.join(profile, '.agent-forge-consulting-specialist'));
const runtimeRoot = path.join(codexHome, 'consulting-specialist');
const statePath = path.join(stateHome, 'state.json');
const hooksPath = path.join(codexHome, 'hooks.json');
const digest = value => createHash('sha256').update(value).digest('hex');
const canonical = value => Array.isArray(value) ? `[${value.map(canonical).join(',')}]` : value && typeof value === 'object' ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}` : JSON.stringify(value);
const json = value => JSON.stringify(value, null, 2) + '\n';
const read = async file => { try { return await readFile(file); } catch (error) { if (error.code === 'ENOENT') return null; throw error; } };
const hashAt = async file => { const bytes = await read(file); return bytes === null ? null : digest(bytes); };
const same = (a, b) => canonical(a) === canonical(b);
const manifest = JSON.parse(await readFile(path.join(sourceRoot, 'manifest.json'), 'utf8'));
if (manifest.schemaVersion !== 1 || manifest.packageName !== 'consulting-specialist') throw new Error('Manifiesto incompatible');
const allowedEvents = ['SubagentStart', 'PreToolUse', 'PostToolUse', 'SubagentStop', 'Stop', 'Interrupt', 'SessionEnd'];
const hookDescriptions = {
  SubagentStart: 'Consultoría: preparar el contexto del cliente y proyecto',
  PreToolUse: 'Consultoría: comprobar los límites explícitos del encargo',
  PostToolUse: 'Consultoría: registrar el resultado observable de la herramienta',
  SubagentStop: 'Consultoría: revisar entregables y pendientes registrados',
  Stop: 'Consultoría: cerrar la asignación y comunicar pendientes',
  Interrupt: 'Consultoría: suspender la asignación interrumpida',
  SessionEnd: 'Consultoría: cerrar el contexto operativo de la sesión'
};

async function assertRegularPath(file) {
  let current = path.resolve(file);
  while (true) {
    try { if ((await lstat(current)).isSymbolicLink()) throw new Error(`Se conserva enlace o punto de redirección: ${current}`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
}
function assertOwnedTarget(file) {
  const roots = [path.join(codexHome, 'agents'), path.join(codexHome, 'skills'), runtimeRoot];
  if (!roots.some(root => file.startsWith(root + path.sep))) throw new Error(`Destino fuera de los directorios administrados: ${file}`);
}
async function enumerate(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const item of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const file = path.join(directory, item.name);
    if (item.isSymbolicLink()) throw new Error(`No se distribuyen enlaces: ${file}`);
    if (item.isDirectory()) files.push(...await enumerate(file));
    else if (item.isFile()) files.push(file);
  }
  return files;
}
function parseHooks(bytes) {
  const document = bytes ? JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, '')) : {};
  if (!document || Array.isArray(document) || typeof document !== 'object' || (document.hooks && (typeof document.hooks !== 'object' || Array.isArray(document.hooks)))) throw new Error('hooks.json incompatible; no se modificó');
  for (const entries of Object.values(document.hooks || {})) if (!Array.isArray(entries)) throw new Error('Grupo de hooks incompatible; no se modificó');
  return document;
}
function replaceGroups(document, oldGroups, newGroups) {
  const next = structuredClone(document);
  next.hooks ??= {};
  for (const { event, group } of oldGroups) {
    const matches = (next.hooks[event] || []).filter(existing => same(existing, group));
    if (matches.length !== 1) throw new Error(`Un grupo propio de ${event} fue modificado o eliminado; se conserva hooks.json`);
    next.hooks[event] = next.hooks[event].filter(existing => !same(existing, group));
    if (!next.hooks[event].length) delete next.hooks[event];
  }
  for (const { event, group } of newGroups) {
    if ((next.hooks[event] || []).some(existing => same(existing, group))) throw new Error(`Colisión con grupo no administrado: ${event}`);
    (next.hooks[event] ??= []).push(group);
  }
  return next;
}
function desiredGroups() {
  const script = path.join(runtimeRoot, 'hooks.mjs').replaceAll('\\', '/');
  const executable = process.execPath.replaceAll('\\', '/');
  const matcher = `^(${manifest.agents.map(agent => agent.name).join('|')})$`;
  return allowedEvents.map(event => ({ event, group: {
    ...(['SubagentStart', 'SubagentStop'].includes(event) ? { matcher } : {}),
    hooks: [{ type: 'command', command: `"${executable}" "${script}"`, commandWindows: `node "${script}"`, timeout: ['Interrupt', 'SessionEnd'].includes(event) ? 3 : 10, statusMessage: hookDescriptions[event] }]
  } }));
}
async function desiredFiles() {
  const result = [];
  async function add(target, bytes) {
    assertOwnedTarget(target);
    result.push({ path: target, sha256: digest(bytes), content: bytes.toString('base64') });
  }
  for (const agent of manifest.agents) {
    if (!/^[a-z][a-z0-9-]+$/.test(agent.name)) throw new Error('Nombre de agente inválido');
    const bytes = await readFile(path.join(sourceRoot, 'agents', `${agent.name}.toml`));
    await add(path.join(codexHome, 'agents', `${agent.name}.toml`), bytes);
    for (const skill of agent.skills) if (!await read(path.join(sourceRoot, 'skills', skill, 'SKILL.md'))) throw new Error(`Falta skill: ${skill}`);
  }
  for (const file of await enumerate(path.join(sourceRoot, 'skills'))) await add(path.join(codexHome, 'skills', path.relative(path.join(sourceRoot, 'skills'), file)), await readFile(file));
  for (const name of ['hooks.mjs', 'assignment.mjs', 'context.mjs', 'sources.json', 'README.md']) await add(path.join(runtimeRoot, name), await readFile(path.join(sourceRoot, name)));
  await add(path.join(runtimeRoot, 'manifest.json'), Buffer.from(json({ ...manifest, skillDirectory: path.join(codexHome, 'skills'), stateDirectory: stateHome })));
  const unique = new Set(result.map(file => file.path));
  if (unique.size !== result.length) throw new Error('Destinos duplicados');
  return result;
}
async function loadState() {
  const bytes = await read(statePath);
  if (!bytes) return null;
  const state = JSON.parse(bytes.toString('utf8'));
  if (state.packageName !== manifest.packageName || state.schemaVersion !== 1 || state.codexHome !== codexHome || state.stateHome !== stateHome) throw new Error('Registro de instalación incompatible');
  for (const file of [...state.current.files, ...(state.previous?.files || [])]) {
    assertOwnedTarget(file.path);
    if (digest(Buffer.from(file.content, 'base64')) !== file.sha256) throw new Error('Contenido del registro alterado');
  }
  return state;
}
async function assertCurrentFiles(state) {
  for (const file of state?.current.files || []) {
    await assertRegularPath(file.path);
    if (await hashAt(file.path) !== file.sha256) throw new Error(`Se conserva archivo administrado modificado o ausente: ${file.path}`);
  }
}
async function inventory() {
  const records = [];
  for (const name of ['config.toml', 'AGENTS.md']) { const file = path.join(codexHome, name); records.push({ path: file, sha256: await hashAt(file) }); }
  for (const directory of [path.join(codexHome, 'agents'), path.join(codexHome, 'skills'), path.join(profile, '.agents', 'skills')]) {
    let items; try { items = await readdir(directory, { withFileTypes: true }); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    for (const item of items) {
      const file = item.isFile() ? path.join(directory, item.name) : item.isDirectory() ? path.join(directory, item.name, 'SKILL.md') : null;
      if (file && await read(file)) records.push({ path: file, sha256: await hashAt(file) });
    }
  }
  return records;
}
async function plan(operation) {
  await assertRegularPath(statePath); await assertRegularPath(hooksPath);
  const state = await loadState();
  await assertCurrentFiles(state);
  if (operation !== 'install' && !state) throw new Error('No hay instalación propia para revertir o desinstalar');
  const target = operation === 'install' ? { version: manifest.version, files: await desiredFiles(), groups: desiredGroups() } : operation === 'rollback' ? state.previous || { version: null, files: [], groups: [] } : { version: null, files: [], groups: [] };
  const previousFiles = state?.current.files || [];
  const files = [];
  for (const file of target.files) {
    await assertRegularPath(file.path);
    const existing = await read(file.path);
    if (existing && !previousFiles.some(previous => previous.path === file.path)) throw new Error(`Se conserva archivo ajeno: ${file.path}`);
    files.push({ path: file.path, before: existing, after: Buffer.from(file.content, 'base64') });
  }
  for (const file of previousFiles) if (!target.files.some(next => next.path === file.path)) files.push({ path: file.path, before: await read(file.path), after: null });
  const hooksBefore = await read(hooksPath);
  const currentDocument = parseHooks(hooksBefore);
  const nextDocument = replaceGroups(currentDocument, state?.current.groups || [], target.groups);
  const emptyHooks = Object.keys(nextDocument).every(key => key === 'hooks') && Object.keys(nextDocument.hooks).length === 0;
  const createdHooks = state?.createdHooks ?? hooksBefore === null;
  files.push({ path: hooksPath, before: hooksBefore, after: createdHooks && emptyHooks ? null : Buffer.from(json(nextDocument)) });
  const stateBefore = await read(statePath);
  const snapshot = { operation, codexHome, stateHome, sourceVersion: manifest.version, stateHash: stateBefore ? digest(stateBefore) : null, target, files: files.map(file => ({ path: file.path, before: file.before ? digest(file.before) : null, after: file.after ? digest(file.after) : null })) };
  return { state, stateBefore, target, files, currentDocument, createdHooks, fingerprint: digest(canonical(snapshot)) };
}
async function setFile(file, bytes) {
  await assertRegularPath(file);
  if (bytes === null) { try { await unlink(file); } catch (error) { if (error.code !== 'ENOENT') throw error; } return; }
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.consulting-specialist-${process.pid}.tmp`;
  try { await writeFile(temporary, bytes, { flag: 'wx' }); await rename(temporary, file); }
  finally { try { await unlink(temporary); } catch (error) { if (error.code !== 'ENOENT') throw error; } }
}
async function apply(operation, prepared) {
  const changed = prepared.files.filter(file => (file.before ? digest(file.before) : null) !== (file.after ? digest(file.after) : null));
  if (!changed.length && prepared.state) { console.log(json({ operation, changedFiles: 0, alreadyCurrent: true, statePath })); return; }
  const managed = new Set((prepared.state?.current.files || []).map(file => file.path));
  const baseline = (await inventory()).filter(file => !managed.has(file.path));
  const completed = [];
  try {
    for (const file of changed) {
      if (await hashAt(file.path) !== (file.before ? digest(file.before) : null)) throw new Error(`El archivo cambió después de la vista previa: ${file.path}`);
      await setFile(file.path, file.after); completed.push(file);
    }
    const foreignChanges = [];
    for (const item of baseline) if (await hashAt(item.path) !== item.sha256) foreignChanges.push(item.path);
    if (foreignChanges.length) throw new Error('Cambió una configuración ajena durante la instalación; se revierte exclusivamente lo propio');
    const currentHooks = parseHooks(await read(hooksPath));
    const foreignBefore = replaceGroups(prepared.currentDocument, prepared.state?.current.groups || [], []);
    const foreignAfter = replaceGroups(currentHooks, prepared.target.groups, []);
    if (!same(foreignBefore, foreignAfter)) throw new Error('La conservación de los grupos de hooks no coincide');
    const nextState = { schemaVersion: 1, packageName: manifest.packageName, codexHome, stateHome, createdHooks: prepared.createdHooks, installedAt: new Date().toISOString(), current: prepared.target, previous: operation === 'install' ? prepared.state?.current || null : null, preservation: { checkedFiles: baseline.length, foreignFilesChanged: 0, foreignHookGroupsPreserved: true } };
    if (await hashAt(statePath) !== (prepared.stateBefore ? digest(prepared.stateBefore) : null)) throw new Error('El registro cambió durante la operación');
    await setFile(statePath, Buffer.from(json(nextState)));
    console.log(json({ operation, changedFiles: changed.length, agents: prepared.target.files.filter(file => path.dirname(file.path) === path.join(codexHome, 'agents')).length, preservation: nextState.preservation, hooksTrust: 'Consultar hooks/list; la instalación no concede confianza ni modifica aprobaciones.', statePath }));
  } catch (error) {
    const retained = [];
    for (const file of completed.reverse()) {
      if (await hashAt(file.path) === (file.after ? digest(file.after) : null)) await setFile(file.path, file.before);
      else retained.push(file.path);
    }
    if (retained.length) error.message += `; se conservaron modificaciones concurrentes: ${retained.join(', ')}`;
    throw error;
  }
}
async function verify() {
  const state = await loadState();
  if (!state?.current.files.length) throw new Error('No hay agentes instalados por este paquete');
  await assertCurrentFiles(state);
  replaceGroups(parseHooks(await read(hooksPath)), state.current.groups, []);
  if (!same(state.current.groups, desiredGroups())) throw new Error('Los hooks de la fuente y la instalación difieren; prepara una nueva vista previa');
  const desired = await desiredFiles();
  const sourceMatches = same(desired.map(({ path, sha256 }) => ({ path, sha256 })), state.current.files.map(({ path, sha256 }) => ({ path, sha256 })));
  if (!sourceMatches) throw new Error('La fuente y la instalación difieren; prepara una nueva vista previa');
  console.log(json({ verified: true, agents: manifest.agents.map(({ name, model, reasoningEffort }) => ({ name, model, reasoningEffort })), managedFiles: state.current.files.length, hookGroups: state.current.groups.length, preservationAtInstallation: state.preservation, nativeDiscovery: 'Se verifica por separado con el cliente de Codex; esto comprueba archivos y referencias.' }));
}
try {
  if (command === 'verify') await verify();
  else if (['preview', 'install', 'rollback', 'uninstall'].includes(command)) {
    const operation = command === 'preview' ? option('--operation') || 'install' : command;
    if (!['install', 'rollback', 'uninstall'].includes(operation)) throw new Error('Operación inválida');
    const prepared = await plan(operation);
    if (command === 'preview') console.log(json({ operation, fingerprint: prepared.fingerprint, agents: prepared.target.files.filter(file => file.path.endsWith('.toml')).length, managedFiles: prepared.target.files.length, hookGroups: prepared.target.groups.length, codexHome, stateHome, changes: prepared.files.filter(file => (file.before ? digest(file.before) : null) !== (file.after ? digest(file.after) : null)).map(file => ({ path: file.path, action: !file.after ? 'remove-owned' : !file.before ? 'create' : 'update-owned' })) }));
    else {
      if (option('--expected') !== prepared.fingerprint) throw new Error('Se necesita --expected con el fingerprint de una vista previa vigente');
      await apply(operation, prepared);
    }
  } else throw new Error('Usa preview, install, verify, rollback o uninstall');
} catch (error) { console.error(error.message); process.exitCode = 1; }
