import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientDirectory } from './context.mjs';
import { PACKAGE_ROOT, ROLES, findAssignment, loadManifest, now, readState, readStdinJson, resolveHookContext, updateState, writeAgentLink } from './assignment.mjs';

const EVENTS = new Set(['SubagentStart', 'PreToolUse', 'PostToolUse', 'SubagentStop', 'Stop', 'Interrupt', 'SessionEnd']);
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,255}$/;
const normalizeTool = name => typeof name === 'string' ? name.replace(/^functions\./, '') : '';
const note = systemMessage => ({ systemMessage });
const deny = permissionDecisionReason => ({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason } });
const contextNote = additionalContext => ({ hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext } });

function toolArguments(value) {
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { return null; }
  }
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}
function fieldValue(input, dotted) {
  let current = input;
  for (const part of dotted.split('.')) {
    if (!current || typeof current !== 'object' || !Object.hasOwn(current, part)) return undefined;
    current = current[part];
  }
  return current;
}

// A missing observable value is uncertainty, not proof that a user limit was violated.
function evaluateConstraint(rule, input) {
  if (rule.deny) return 'contradiction';
  if (!input) return 'unknown';
  let missing = false;
  for (const kind of ['inputEquals', 'inputHashes', 'inputOrigins', 'inputMaxima']) {
    for (const [field, expected] of Object.entries(rule[kind] ?? {})) {
      const actual = fieldValue(input, field);
      if (actual === undefined) { missing = true; continue; }
      if (kind === 'inputEquals' && actual !== expected) return 'contradiction';
      if (kind === 'inputHashes' && (typeof actual !== 'string' || createHash('sha256').update(actual).digest('hex') !== expected)) return 'contradiction';
      if (kind === 'inputMaxima' && (typeof actual !== 'number' || !Number.isFinite(actual) || actual < 0 || actual > expected)) return 'contradiction';
      if (kind === 'inputOrigins') {
        try {
          const parsed = new URL(actual);
          if (parsed.protocol !== 'https:' || parsed.username || parsed.password || !expected.includes(parsed.origin)) return 'contradiction';
        } catch { return 'contradiction'; }
      }
    }
  }
  return missing ? 'unknown' : 'matches';
}

function beforeTool(assignment, input) {
  const tool = normalizeTool(input.tool_name);
  const rules = assignment.toolConstraints.filter(rule => normalizeTool(rule.toolName) === tool);
  if (!rules.length) return {};
  if (assignment.status !== 'running') return contextNote('El encargo está cerrado o interrumpido; no continúes sus operaciones. La principal debe recuperar la instrucción vigente antes de reanudarlo.');
  const observed = rules.map(rule => evaluateConstraint(rule, toolArguments(input.tool_input)));
  if (rules.some(rule => rule.deny) || observed.every(result => result === 'contradiction')) {
    return deny('La llamada contradice un límite explícito registrado para este encargo. Conserva el límite y utiliza una alternativa comprendida en la autorización vigente; no lo eludas mediante shell, navegador u otra herramienta.');
  }
  if (!observed.includes('matches')) return contextNote('No se pudieron comprobar todos los parámetros del límite registrado. El hook no acredita autorización ni cumplimiento; comprueba los datos y destino desde el encargo humano.');
  return {}; // No allow override: Codex and connector permissions remain in control.
}

