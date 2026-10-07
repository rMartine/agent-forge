import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { loadManifest } from './manifest.js';
import { loadExternalSkillCatalog } from './externalSkills.js';

export interface CopilotHookFile { sourcePath: string; relativePath: string; content: Buffer; }
export type CopilotHarness = 'copilot' | 'local';

const skillName = (name: string): string => name.startsWith('agent-forge-copilot-') ? name : `agent-forge-copilot-${name.replace(/^agent-forge-/, '')}`;
const json = (value: unknown): Buffer => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const shellQuote = (value: string): string => `'${value.replaceAll("'", "'\\''")}'`;
const powershellQuote = (value: string): string => `'${value.replaceAll("'", "''")}'`;

export async function renderCopilotHooks(repoPath: string, runtimeRoot: string, harness: CopilotHarness): Promise<{
  files: CopilotHookFile[]; hookFiles: Array<{ name: string; content: Buffer }>; coverage: unknown;
}> {
  if (!['copilot', 'local'].includes(harness)) throw new Error('Unsupported Copilot harness.');
  if (!path.isAbsolute(runtimeRoot) || /[\r\n\0]/.test(runtimeRoot)) throw new Error('Copilot runtime root must be an absolute single-line path.');
  const files: CopilotHookFile[] = [];
  for (const name of ['runtime.mjs', 'adapter.mjs', 'session.mjs', 'README.md']) {
    const sourcePath = path.join(repoPath, 'hooks', 'copilot', name);
    files.push({ sourcePath, relativePath: `hooks/${name}`, content: await readFile(sourcePath) });
  }
  const manifest = await loadManifest(repoPath), catalog = await loadExternalSkillCatalog(repoPath, manifest);
  const agents = Object.fromEntries(Object.values(manifest.codex.agents).map(agent => [agent.id, {
    // The coordinator owns all records in Copilot because hooks do not reliably
    // expose the specialist's identity to terminal tool calls.
    evidenceWriter: 'principal',
    ...(agent.model ? { expectedModel: agent.model, expectedReasoningEffort: agent.modelReasoningEffort } : {}),
    skillNames: agent.requiredSkillBundles.map(id => skillName(manifest.codex.skillBundles[id].deploymentName)),
    conditionalSkills: catalog.skills.filter(skill => skill.agentIds.includes(agent.id)).map(skill => ({ name: skillName(skill.deploymentName), activationCondition: skill.activationCondition ?? skill.description })),
    instructions: agent.instructionOverlay,
    evidence: agent.completionEvidence ?? ['Return the assigned result, observed checks and remaining limitations.'],
  }]));
  files.push({ sourcePath: path.join(repoPath, 'agent-forge.manifest.jsonc'), relativePath: 'development/product-roles.json', content: json({ agents }) });
  const script = path.join(runtimeRoot, 'hooks', 'adapter.mjs');
  const eventNames = harness === 'copilot'
    ? ['sessionStart', 'subagentStart', 'subagentStop', 'preToolUse', 'postToolUse', 'postToolUseFailure', 'agentStop', 'sessionEnd']
    : ['SessionStart', 'SubagentStart', 'SubagentStop', 'PreToolUse', 'PostToolUse', 'Stop'];
  const hooks = Object.fromEntries(eventNames.map(event => {
    const windows = `& ${powershellQuote(process.execPath)} ${powershellQuote(script)} ${harness} ${event}`;
    const unix = `${shellQuote(process.execPath)} ${shellQuote(script)} ${harness} ${event}`;
    return [event, [harness === 'copilot'
      ? { type: 'command', powershell: windows, bash: unix, timeoutSec: 15 }
      : { type: 'command', command: unix, windows, timeout: 15 }]];
  }));
  const coverage = {
    version: 1, harness, runtimeRoot, stateRoot: path.resolve(runtimeRoot, '..', 'state'), automaticEvents: eventNames,
    sourceContracts: ['https://code.visualstudio.com/docs/agents/reference/hooks-reference', 'https://docs.github.com/en/copilot/reference/hooks-reference'],
    functions: {
      sessionContext: 'Real IDs and paths injected at SessionStart; observing a session does not activate a roster.',
      subagentStart: harness === 'copilot' ? 'Role context only when no agentId is supplied. Never substitutes agentName for an instance ID.' : 'Dispatches source lifecycle handlers for prepared assignments with the supplied real agent_id.',
      subagentStop: 'Records real identity; existing bound assignments use source handlers. Explicit bind is available for identities first observed at stop.',
      preToolUse: 'Source authorization checks only with an explicit actor ID. Missing actor identity is reported and never inferred from the parent session or the only running assignment.',
      postToolUse: 'Source metadata and deduplication require a real actor ID and tool-use ID. Missing IDs produce no attributed operation.',
      stop: 'Source evidence checks; one aggregate continuation at most per observed session. Never translates Stop into session termination.',
      interrupt: 'Explicit session.mjs <roster> suspend command; no unsupported Interrupt hook installed.',
      sessionEnd: harness === 'copilot' ? 'Host sessionEnd closes existing roster state; no new assignment is created.' : 'Explicit session.mjs <roster> end; Local has no documented SessionEnd.',
      lockRecovery: 'Source hook-storage.mjs recover-lock retains preview/hash/dead-owner validation; no automatic lock deletion.',
    },
    limitations: [
      'Original reasoning effort and model identities are preserved; hook events do not prove reasoning effort or selected model.',
      'Copilot does not document agentId in subagentStart or actor/tool-use IDs in preToolUse and postToolUse; those checks cannot claim automatic parity.',
      'Local documents subagent instance IDs and tool-use IDs, but not specialist actor IDs for every tool event.',
      'Research native dispatch uses the complete prepared prompt. The coordinator explicitly binds a prepared assignment to an ID observed by the host; the Codex spawn transport is not replayed.',
      'Source output diagnostics are translated only into documented fields; Copilot events without a context output receive diagnostics on stderr.',
      'Source lifecycle records may complete an assignment at Stop; this does not mark the Copilot conversation ended.',
      'No functional, model, simulation or demonstration runs were performed.',
    ],
  };
  files.push({ sourcePath: path.join(repoPath, 'packages', 'core', 'src', 'copilotHooks.ts'), relativePath: 'hooks/coverage.json', content: json(coverage) });
  return { files, hookFiles: [{ name: 'agent-forge-rosters.json', content: json(harness === 'copilot' ? { version: 1, hooks } : { hooks }) }], coverage };
}
