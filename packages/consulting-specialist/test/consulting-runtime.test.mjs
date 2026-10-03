import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { access, mkdtemp, mkdir, readFile, readdir, realpath, rm, symlink, writeFile, cp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { clientDirectory } from '../context.mjs';
import { readState, runCommand, sessionContext } from '../assignment.mjs';
import { responseMetadata, runConsultingHook } from '../hooks.mjs';

const packageRoot = path.resolve(import.meta.dirname, '..');
const role = 'technology-ai-logistics-consultant';
const tool = 'createProposal';

async function temporaryDirectory(t, prefix = 'consulting-specialist-') {
  const directory = await mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(async () => {
    const temporaryRoot = await realpath(os.tmpdir());
    const resolvedDirectory = await realpath(directory);
    const relativeDirectory = path.relative(temporaryRoot, resolvedDirectory);
    if (!relativeDirectory || relativeDirectory === '..' || relativeDirectory.startsWith(`..${path.sep}`) || path.isAbsolute(relativeDirectory)) {
      throw new Error(`No se elimina una ruta temporal fuera de os.tmpdir(): ${resolvedDirectory}`);
    }
    await rm(resolvedDirectory, { recursive: true, force: true });
  });
  return directory;
}

async function fixture(t) {
  const temporaryRoot = await temporaryDirectory(t);
  const project = path.join(temporaryRoot, 'project');
  const dataRoot = path.join(temporaryRoot, 'session-state');
  await mkdir(project);
  const environment = { CODEX_THREAD_ID: 'parent-session', USERPROFILE: temporaryRoot };
  const options = { environment, packageRoot, dataRoot };
  return { temporaryRoot, project, dataRoot, environment, options };
}

function input(clientId = 'client-one', engagementId = 'shipment-modernization', extra = {}) {
  return {
    role,
    objective: 'Diseñar una propuesta de mejora del proceso de transporte.',
    expectedDeliverables: ['Propuesta ejecutiva'],
    clientId,
    engagementId,
    ...extra,
  };
}

async function openAssignment(environment, project, options, assignment, agentId) {
  return runCommand(['open', '--session', environment.CODEX_THREAD_ID, '--project', project, ...(agentId ? ['--agent', agentId] : [])], { ...options, input: assignment });
}

async function startConsultant(project, options, agentId = 'consultant-child') {
  return runConsultingHook({
    hook_event_name: 'SubagentStart',
    session_id: 'parent-session',
    cwd: project,
    agent_type: role,
    agent_id: agentId,
  }, options);
}

function childHook(event, project, extra = {}, agentId = 'consultant-child') {
  return { hook_event_name: event, session_id: agentId, cwd: project, agent_id: agentId, agent_type: role, ...extra };
}

test('el contexto de cliente y proyecto queda separado, conserva documentos y rechaza traversal', async t => {
  const { project } = await fixture(t);
  const first = await clientDirectory(project, 'client-one', 'project-one', true);
  const contextFile = path.join(first.directory, 'context.md');
  await writeFile(contextFile, '# Decisión previa\nConservar este texto.\n');
  await clientDirectory(project, 'client-one', 'project-one', true);
  assert.equal(await readFile(contextFile, 'utf8'), '# Decisión previa\nConservar este texto.\n');

  const secondClient = await clientDirectory(project, 'client-two', 'project-one', true);
  const secondProject = await clientDirectory(project, 'client-one', 'project-two', true);
  assert.notEqual(first.directory, secondClient.directory);
  assert.notEqual(first.directory, secondProject.directory);
  assert.equal((await readdir(first.directory)).length, 4);
  await assert.rejects(clientDirectory(project, '..', 'outside'), /identificadores/i);
  await assert.rejects(clientDirectory(project, 'client-one', '..'), /identificadores/i);

  const linkedDirectory = path.join(project, '.consulting', 'client-linked');
  await symlink(temporaryDirectoryPath(project), linkedDirectory, 'junction').catch(error => {
    if (!['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) throw error;
    t.diagnostic(`El sistema impidió crear el junction; no se comprobó el rechazo de enlaces: ${error.code}`);
  });
  if (await exists(linkedDirectory)) {
    await assert.rejects(clientDirectory(project, 'client-linked', 'project-one'), /enlaces/i);
  }
});

async function exists(file) {
  try { await readFile(file); return true; } catch (error) { if (error.code === 'EISDIR') return true; if (error.code === 'ENOENT') return false; throw error; }
}

function temporaryDirectoryPath(project) {
  return path.dirname(project);
}

test('estado separado por sesión y proyecto, y el mismo actor no puede cambiar de cliente', async t => {
  const { environment, project, options } = await fixture(t);
  await openAssignment(environment, project, options, input());
  await startConsultant(project, options);

  await assert.rejects(openAssignment(environment, project, options, input('client-two', 'new-project'), 'consultant-child'), /conserva el contexto de su cliente/i);
  assert.equal(await exists(path.join(project, '.consulting', 'client-two')), false);
  const parentState = await readState(await sessionContext('parent-session', project, options));
  assert.equal(parentState.assignments['consultant-child'].clientId, 'client-one');
  assert.equal(parentState.assignments['consultant-child'].engagementId, 'shipment-modernization');

  await runConsultingHook(childHook('Interrupt', project), options);
  await openAssignment(environment, project, options, { ...input(), objective: 'Actualizar el alcance conservando el estado interrumpido.' }, 'consultant-child');
  const interruptedState = await readState(await sessionContext('parent-session', project, options));
  assert.equal(interruptedState.assignments['consultant-child'].status, 'interrupted');
  assert.equal(interruptedState.assignments['consultant-child'].objective, 'Actualizar el alcance conservando el estado interrumpido.');

  assert.deepEqual(await runCommand(['status', '--session', 'other-session', '--project', project], options), { status: 'unregistered' });
  const anotherProject = path.join(path.dirname(project), 'another-project');
  await mkdir(anotherProject);
  assert.deepEqual(await runCommand(['status', '--session', 'parent-session', '--project', anotherProject], options), { status: 'unregistered' });
});

test('eventos de otros perfiles quedan inactivos y el agente hijo conserva el vínculo con la sesión principal', async t => {
  const { environment, project, options } = await fixture(t);
  await openAssignment(environment, project, options, input());
  assert.deepEqual(await runConsultingHook({ hook_event_name: 'SubagentStart', session_id: 'parent-session', cwd: project, agent_type: 'unrelated-agent', agent_id: 'other-child' }, options), {});
  assert.deepEqual(await runConsultingHook({ hook_event_name: 'SubagentStop', session_id: 'parent-session', cwd: project, agent_type: 'unrelated-agent', agent_id: 'other-child' }, options), {});
  await startConsultant(project, options);
  const childResponse = await runConsultingHook(childHook('SubagentStop', project), options);
  assert.match(childResponse.systemMessage, /no se solicita continuación/i);
  const state = await readState(await sessionContext('parent-session', project, options));
  assert.equal(state.assignments['consultant-child'].status, 'returned');
});

test('los límites explícitos niegan contradicciones observables y advierten cuando faltan datos', async t => {
  const { environment, project, options } = await fixture(t);
  const allowedOrigin = 'https://proposal.example';
  const constraints = [
    { toolName: tool, inputEquals: { destination: allowedOrigin }, inputMaxima: { budget: 5000 } },
    { toolName: 'publishExternally', deny: true },
  ];
  await openAssignment(environment, project, options, input('client-one', 'shipment-modernization', { authorizationReference: 'encargo humano 42', toolConstraints: constraints }));
  await startConsultant(project, options);

  const contradicted = await runConsultingHook(childHook('PreToolUse', project, { tool_name: tool, tool_input: { destination: 'https://other.example', budget: 100 } }), options);
  assert.equal(contradicted.hookSpecificOutput.permissionDecision, 'deny');
  const missingObservation = await runConsultingHook(childHook('PreToolUse', project, { tool_name: tool, tool_input: { destination: allowedOrigin } }), options);
  assert.match(missingObservation.hookSpecificOutput.additionalContext, /no acredita autorización ni cumplimiento/i);
  const explicitDeny = await runConsultingHook(childHook('PreToolUse', project, { tool_name: 'publishExternally', tool_input: {} }), options);
  assert.equal(explicitDeny.hookSpecificOutput.permissionDecision, 'deny');
  const unrelatedTool = await runConsultingHook(childHook('PreToolUse', project, { tool_name: 'readDocument', tool_input: {} }), options);
  assert.deepEqual(unrelatedTool, {});

  for (const response of [contradicted, explicitDeny]) {
    assert.notEqual(response.hookSpecificOutput.permissionDecision, 'allow');
  }
});

test('los permisos originales siguen siendo la autoridad para una llamada que coincide', async t => {
  const { environment, project, options } = await fixture(t);
  await openAssignment(environment, project, options, input('client-one', 'shipment-modernization', {
    authorizationReference: 'encargo humano 43',
    toolConstraints: [{ toolName: tool, inputEquals: { destination: 'https://proposal.example' } }],
  }));
  await startConsultant(project, options);
  const response = await runConsultingHook(childHook('PreToolUse', project, { tool_name: tool, tool_input: { destination: 'https://proposal.example' } }), options);
  assert.deepEqual(response, {});
  assert.equal(JSON.stringify(response).includes('allow'), false);
});

test('PostToolUse conserva el error anidado y solo registra metadatos, sin el contenido del resultado', async t => {
  const { environment, project, options } = await fixture(t);
  await openAssignment(environment, project, options, input());
  await startConsultant(project, options);
  const errorResult = { content: [{ type: 'text', text: JSON.stringify({ status: 'success', result: { status: 'failed', error: 'No se generó la propuesta', text: 'DETALLE PRIVADO DE PRUEBA' } }) }] };
  assert.equal(responseMetadata(errorResult).status, 'error');
  const hookResult = await runConsultingHook(childHook('PostToolUse', project, { tool_name: tool, tool_use_id: 'tool-use-1', tool_response: errorResult }), options);
  assert.match(hookResult.systemMessage, /informó un error/i);
  const state = await readState(await sessionContext('parent-session', project, options));
  const operation = state.assignments['consultant-child'].operations[0];
  assert.equal(operation.status, 'error');
  assert.equal(operation.toolName, tool);
  const serialized = JSON.stringify(state);
  assert.equal(serialized.includes('DETALLE PRIVADO DE PRUEBA'), false);
  assert.equal(serialized.includes('No se generó la propuesta'), false);
  assert.equal(serialized.includes('tool-use-1'), true);
});

test('Stop, Interrupt y SessionEnd no provocan continuación', async t => {
  for (const event of ['Stop', 'Interrupt', 'SessionEnd']) {
    const { environment, project, options } = await fixture(t);
    await openAssignment(environment, project, options, input());
    await startConsultant(project, options);
    const response = await runConsultingHook(childHook(event, project), options);
    assert.equal(JSON.stringify(response).toLowerCase().includes('continue'), false);
    assert.equal(response.hookSpecificOutput, undefined);
    const state = await readState(await sessionContext('parent-session', project, options));
    assert.equal(state.assignments['consultant-child'].status, event === 'Stop' ? 'closed' : event === 'Interrupt' ? 'interrupted' : 'ended');
  }
});

test('la entrada malformada se ignora sin divulgar su contenido', async t => {
  assert.deepEqual(await runConsultingHook(null), {});
  assert.deepEqual(await runConsultingHook([]), {});
  assert.deepEqual(await runConsultingHook({ hook_event_name: 'unknown', session_id: 'session', cwd: process.cwd() }), {});
  const { project, options } = await fixture(t);
  assert.deepEqual(await runConsultingHook({ hook_event_name: 'PreToolUse', session_id: 'parent-session', cwd: project, tool_input: '{not-json; PRIVATE_SENTINEL' }, options), {});
});

async function createInstallFixture(t) {
  const root = await temporaryDirectory(t, 'consulting-installer-');
  const sourceRoot = path.join(root, 'source');
  const profileRoot = path.join(root, 'profile');
  const codexHome = path.join(profileRoot, '.codex');
  const stateHome = path.join(profileRoot, '.consulting-state');
  await mkdir(sourceRoot, { recursive: true });
  for (const name of ['install.mjs', 'assignment.mjs', 'context.mjs', 'hooks.mjs']) await cp(path.join(packageRoot, name), path.join(sourceRoot, name));
  await mkdir(path.join(sourceRoot, 'agents'));
  await mkdir(path.join(sourceRoot, 'skills', 'proposal-writing'), { recursive: true });
  await writeFile(path.join(sourceRoot, 'agents', `${role}.toml`), 'name = "fixture consultant"\n');
  await writeFile(path.join(sourceRoot, 'skills', 'proposal-writing', 'SKILL.md'), '# Fixture skill\n');
  await writeFile(path.join(sourceRoot, 'README.md'), '# Installer fixture\n');
  await writeFile(path.join(sourceRoot, 'sources.json'), '{}\n');
  await writeFile(path.join(sourceRoot, 'manifest.json'), JSON.stringify({
    schemaVersion: 1,
    packageName: 'consulting-specialist',
    version: '1.0.0',
    skillDirectory: 'skills',
    stateDirectory: 'sessions',
    agents: [{ name: role, model: 'fixture-model', reasoningEffort: 'high', skills: ['proposal-writing'], completionChecks: ['Revisar el resultado real.'] }],
  }, null, 2));
  await mkdir(path.join(codexHome, 'agents'), { recursive: true });
  await mkdir(path.join(codexHome, 'skills', 'unrelated-skill'), { recursive: true });
  const unrelatedAgent = path.join(codexHome, 'agents', 'unrelated-agent.toml');
  const unrelatedSkill = path.join(codexHome, 'skills', 'unrelated-skill', 'SKILL.md');
  await writeFile(unrelatedAgent, 'name = "keep this agent"\n');
  await writeFile(unrelatedSkill, '# Keep this skill\n');
  const hooksPath = path.join(codexHome, 'hooks.json');
  const foreignGroup = { hooks: [{ type: 'command', command: 'echo keep', timeout: 1 }] };
  await writeFile(hooksPath, JSON.stringify({ hooks: { Stop: [foreignGroup], CustomEvent: [foreignGroup] } }, null, 2));
  const environment = { ...process.env, USERPROFILE: profileRoot, HOME: profileRoot, CODEX_HOME: codexHome };
  return { root, sourceRoot, profileRoot, codexHome, stateHome, hooksPath, unrelatedAgent, unrelatedSkill, foreignGroup, environment };
}

function installCommand(fixtureValue, command, args = []) {
  const result = spawnSync(process.execPath, [path.join(fixtureValue.sourceRoot, 'install.mjs'), command, '--codex-home', fixtureValue.codexHome, '--state-home', fixtureValue.stateHome, ...args], { encoding: 'utf8', env: fixtureValue.environment });
  return { ...result, json: (() => { try { return JSON.parse(result.stdout); } catch { return null; } })() };
}

function previewInstall(fixtureValue, operation = 'install') {
  return installCommand(fixtureValue, 'preview', ['--operation', operation]);
}

function applyInstall(fixtureValue, operation, fingerprint) {
  return installCommand(fixtureValue, operation, ['--expected', fingerprint]);
}

test('la instalación y desinstalación aisladas conservan agentes, skills y grupos ajenos', async t => {
  const installFixture = await createInstallFixture(t);
  const preview = previewInstall(installFixture);
  assert.equal(preview.status, 0, preview.stderr);
  assert.ok(preview.json.fingerprint);
  const installed = applyInstall(installFixture, 'install', preview.json.fingerprint);
  assert.equal(installed.status, 0, installed.stderr);
  assert.equal((await readFile(installFixture.unrelatedAgent, 'utf8')), 'name = "keep this agent"\n');
  assert.equal((await readFile(installFixture.unrelatedSkill, 'utf8')), '# Keep this skill\n');
  const hookDocument = JSON.parse(await readFile(installFixture.hooksPath, 'utf8'));
  assert.deepEqual(hookDocument.hooks.CustomEvent, [installFixture.foreignGroup]);
  assert.ok(hookDocument.hooks.Stop.some(group => JSON.stringify(group) === JSON.stringify(installFixture.foreignGroup)));
  assert.equal(installCommand(installFixture, 'verify').status, 0);

  const uninstallPreview = previewInstall(installFixture, 'uninstall');
  assert.equal(uninstallPreview.status, 0, uninstallPreview.stderr);
  const uninstalled = applyInstall(installFixture, 'uninstall', uninstallPreview.json.fingerprint);
  assert.equal(uninstalled.status, 0, uninstalled.stderr);
  assert.equal((await readFile(installFixture.unrelatedAgent, 'utf8')), 'name = "keep this agent"\n');
  assert.equal((await readFile(installFixture.unrelatedSkill, 'utf8')), '# Keep this skill\n');
  const finalHooks = JSON.parse(await readFile(installFixture.hooksPath, 'utf8'));
  assert.deepEqual(finalHooks.hooks, { Stop: [installFixture.foreignGroup], CustomEvent: [installFixture.foreignGroup] });
});

test('commandWindows ejecuta el hook SubagentStart en PowerShell y persiste la sesión', { skip: process.platform !== 'win32' }, async t => {
  const installFixture = await createInstallFixture(t);
  const project = path.join(installFixture.root, 'hook-project');
  await mkdir(project);
  const preview = previewInstall(installFixture);
  assert.equal(preview.status, 0, preview.stderr);
  assert.equal(applyInstall(installFixture, 'install', preview.json.fingerprint).status, 0);

  const hookDocument = JSON.parse(await readFile(installFixture.hooksPath, 'utf8'));
  const group = hookDocument.hooks.SubagentStart.find(candidate => candidate.matcher === `^(${role})$`);
  assert.ok(group, 'La instalación debe registrar el evento SubagentStart para el consultor.');
  const commandWindows = group.hooks[0].commandWindows;
  assert.equal(typeof commandWindows, 'string');

  const powershell = 'C:\\Program Files\\PowerShell\\7\\pwsh.exe';
  await access(powershell);
  const agentId = 'powershell-consultant-child';
  const payload = {
    hook_event_name: 'SubagentStart',
    session_id: 'powershell-parent-session',
    cwd: project,
    agent_type: role,
    agent_id: agentId,
  };
  const executed = spawnSync(powershell, ['-NoProfile', '-NonInteractive', '-Command', commandWindows], {
    encoding: 'utf8',
    input: JSON.stringify(payload),
    env: { ...installFixture.environment, USERPROFILE: installFixture.profileRoot },
  });
  assert.equal(executed.status, 0, `PowerShell stderr: ${executed.stderr}\nstdout: ${executed.stdout}`);
  assert.ok(JSON.parse(executed.stdout));

  const runtimeRoot = path.join(installFixture.codexHome, 'consulting-specialist');
  const installedAssignment = await import(pathToFileURL(path.join(runtimeRoot, 'assignment.mjs')).href);
  const installedContext = await installedAssignment.sessionContext(payload.session_id, project, {
    environment: { USERPROFILE: installFixture.profileRoot },
    packageRoot: runtimeRoot,
  });
  assert.equal(path.dirname(installedContext.recordPath), path.join(installFixture.stateHome, 'sessions'));
  const state = await installedAssignment.readState(installedContext);
  assert.ok(state, 'El comando real del hook debe escribir el estado de la sesión.');
  assert.equal(state.sessionId, payload.session_id);
  assert.equal(state.project, await realpath(project));
  assert.equal(state.assignments[agentId].agentId, agentId);
  assert.equal(state.assignments[agentId].role, role);
  assert.equal(state.assignments[agentId].status, 'running');
});

test('la instalación rechaza una vista previa obsoleta y conserva cambios ajenos', async t => {
  const installFixture = await createInstallFixture(t);
  const preview = previewInstall(installFixture);
  assert.equal(preview.status, 0, preview.stderr);
  const foreignEdit = { hooks: { Stop: [{ hooks: [{ type: 'command', command: 'echo changed', timeout: 1 }] }] } };
  await writeFile(installFixture.hooksPath, JSON.stringify(foreignEdit, null, 2));
  const staleInstall = applyInstall(installFixture, 'install', preview.json.fingerprint);
  assert.notEqual(staleInstall.status, 0);
  assert.match(staleInstall.stderr, /vista previa vigente/i);
  assert.deepEqual(JSON.parse(await readFile(installFixture.hooksPath, 'utf8')), foreignEdit);
  await assert.rejects(readFile(path.join(installFixture.codexHome, 'agents', `${role}.toml`)), { code: 'ENOENT' });
});

test('la verificación detecta drift en archivos administrados y no los elimina', async t => {
  const installFixture = await createInstallFixture(t);
  const preview = previewInstall(installFixture);
  assert.equal(preview.status, 0, preview.stderr);
  assert.equal(applyInstall(installFixture, 'install', preview.json.fingerprint).status, 0);
  const managedAgent = path.join(installFixture.codexHome, 'agents', `${role}.toml`);
  await writeFile(managedAgent, 'name = "manual edit"\n');
  const verify = installCommand(installFixture, 'verify');
  assert.notEqual(verify.status, 0);
  assert.match(verify.stderr, /modificado o ausente/i);
  const uninstallPreview = previewInstall(installFixture, 'uninstall');
  assert.notEqual(uninstallPreview.status, 0);
  assert.equal(await readFile(managedAgent, 'utf8'), 'name = "manual edit"\n');
});

test('rollback restaura la versión anterior que administraba el instalador', async t => {
  const installFixture = await createInstallFixture(t);
  const firstPreview = previewInstall(installFixture);
  assert.equal(firstPreview.status, 0, firstPreview.stderr);
  assert.equal(applyInstall(installFixture, 'install', firstPreview.json.fingerprint).status, 0);
  const managedAgent = path.join(installFixture.codexHome, 'agents', `${role}.toml`);
  const firstContents = await readFile(managedAgent, 'utf8');
  await writeFile(path.join(installFixture.sourceRoot, 'agents', `${role}.toml`), 'name = "fixture consultant v2"\n');
  const secondPreview = previewInstall(installFixture);
  assert.equal(secondPreview.status, 0, secondPreview.stderr);
  assert.equal(applyInstall(installFixture, 'install', secondPreview.json.fingerprint).status, 0);
  assert.equal(await readFile(managedAgent, 'utf8'), 'name = "fixture consultant v2"\n');
  const rollbackPreview = previewInstall(installFixture, 'rollback');
  assert.equal(rollbackPreview.status, 0, rollbackPreview.stderr);
  assert.equal(applyInstall(installFixture, 'rollback', rollbackPreview.json.fingerprint).status, 0);
  assert.equal(await readFile(managedAgent, 'utf8'), firstContents);
});
