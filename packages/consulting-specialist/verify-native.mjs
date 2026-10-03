import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
const expectedSkills = [...new Set([...manifest.agents.flatMap(agent => agent.skills), 'consulting-specialist-coordination'])];
const binary = process.argv[2];
const cwd = process.argv[3];
const confirmCatalog = process.argv.includes('--confirm-agent-catalog');
if (!binary || !cwd || !path.isAbsolute(binary) || !path.isAbsolute(cwd)) throw new Error('Indica rutas absolutas de codex.exe y del proyecto.');
const report = { checkedAt: new Date().toISOString(), method: 'Proceso nuevo del cliente nativo para metadatos; consulta opcional del catálogo mediante una respuesta efímera sin herramientas ni producción.', agents: [], skills: [], hooks: [] };

async function promptInput() {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, ['debug', 'prompt-input'], { cwd, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderrBytes = 0;
    const timer = setTimeout(() => { child.kill(); reject(new Error('La lectura del contexto nativo superó 45 segundos')); }, 45000);
    child.stdout.on('data', chunk => { stdout += chunk.toString(); if (stdout.length > 20 * 1024 * 1024) { child.kill(); reject(new Error('Contexto nativo demasiado grande')); } });
    child.stderr.on('data', chunk => { stderrBytes += chunk.length; });
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(`El contexto nativo terminó con código ${code}; diagnóstico no reproducido (${stderrBytes} bytes).`));
      try { resolve(JSON.parse(stdout)); } catch { reject(new Error('El cliente no devolvió JSON de contexto válido')); }
    });
  });
}

try {
  const context = await promptInput();
  const strings = [];
  const visit = value => {
    if (typeof value === 'string') strings.push(value);
    else if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') Object.values(value).forEach(visit);
  };
  visit(context);
  // The debug command receives no prompt containing our names. Search only its native generated instructions.
  report.agents = manifest.agents.map(agent => ({ name: agent.name, recognizedInNativeContext: strings.some(value => value.includes(agent.name) && /available roles|agent_type|agent roles|agentes disponibles|roles|subagent/i.test(value)) }));
  report.contextTopLevel = Array.isArray(context) ? 'array' : Object.keys(context);
} catch (error) { report.contextError = error.message; }

