import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSessionContext, deactivateSession, readJsonFile, readSession, updateSession, validateIdentifier,
} from './product-session.mjs';

const EVENTS = new Set(['SubagentStart', 'SubagentStop', 'Stop', 'Interrupt', 'SessionEnd']);
const DEFAULT_ROLES_PATH = fileURLToPath(new URL('./product-roles.json', import.meta.url));

async function roleFor(agentType, rolesPath) {
  const configuration = await readJsonFile(rolesPath);
  if (!configuration || typeof configuration.agents !== 'object' || Array.isArray(configuration.agents) || configuration.agents === null) throw new Error('Invalid product agent configuration.');
  if (!Object.hasOwn(configuration.agents, agentType)) return null;
  const role = configuration.agents[agentType];
  if (!role || typeof role !== 'object' || Array.isArray(role) || !Array.isArray(role.skillNames) || role.skillNames.length > 32 || role.skillNames.some(name => typeof name !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(name))) throw new Error('Invalid skills for the product agent.');
  if (typeof role.instructions !== 'string' || !role.instructions.trim() || role.instructions.length > 6000) throw new Error('Invalid product agent instructions.');
  if (!Array.isArray(role.evidence) || role.evidence.length > 24 || role.evidence.some(item => typeof item !== 'string' || !item.trim() || item.length > 300)) throw new Error('Invalid evidence expectations for the product agent.');
  if (role.evidenceWriter !== undefined && !['agent', 'principal'].includes(role.evidenceWriter)) throw new Error('Invalid evidence writer for the product agent.');
  return { ...role, evidenceWriter: role.evidenceWriter ?? 'agent' };
}

function evidenceWarning(evidence, label) {
  if (evidence.status !== 'completed') return `${label} recorded ${evidence.status}. Report the actual limitation without restarting work beyond the authorized scope.`;
  if (evidence.checks.some(check => check.result !== 'passed')) return `${label} recorded checks that did not pass or did not run. Explain those limits; this hook has not evaluated product quality.`;
  return '';
}

