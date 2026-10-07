import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientDirectory } from './context.mjs';
import { PACKAGE_ROOT, ROLES, findAssignment, loadManifest, now, readState, readStdinJson, resolveHookContext, updateState, writeAgentLink } from './assignment.mjs';
import { classifyReadOnlyTool } from './hook-storage.mjs';

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
  const inheritedRules = (assignment.inheritedConstraintGroups ?? []).flatMap(group => group.filter(rule => normalizeTool(rule.toolName) === tool));
  if (/^mcp__/i.test(tool) && !inheritedRules.length && !assignment.toolConstraints.some(rule => normalizeTool(rule.toolName) === tool)) return deny('La llamada MCP no está vinculada a una autorización vigente de este encargo.');
  if (assignment.readOnly && classifyReadOnlyTool(tool) === 'deny') return deny('El encargo heredó permisos de solo lectura; devuelve cambios propuestos.');
  for (const group of assignment.inheritedConstraintGroups ?? []) {
    const inherited = group.filter(rule => normalizeTool(rule.toolName) === tool);
    if (inherited.length && (inherited.some(rule => rule.deny) || inherited.every(rule => evaluateConstraint(rule, toolArguments(input.tool_input)) === 'contradiction'))) return deny('La llamada contradice un límite heredado del agente padre.');
  }
  const rules = assignment.toolConstraints.filter(rule => normalizeTool(rule.toolName) === tool);
  if (!rules.length) return {};
  if (assignment.status !== 'running') return deny('El encargo está cerrado o interrumpido; no continúes sus operaciones. La principal debe recuperar la instrucción vigente antes de reanudarlo.');
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
  if ((!ROLES.has(input.agent_type) && !input.parent_agent_id) || !IDENTIFIER.test(input.agent_id ?? '')) return {};
  let role = manifest.agents.find(agent => agent.name === input.agent_type);
  let assignment, unmatchedPrepared = false;
  await updateState(context, current => {
    const record = current ?? { version: 1, sessionId: context.sessionId, project: context.project, assignments: {}, createdAt: now() };
    const parent = findAssignment(record, input.parent_agent_id);
    role ??= parent ? manifest.agents.find(entry => entry.name === parent.role) : undefined;
    if (!role) return record;
    const existing = findAssignment(record, input.agent_id);
    if (existing && ['closed', 'ended', 'interrupted'].includes(existing.status)) return record;
    const preparedForRole = Object.entries(record.assignments).filter(([, entry]) => entry.role === role.name && entry.status === 'prepared' && (!entry.parentAgentId || entry.parentAgentId === input.parent_agent_id));
    unmatchedPrepared = !input.assignment_id && preparedForRole.length > 0;
    const candidates = input.assignment_id ? preparedForRole.filter(([key]) => key === input.assignment_id) : [];
    if (!existing && input.assignment_id && candidates.length !== 1) return record;
    const prepared = candidates[0]?.[1];
    assignment = existing ?? prepared ?? {
      role: role.name, clientId: null, engagementId: null,
      objective: 'Completar el encargo de consultoría asignado por la conversación principal.',
      authorizationReference: null, toolConstraints: [], expectedDeliverables: [], delivered: [], operations: [], createdAt: now()
    };
    assignment.agentId = input.agent_id;
    assignment.rootSessionId = context.sessionId;
    assignment.parentAgentId = input.parent_agent_id ?? assignment.parentAgentId ?? null;
    assignment.instanceId = input.agent_id;
    assignment.observedRole = input.agent_type;
    assignment.assignmentId ??= input.assignment_id ?? input.agent_id;
    if (parent) {
      assignment.inheritedConstraintGroups = [...(parent.inheritedConstraintGroups ?? []), ...(parent.toolConstraints?.length ? [parent.toolConstraints] : [])];
      assignment.readOnly = assignment.readOnly === true || parent.readOnly === true;
      assignment.clientId ??= parent.clientId;
      assignment.engagementId ??= parent.engagementId;
    }
    assignment.status = 'running';
    record.assignments[input.agent_id] = assignment;
    if (prepared === assignment) delete record.assignments[candidates[0][0]];
    return record;
  }, true);
  if (!assignment) return note('No se pudo vincular una instancia de encargo sin ambigüedad. Proporciona assignment_id; no se atribuyen autorizaciones de otro agente.');
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
    'Puedes crear subagentes de cualquier roster dentro del encargo vigente; integra sus resultados y conserva en todos los descendientes el alcance, límites de datos y cliente, permisos de solo lectura y aprobaciones aplicables.',
    `Padre inmediato: ${assignment.parentAgentId ?? 'no informado por el cliente; parentesco no verificado'}. Instancia del encargo: ${assignment.assignmentId}.`,
    unmatchedPrepared ? 'Había otra asignación preparada para este rol, pero la llamada de subagente no la identificó; no recibió su autorización ni su contexto de cliente.' : '',
    'Los hooks no verifican veracidad ni calidad. Bloquean contradicciones observables con límites explícitos, operaciones restringidas de un encargo inactivo y operaciones de un agente propio cuyo registro no puede verificarse. Herramientas alojadas y otras rutas pueden quedar fuera de interceptación.',
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
        if (event === 'SubagentStop' && assignment.status !== 'interrupted') assignment.status = 'returned';
        const signature = createHash('sha256').update(JSON.stringify([assignment.status, assignment.expectedDeliverables, assignment.delivered, assignment.operations])).digest('hex');
        if (assignment.lastNoticeSignature === signature) continue;
        assignment.lastNoticeSignature = signature;
        const missing = assignment.expectedDeliverables.filter(name => !assignment.delivered.includes(name));
        const criteria = manifest.agents.find(agent => agent.name === assignment.role).completionChecks;
        messages.push(missing.length ? `Sin constancia registrada de: ${missing.join('; ')}. Comprueba la conversación; esto no demuestra que falte el trabajo.` : 'Revisa el resultado real del consultor y sus limitaciones.');
        if (assignment.operations?.some(operation => ['error', 'pending', 'unknown'].includes(operation.status))) messages.push('Hay operaciones con error, pendientes o sin estado concluyente; un registro no demuestra un artefacto final.');
        messages.push(`Criterios que correspondan al encargo: ${criteria.join(' ')}`);
      }
      if (event === 'Stop') assignment.lastTurnStoppedAt = now();
      else assignment.stoppedAt = now();
    }
    return record;
  });
  return messages.length ? note(`${messages.join('\n')} No se solicita continuación ni más producción para completar registros.`) : {};
}