const child = spawn(binary, ['app-server', '--stdio'], { cwd, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
const pending = new Map();
let counter = 0, buffer = '';
child.stderr.on('data', () => {});
child.stdout.on('data', chunk => {
  buffer += chunk.toString();
  let newline;
  while ((newline = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1);
    let value; try { value = JSON.parse(line); } catch { continue; }
    const item = pending.get(value.id);
    if (item) { pending.delete(value.id); clearTimeout(item.timer); value.error ? item.reject(new Error(`Error nativo ${value.error.code}`)) : item.resolve(value.result); }
  }
});
child.on('error', error => { for (const item of pending.values()) { clearTimeout(item.timer); item.reject(error); } pending.clear(); });
function request(method, params) {
  return new Promise((resolve, reject) => {
    const id = ++counter;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Tiempo excedido en ${method}`)); }, 20000);
    pending.set(id, { resolve, reject, timer });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}
try {
  const initialized = await request('initialize', { clientInfo: { name: 'consulting_specialist_verification', version: '1.0.0' }, capabilities: { experimentalApi: true } });
  report.nativeVersion = initialized.userAgent;
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'initialized' }) + '\n');
  const configuration = await request('config/read', { cwd, includeLayers: false });
  report.agentConfigurationKeys = Object.keys(configuration.config?.agents || {});
  report.nativeAgentConfigurations = Object.fromEntries(Object.entries(configuration.config?.agents || {}).filter(([name]) => manifest.agents.some(agent => agent.name === name)));
  const skills = await request('skills/list', { cwds: [cwd], forceReload: true });
  report.skillListingKeys = Object.keys(skills);
  report.skillGroupCounts = (skills.data || []).map(entry => ({ cwd: entry.cwd, skills: entry.skills?.length ?? 0, errors: entry.errors?.length ?? 0 }));
  report.skills = (skills.data || []).flatMap(entry => (entry.skills || []).filter(skill => expectedSkills.includes(skill.name)).map(skill => ({ name: skill.name, path: skill.path, enabled: skill.enabled })));
  report.skillErrors = (skills.data || []).flatMap(entry => (entry.errors || []).filter(error => JSON.stringify(error).includes('consulting-')));
  const hooks = await request('hooks/list', { cwds: [cwd] });
  report.hookListingKeys = Object.keys(hooks);
  report.hookGroupCounts = (hooks.data || []).map(entry => ({ cwd: entry.cwd, hooks: entry.hooks?.length ?? 0, errors: entry.errors?.length ?? 0 }));
  report.hooks = (hooks.data || []).flatMap(entry => (entry.hooks || []).filter(hook => JSON.stringify(hook).includes('consulting-specialist')).map(hook => ({ eventName: hook.eventName, enabled: hook.enabled, trustStatus: hook.trustStatus, sourcePath: hook.sourcePath, currentHash: hook.currentHash })));
  report.hookErrors = (hooks.data || []).flatMap(entry => (entry.errors || []).filter(error => JSON.stringify(error).includes('consulting-specialist')));
} catch (error) { report.clientError = error.message; }
finally { child.stdin.end(); child.kill(); }
const supportingFilesRecognized = () => expectedSkills.every(name => report.skills.some(skill => skill.name === name && skill.enabled !== false)) && report.hooks.length === 7 && !(report.skillErrors?.length || report.hookErrors?.length || report.clientError);
report.recognized = report.agents.length === manifest.agents.length && report.agents.every(agent => agent.recognizedInNativeContext) && supportingFilesRecognized();
if (confirmCatalog && report.agents.some(agent => !agent.recognizedInNativeContext)) {
  report.catalogCheck = await new Promise(resolve => {
    const prompt = 'Comprobación mínima de instalación. No uses herramientas, no leas archivos, no crees subagentes ni materiales. Consulta únicamente los roles declarados en la definición nativa de la herramienta spawn_agent de esta sesión. Devuelve una lista JSON de los identificadores disponibles que correspondan a un consultor sénior de tecnología e IA para logística, aduanas y transporte. No deduzcas identificadores a partir de las skills ni inventes roles. Si no aparecen en la definición de la herramienta, devuelve un arreglo vacío.';
    const args = ['exec', '--ephemeral', '--json', '--skip-git-repo-check', '--sandbox', 'read-only', '-C', cwd, prompt];
    const verification = spawn(binary, args, { cwd, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let text = '', partial = '', toolsCalled = 0;
    const timer = setTimeout(() => { verification.kill(); resolve({ error: 'La consulta de catálogo superó 60 segundos' }); }, 60000);
    verification.stderr.on('data', () => {});
    verification.stdout.on('data', chunk => {
      partial += chunk.toString();
      let newline;
      while ((newline = partial.indexOf('\n')) >= 0) {
        const line = partial.slice(0, newline); partial = partial.slice(newline + 1);
        let event; try { event = JSON.parse(line); } catch { continue; }
        if (event.type === 'item.completed' && event.item?.type === 'agent_message') text += event.item.text;
        if (event.type === 'item.started' && ['command_execution', 'mcp_tool_call', 'collab_tool_call', 'web_search'].includes(event.item?.type)) {
          toolsCalled++; verification.kill(); resolve({ error: 'La consulta intentó utilizar herramientas y se detuvo', toolsCalled });
        }
      }
    });
    verification.on('error', error => { clearTimeout(timer); resolve({ error: error.message }); });
    verification.on('close', code => {
      clearTimeout(timer);
      const names = manifest.agents.filter(agent => text.includes(`"${agent.name}"`)).map(agent => agent.name);
      resolve({ method: 'Respuesta de una sesión efímera sobre su catálogo nativo; sin ejecutar especialistas ni generar materiales.', exitCode: code, toolsCalled, names });
    });
  });
  if (report.catalogCheck.exitCode === 0 && report.catalogCheck.toolsCalled === 0) {
    report.agents = manifest.agents.map(agent => ({ name: agent.name, recognizedInNativeCatalog: report.catalogCheck.names.includes(agent.name) }));
    report.recognized = report.agents.every(agent => agent.recognizedInNativeCatalog) && supportingFilesRecognized();
  }
}
report.hookExecutionObserved = false;
report.hookExecutionNote = 'Listar hooks y su confianza no demuestra que hayan ejecutado eventos. Se comprueba por separado con una asignación real.';
console.log(JSON.stringify(report, null, 2));
if (!report.recognized) process.exitCode = 1;