export function responseMetadata(value) {
  let failure = false, completed = false, pending = false;
  const identifiers = {};
  const visit = (entry, depth = 0) => {
    if (depth > 6 || entry === null || entry === undefined) return;
    if (typeof entry === 'string' && entry.length <= 32768 && /^[\s]*[\[{]/.test(entry)) {
      try { visit(JSON.parse(entry), depth + 1); } catch { /* Unstructured text is not stored. */ }
      return;
    }
    if (Array.isArray(entry)) { entry.slice(0, 30).forEach(item => visit(item, depth + 1)); return; }
    if (typeof entry !== 'object') return;
    if (entry.isError === true || entry.error || (typeof entry.exit_code === 'number' && entry.exit_code !== 0)) failure = true;
    if (entry.exit_code === 0) completed = true;
    const status = typeof entry.status === 'string' ? entry.status.toLowerCase() : '';
    if (['failed', 'failure', 'error', 'cancelled', 'canceled'].includes(status)) failure = true;
    if (['completed', 'complete', 'done', 'success', 'succeeded'].includes(status)) completed = true;
    if (['queued', 'pending', 'running', 'processing'].includes(status)) pending = true;
    for (const key of ['job_id', 'document_id', 'design_id', 'page_id', 'run_id']) {
      if (typeof entry[key] === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(entry[key])) identifiers[key] = entry[key];
    }
    for (const key of ['content', 'structuredContent', 'result', 'data', 'text']) if (entry[key] !== undefined) visit(entry[key], depth + 1);
  };
  visit(value);
  return { status: failure ? 'error' : pending ? 'pending' : completed ? 'completed' : 'unknown', identifiers };
}

async function start(context, input, manifest, options) {
  if (!ROLES.has(input.agent_type) || !IDENTIFIER.test(input.agent_id ?? '')) return {};
  const role = manifest.agents.find(agent => agent.name === input.agent_type);
  let assignment;
  await updateState(context, current => {
    const record = current ?? { version: 1, sessionId: context.sessionId, project: context.project, assignments: {}, createdAt: now() };
    const existing = findAssignment(record, input.agent_id);
    if (existing && ['closed', 'ended', 'interrupted'].includes(existing.status)) return record;
    const prepared = record.assignments[`pending-${role.name}`];
    assignment = existing ?? (prepared?.status === 'prepared' ? prepared : undefined) ?? {
      role: role.name, clientId: null, engagementId: null,
      objective: 'Completar el encargo de consultoría asignado por la conversación principal.',
      authorizationReference: null, toolConstraints: [], expectedDeliverables: [], delivered: [], operations: [], createdAt: now()
    };
    assignment.agentId = input.agent_id;
    assignment.status = 'running';
    record.assignments[input.agent_id] = assignment;
    if (prepared === assignment) delete record.assignments[`pending-${role.name}`];
    return record;
  }, true);
  if (!assignment) return {};
  await writeAgentLink(context, input.agent_id);
  const directory = assignment.clientId ? await clientDirectory(context.project, assignment.clientId, assignment.engagementId) : null;
  const skillDirectory = path.resolve(options.packageRoot ?? PACKAGE_ROOT, manifest.skillDirectory ?? 'skills');
  return { hookSpecificOutput: { hookEventName: 'SubagentStart', additionalContext: [
    `Consultor: ${role.displayName}. Encargo: ${assignment.objective}`,
    `Sesión principal: ${context.sessionId}. Agente: ${input.agent_id}. Proyecto: ${context.project}.`,
    directory ? `Contexto exclusivo del cliente ${assignment.clientId} y proyecto ${assignment.engagementId}: ${directory.directory}. Consulta solo los documentos pertinentes de este directorio.` : 'La asignación no identifica aún cliente y proyecto para conservar memoria. Usa el material proporcionado; no leas contextos de otros clientes ni inventes una identidad para guardarlo.',
    `Lee únicamente las skills necesarias: ${role.skills.map(skill => path.join(skillDirectory, skill, 'SKILL.md')).join('; ')}.`,
    assignment.expectedDeliverables.length ? `Entregables registrados: ${assignment.expectedDeliverables.join('; ')}.` : 'Entrega lo solicitado en la conversación, con profundidad proporcional.',
    'Hereda modelo, razonamiento y permisos. Conserva las decisiones empresariales no delegadas. Verifica jurisdicción y vigencia cuando una recomendación dependa de normativa.',
    'Los hooks advierten; no verifican veracidad ni calidad. Solo bloquean contradicciones observables con límites explícitos. Herramientas alojadas y otras rutas pueden quedar fuera de interceptación.',
    'Devuelve resultados, comprobaciones reales y pendientes a la principal. No provoques otra continuación por ausencia de registros ni generes entregables adicionales para llenarlos.'
  ].join('\n') } };
}

async function afterTool(context, actorId, input) {
  if (!IDENTIFIER.test(input.tool_name ?? '') || !IDENTIFIER.test(input.tool_use_id ?? '')) return {};
  const result = responseMetadata(input.tool_response);
  await updateState(context, record => {
    const assignment = findAssignment(record, actorId);
    if (!assignment || assignment.status !== 'running') return record;
    const prior = assignment.operations ?? [];
    if (!prior.some(operation => operation.toolUseId === input.tool_use_id)) {
      assignment.operations = [...prior, { toolName: input.tool_name, toolUseId: input.tool_use_id, time: now(), ...result }].slice(-100);
    }
    return record;
  });
  return result.status === 'error' ? note('La herramienta informó un error. Comprueba el resultado antes de afirmar que el entregable fue creado; no repitas la operación sin revisar la causa.') : {};
}

async function finish(context, actorId, event, manifest) {
  const messages = [];
  await updateState(context, record => {
    if (!record) return record;
    const assignments = actorId ? [findAssignment(record, actorId)].filter(Boolean) : Object.values(record.assignments);
    for (const assignment of assignments) {
      if (['closed', 'ended'].includes(assignment.status)) continue;
      if (event === 'Interrupt') assignment.status = 'interrupted';
      else if (event === 'SessionEnd') assignment.status = 'ended';
      else {
        assignment.status = event === 'SubagentStop' ? 'returned' : 'closed';
        const missing = assignment.expectedDeliverables.filter(name => !assignment.delivered.includes(name));
        const criteria = manifest.agents.find(agent => agent.name === assignment.role).completionChecks;
        messages.push(missing.length ? `Sin constancia registrada de: ${missing.join('; ')}. Comprueba la conversación; esto no demuestra que falte el trabajo.` : 'Revisa el resultado real del consultor y sus limitaciones.');
        if (assignment.operations?.some(operation => ['error', 'pending', 'unknown'].includes(operation.status))) messages.push('Hay operaciones con error, pendientes o sin estado concluyente; un registro no demuestra un artefacto final.');
        messages.push(`Criterios que correspondan al encargo: ${criteria.join(' ')}`);
      }
      assignment.stoppedAt = now();
    }
    return record;
  });
  return messages.length ? note(`${messages.join('\n')} No se solicita continuación ni más producción para completar registros.`) : {};
}

export async function runConsultingHook(input, options = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || !EVENTS.has(input.hook_event_name)) return {};
  if (!IDENTIFIER.test(input.session_id ?? '') || typeof input.cwd !== 'string' || !path.isAbsolute(input.cwd)) return {};
  if (['SubagentStart', 'SubagentStop'].includes(input.hook_event_name) && input.agent_type && !ROLES.has(input.agent_type)) return {};
  if (input.hook_event_name === 'SubagentStart' && !ROLES.has(input.agent_type)) return {};
  const { context, actorId } = await resolveHookContext(input, options);
  if (input.hook_event_name === 'SubagentStart') return start(context, input, await loadManifest(options.packageRoot), options);
  const record = await readState(context);
  if (!record) return {};
  const assignment = findAssignment(record, actorId);
  if (actorId && !assignment) return {};
  if (['PreToolUse', 'PostToolUse', 'SubagentStop'].includes(input.hook_event_name) && !assignment) return {};
  if (input.hook_event_name === 'PreToolUse') return beforeTool(assignment, input);
  if (input.hook_event_name === 'PostToolUse') return afterTool(context, actorId, input);
  return finish(context, actorId, input.hook_event_name, await loadManifest(options.packageRoot));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.stdout.write(`${JSON.stringify(await runConsultingHook(await readStdinJson()))}\n`); }
  catch {
    process.stderr.write('No se pudo comprobar el hook de consultoría; no se conservaron entradas ni credenciales en el diagnóstico.\n');
    process.stdout.write('{}\n');
  }
}
