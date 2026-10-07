import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, readdir, lstat, unlink, rename, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { inspectPackage, filesBelow } from '../../../scripts/research-package.mjs';
import { generateResearchDefinitions } from '../../../scripts/research-definitions.mjs';
import { verifyResearchPackageIntegrity } from '../../../scripts/research-integrity.mjs';

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const command = process.argv[2] ?? 'preview';
const option = name => { const index = process.argv.indexOf(name); return index < 0 ? undefined : process.argv[index + 1]; };
// Historical installer fixture: tests must select isolated destinations explicitly.
if (!['--codex-home', '--state-home'].every(name => option(name) && path.isAbsolute(option(name)))) throw new Error('Legacy test fixture requires explicit absolute --codex-home and --state-home. Use the common Agent Forge CLI for installation.');
const allowedOptions = new Set(['--codex-home', '--state-home', '--python', '--data-root', '--expected', '--operation']);
const suppliedOptions = new Set();
for (let index = 3; index < process.argv.length; index += 2) {
  const key = process.argv[index];
  if (!allowedOptions.has(key) || suppliedOptions.has(key) || !process.argv[index + 1] || process.argv[index + 1].startsWith('--')) throw new Error('Opción desconocida, duplicada o sin valor');
  suppliedOptions.add(key);
}
for (const key of ['--codex-home', '--state-home', '--python', '--data-root']) if (option(key) && !path.isAbsolute(option(key))) throw new Error(`La ruta de ${key} debe ser absoluta`);
const profile = process.env.USERPROFILE || os.homedir();
const codexHome = path.resolve(option('--codex-home') || process.env.CODEX_HOME || path.join(profile, '.codex'));
const stateHome = path.resolve(option('--state-home') || path.join(profile, '.agent-forge-research-specialists'));
const runtimeRoot = path.join(codexHome, 'research-specialists');
const statePath = path.join(stateHome, 'state.json');
const hooksPath = path.join(codexHome, 'hooks.json');
const digest = value => createHash('sha256').update(value).digest('hex');
const canonical = value => Array.isArray(value) ? `[${value.map(canonical).join(',')}]` : value && typeof value === 'object' ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}` : JSON.stringify(value);
const json = value => JSON.stringify(value, null, 2) + '\n';
const read = async file => { try { return await readFile(file); } catch (error) { if (error.code === 'ENOENT') return null; throw error; } };
const hashAt = async file => { const bytes = await read(file); return bytes === null ? null : digest(bytes); };
const same = (a, b) => canonical(a) === canonical(b);
const manifest = JSON.parse(await readFile(path.join(sourceRoot, 'manifest.json'), 'utf8'));
if (manifest.schemaVersion !== 1 || manifest.packageName !== 'research-specialists') throw new Error('Manifiesto incompatible');
const roster = JSON.parse(await readFile(path.join(sourceRoot, 'research-roster.json'), 'utf8'));
const allowedEvents = ['SubagentStart', 'PreToolUse', 'PostToolUse', 'SubagentStop', 'Stop', 'Interrupt', 'SessionEnd'];


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
  const agentsRoot = path.join(codexHome, 'agents');
  const skillsRoot = path.join(codexHome, 'skills');
  const agent = path.dirname(file) === agentsRoot && roster.specialists.some(role => path.basename(file) === `${role.id}.toml`);
  const relativeSkill = path.relative(skillsRoot, file).replaceAll('\\', '/');
  const skill = /^agent-forge-research-[a-z0-9-]+\/(?:SKILL\.md|agents\/openai\.yaml)$/.test(relativeSkill);
  if (!agent && !skill && !file.startsWith(runtimeRoot + path.sep)) throw new Error(`Destino fuera de los directorios administrados: ${file}`);
}
function parseHooks(bytes) {
  const document = bytes ? JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, '')) : {};
  if (!document || Array.isArray(document) || typeof document !== 'object' || (document.hooks && (typeof document.hooks !== 'object' || Array.isArray(document.hooks)))) throw new Error('hooks.json incompatible; no se modificó');
  for (const entries of Object.values(document.hooks || {})) if (!Array.isArray(entries)) throw new Error('Grupo de hooks incompatible; no se modificó');
  return document;
}
function replaceGroups(document, oldGroups, newGroups) {
  const next = structuredClone(document); next.hooks ??= {};
  const used = new Set();
  for (const old of oldGroups) {
    const matches = (next.hooks[old.event] || []).filter(group => same(group, old.group));
    if (matches.length !== 1) throw new Error('Un grupo administrado fue modificado, eliminado o duplicado; se conserva hooks.json');
  }
  for (const [event, groups] of Object.entries(next.hooks)) {
    next.hooks[event] = groups.flatMap(group => {
      if (!oldGroups.some(old => old.event === event && same(old.group, group))) return [group];
      const index = newGroups.findIndex((item,i) => !used.has(i) && item.event === event && (item.group.matcher ?? '') === (group.matcher ?? ''));
      if (index < 0) return [];
      used.add(index); return [newGroups[index].group];
    });
    if (!next.hooks[event].length) delete next.hooks[event];
  }
  for (let i=0;i<newGroups.length;i++) {
    const {event,group}=newGroups[i];
    const foreign=(document.hooks?.[event]??[]).filter(g=>!oldGroups.some(old=>old.event===event&&same(old.group,g)));
    if (foreign.some(g=>same(g,group))) throw new Error('Colisión con grupo ajeno');
    if (!used.has(i)) (next.hooks[event]??=[]).push(group);
  }
  return next;
}

async function desiredGroups() {
  const script = path.join(runtimeRoot, 'scripts', 'research-hooks.mjs').replaceAll('\\', '/');
  const executable = process.execPath.replaceAll('\\', '/');
  const document = JSON.parse(await readFile(path.join(sourceRoot, 'hooks', 'hooks.json'), 'utf8'));
  return allowedEvents.map(event => ({ event, group: {
    ...document.hooks[event][0],
    hooks: document.hooks[event][0].hooks.map(hook => ({ ...hook, command: `"${executable}" "${script}"`, commandWindows: `node "${script}"` }))
  } }));
}
async function desiredFiles() {
  const result = [];
  async function add(target, bytes) {
    assertOwnedTarget(target);
    result.push({ path: target, sha256: digest(bytes), content: bytes.toString('base64') });
  }
  await inspectPackage(sourceRoot);
  for (const name of await filesBelow(sourceRoot)) await add(path.join(runtimeRoot, name), await readFile(path.join(sourceRoot, name)));
  const definitions = await generateResearchDefinitions(sourceRoot, runtimeRoot, codexHome);
  for (const definition of definitions) await add(definition.path, definition.bytes);
  const previousRuntime = await read(path.join(runtimeRoot, 'runtime.json'));
  const existingRuntime = previousRuntime ? JSON.parse(previousRuntime.toString('utf8')) : {};
  const pythonExecutable = option('--python') || existingRuntime.pythonExecutable || 'D:/Proyectos/Agent Forge/research-runtime/python312/Scripts/python.exe';
  const sessionDataRoot = option('--data-root') || existingRuntime.sessionDataRoot || path.join(process.env.LOCALAPPDATA || path.join(profile, 'AppData', 'Local'), 'AgentForge', 'research-plugin-data');
  if (!path.isAbsolute(pythonExecutable) || !(await stat(pythonExecutable)).isFile()) throw new Error('Python debe existir en una ruta absoluta; el instalador no crea entornos');
  if (!path.isAbsolute(sessionDataRoot)) throw new Error('Los registros requieren una ruta absoluta');
  const storage = path.resolve(sessionDataRoot);
  const protectedRoots = [sourceRoot, codexHome, stateHome];
  if (protectedRoots.some(root => storage === root || storage.startsWith(root + path.sep))) throw new Error('Los registros deben permanecer fuera de fuentes, instalación y registro del instalador');
  await add(path.join(runtimeRoot, 'runtime.json'), Buffer.from(json({ ...existingRuntime, pythonExecutable: await realpath(pythonExecutable), sessionDataRoot: storage, platform: 'windows', pythonVersion: '3.12' })));
  const inventoryFiles = result.filter(file => file.path.startsWith(runtimeRoot + path.sep)).map(file => ({ path: path.relative(runtimeRoot, file.path).replaceAll('\\', '/'), sha256: file.sha256 })).sort((a, b) => a.path.localeCompare(b.path));
  const generatedDefinitions = definitions.map(definition => ({ kind: definition.kind, name: definition.name, sha256: digest(definition.bytes) }));
  const inventory = { version: 1, packageName: manifest.packageName, files: inventoryFiles, generatedDefinitions, packageHash: digest(JSON.stringify({ files: inventoryFiles, generatedDefinitions })) };
  await add(path.join(runtimeRoot, 'package-integrity.json'), Buffer.from(json(inventory)));
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
  const target = operation === 'install' ? { version: manifest.version, files: await desiredFiles(), groups: await desiredGroups() } : operation === 'rollback' ? state.previous || { version: null, files: [], groups: [] } : { version: null, files: [], groups: [] };
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
  const temporary = `${file}.research-specialists-${process.pid}.tmp`;
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
  if (!same(state.current.groups, await desiredGroups())) throw new Error('Los hooks de la fuente y la instalación difieren; prepara una nueva vista previa');
  const desired = await desiredFiles();
  const sourceMatches = same(desired.map(({ path, sha256 }) => ({ path, sha256 })), state.current.files.map(({ path, sha256 }) => ({ path, sha256 })));
  if (!sourceMatches) throw new Error('La fuente y la instalación difieren; prepara una nueva vista previa');
  const integrity = await verifyResearchPackageIntegrity(runtimeRoot);
  console.log(json({ verified: true, agents: roster.specialists.map(({ id, model, reasoning, readOnly }) => ({ name: id, model, reasoningEffort: reasoning, readOnly })), skills: 21, integrity, managedFiles: state.current.files.length, hookGroups: state.current.groups.length, preservationAtInstallation: state.preservation, nativeDiscovery: 'Se verifica por separado con el cliente de Codex; esto comprueba archivos y referencias.' }));
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