async function runConsultingHookUnchecked(input, options = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || !EVENTS.has(input.hook_event_name)) return {};
  if (!IDENTIFIER.test(input.session_id ?? '') || typeof input.cwd !== 'string' || !path.isAbsolute(input.cwd)) return {};
  if (['SubagentStart', 'SubagentStop'].includes(input.hook_event_name) && input.agent_type && !ROLES.has(input.agent_type) && !input.parent_agent_id && input.hook_event_name !== 'SubagentStop') return {};
  if (input.hook_event_name === 'SubagentStart' && !ROLES.has(input.agent_type) && !input.parent_agent_id) return {};
  const { context, actorId, owned } = await resolveHookContext(input, options);
  if (input.hook_event_name === 'SubagentStart') return start(context, input, await loadManifest(options.packageRoot), options);
  const record = await readState(context);
  if (!record) { if (owned) throw new Error('Falta el estado de una identidad registrada.'); return {}; }
  const assignment = findAssignment(record, actorId);
  if (actorId && !assignment) return {};
  if (['PreToolUse', 'PostToolUse', 'SubagentStop'].includes(input.hook_event_name) && !assignment) return {};
  if (input.hook_event_name === 'PreToolUse') return beforeTool(assignment, input);
  if (input.hook_event_name === 'PostToolUse') return afterTool(context, actorId, input);
  return finish(context, actorId, input.hook_event_name, await loadManifest(options.packageRoot));
}

export async function runConsultingHook(input, options = {}) {
  try { return await runConsultingHookUnchecked(input, options); }
  catch (error) {
    let owned = error.rosterOwned === true || ROLES.has(input?.agent_type);
    if (!owned) {try {owned = (await resolveHookContext(input, options)).owned === true;} catch (lookupError) {owned = lookupError.rosterOwned === true;}}
    process.stderr.write('No se pudo verificar el estado del roster. No se registraron datos del encargo.\n');
    if (owned && input?.hook_event_name === 'PreToolUse') return deny('No se pudo verificar el registro de este encargo. Recupera su estado antes de continuar; no se concede autorización por omisión.');
    return owned ? note('No se pudo verificar el estado del encargo; conserva sus límites y comunica el impedimento.') : {};
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.stdout.write(JSON.stringify(await runConsultingHook(await readStdinJson())) + '\n'); }
  catch { process.stderr.write('Entrada de hook inválida; no se reprodujo su contenido.\n'); process.stdout.write('{}\n'); }
}