export async function runProductHook(input, { sessionRoot, rolesPath = DEFAULT_ROLES_PATH, environment = process.env } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Hook input must be a JSON object.');
  if (!EVENTS.has(input.hook_event_name)) return {};
  const context = await createSessionContext({ sessionId: input.session_id, project: input.cwd, sessionRoot, environment });
  const record = await readSession(context);
  if (!record) return {};
  const event = input.hook_event_name;
  if (event === 'SessionEnd') {
    await deactivateSession(context, 'ended');
    return {};
  }
  if (record.status !== 'active') return {};
  if (event === 'Interrupt') {
    await deactivateSession(context, 'interrupted');
    return {};
  }
  if (input.turn_id !== undefined) validateIdentifier(input.turn_id, 'Turn identifier');
  if (input.stop_hook_active !== undefined && typeof input.stop_hook_active !== 'boolean') throw new Error('stop_hook_active must be a boolean.');
  let role;
  if (event.startsWith('Subagent')) {
    validateIdentifier(input.agent_id, 'Agent identifier');
    validateIdentifier(input.agent_type, 'Agent type');
    role = await roleFor(input.agent_type, rolesPath);
    if (!role) return {};
  }
  if (event === 'SubagentStart') {
    let registered = false;
    await updateSession(context, current => {
      if (current?.status !== 'active') return current;
      const existing = Object.hasOwn(current.agents, input.agent_id) ? current.agents[input.agent_id] : undefined;
      if (existing && existing.type !== input.agent_type) throw new Error('The registered agent type differs from the hook event.');
      if (!existing || existing.turnId !== (input.turn_id ?? null)) {
        if (!existing && Object.keys(current.agents).length >= 128) throw new Error('The session has reached its agent record limit.');
        Object.defineProperty(current.agents, input.agent_id, {
          value: { type: input.agent_type, evidenceWriter: role.evidenceWriter, turnId: input.turn_id ?? null, startedAt: new Date().toISOString(), continuationRequested: false },
          enumerable: true, writable: true, configurable: true,
        });
      }
      current.agents[input.agent_id].evidenceWriter = role.evidenceWriter;
      registered = true;
      return current;
    });
    if (!registered) return {};
    const sessionScript = fileURLToPath(new URL('./product-session.mjs', import.meta.url));
    return {
      hookSpecificOutput: {
        hookEventName: 'SubagentStart',
        additionalContext: [
          'Agent Forge: this parent session is carrying out an authorized software product assignment.',
          role.instructions,
          role.skillNames.length ? `Available assigned skills: ${role.skillNames.join(', ')}. Read only skills and references needed for your concrete assignment.` : 'Use the documented project procedures appropriate to your assignment.',
          `Return evidence appropriate to this assignment: ${role.evidence.join('; ')}.`,
          'The principal agent retains responsibility for integration and assessing the result. The hook checks record completeness, not correctness or quality.',
          `Evidence registration uses the parent session identifier ${JSON.stringify(input.session_id)}, agent identifier ${JSON.stringify(input.agent_id)}, and project ${JSON.stringify(context.project)}. Do not substitute the child CODEX_THREAD_ID.`,
          role.evidenceWriter === 'principal'
            ? "The principal agent writes your evidence record. Do not write session files or request write permission. Return the evidence JSON in your final response to the principal, together with the parent session and agent identifiers above. Use the agent-forge-build-software-products skill's references/session-record.md format."
            : `Use Node with script ${JSON.stringify(sessionScript)}, command record-evidence, options --session, --project, --agent and --file. Supply the identifiers above and an actual evidence JSON file; follow the agent-forge-build-software-products skill's references/session-record.md format.`,
          'Report executed checks and actual results, including failures, interruptions and blockers. Registration does not authorize external actions or change permissions.',
        ].join('\n'),
      },
    };
  }
  let output = {};
  await updateSession(context, current => {
    if (current?.status !== 'active') return current;
    const isPrincipal = event === 'Stop';
    const entry = isPrincipal ? current.principal : (Object.hasOwn(current.agents, input.agent_id) ? current.agents[input.agent_id] : undefined);
    if (!entry || (!isPrincipal && entry.type !== input.agent_type)) return current;
    if (!isPrincipal && (entry.evidenceWriter ?? role.evidenceWriter) === 'principal') {
      // Read-only specialists return evidence in their response. Their principal
      // must record it before completing the product assignment.
      entry.continuationRequested = true;
      return current;
    }
    const missingAgents = isPrincipal ? Object.values(current.agents).filter(agent => !agent.evidence).length : 0;
    const hasMissingEvidence = !entry.evidence || missingAgents > 0;
    const terminalLimitation = entry.evidence && ['blocked', 'interrupted'].includes(entry.evidence.status);
    if (hasMissingEvidence && !terminalLimitation && !entry.continuationRequested && input.stop_hook_active !== true) {
      entry.continuationRequested = true;
      output = {
        decision: 'block',
        reason: `Agent Forge has no complete evidence record for this ${isPrincipal ? 'product assignment' : 'agent assignment'}. Make one focused pass to record the actual result and checks with product-session.mjs record-evidence${missingAgents ? ` and account for ${missingAgents} agent record(s) without evidence` : ''}. Do not repeat passed work merely to populate the record. If execution is blocked or interrupted, record that state and explain the limitation; do not expand scope or permissions. This hook will not request another continuation.`,
      };
      return current;
    }
    if (hasMissingEvidence) output.systemMessage = 'Agent Forge is allowing this stop with incomplete evidence. Report that limitation; no further continuation will be requested.';
    if (entry.evidence) {
      const warning = evidenceWarning(entry.evidence, isPrincipal ? 'The principal agent' : 'The subagent');
      if (warning) output.systemMessage = [output.systemMessage, warning].filter(Boolean).join(' ');
    }
    if (isPrincipal) {
      const limitedAgents = Object.values(current.agents).filter(agent => agent.evidence && (agent.evidence.status !== 'completed' || agent.evidence.checks.some(check => check.result !== 'passed'))).length;
      if (limitedAgents) output.systemMessage = [output.systemMessage, `${limitedAgents} agent record(s) report limitations. The principal agent must assess their effect on the delivered product.`].filter(Boolean).join(' ');
      current.status = 'inactive';
    } else {
      // A later stop for this same assignment must not cause a second continuation.
      entry.continuationRequested = true;
    }
    return current;
  });
  return output;
}

async function readHookInput() {
  const chunks = [];
  let size = 0;
  for await (const chunk of process.stdin) {
    size += chunk.length;
    if (size > 256 * 1024) throw new Error('Hook input exceeds 256 KiB.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.stdout.write(`${JSON.stringify(await runProductHook(await readHookInput()))}\n`);
  } catch (error) {
    // Hooks are advisory. Invalid input or unavailable storage must not trap a turn.
    process.stderr.write(`Agent Forge product hook skipped: ${error.message}\n`);
    process.stdout.write('{}\n');
  }
}
