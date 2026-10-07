import { adaptCopilotProcedure, type CopilotProcedureContext } from './copilotProcedureAdaptations.js';

/** Translate client-specific prose only; executable research procedures retain their contracts. */
export function adaptOpenCodeProcedure(text: string, context: CopilotProcedureContext): string {
  const source = context.sourcePath.replaceAll('\\', '/');
  const skills = context.skillRoot.replaceAll('\\', '/');
  let output = text;
  if (source.includes('/independent-elevenlabs/') || source.includes('/research-latex/')) {
    output = adaptCopilotProcedure(text, context)
      .replaceAll('agent-forge-copilot-', 'agent-forge-')
      .replaceAll('VS Code', 'OpenCode')
      .replaceAll('`code --reuse-window <absolute-source-path>`', 'the client file viewer');
  }
  const aliases: Record<string,string> = {'zotero:Zotero':'zotero','jupyter-notebook':'jupyter-notebook','documents:documents':'documents','presentations:Presentations':'presentations','spreadsheets:Spreadsheets':'spreadsheets','pdf:pdf':'pdf'};
  for (const [name,id] of Object.entries(aliases)) output = output.replaceAll('`'+name+'`','`agent-forge-'+id+'` ([installed procedure](<'+skills+'/agent-forge-'+id+'/SKILL.md>))');
  if (source.includes('/direct-research/')) {
    output = output.split('\n\n').map(block => {
      if (block.startsWith('Pass the returned JSON payload directly to the native') || block.startsWith('Any assigned agent may delegate useful research subtasks.')) return 'Any assigned agent may delegate useful research subtasks in OpenCode. Read the prepared task and correlation token from the helper, then use the live native subagent schema; do not forward Codex-specific creation arguments. Preserve the assigned role, model, authorized context and complete token in the task. Bind only identities actually returned by the client. The V2 plugin does not translate research lifecycle events: record manual helper operations as manual evidence and report missing native observation.';
      if (block.startsWith('The creation hook checks the prepared task name, role selection, model, reasoning,')) return 'OpenCode does not currently map its creation events to the research lifecycle verifier. The configured role and model are intent, not observed execution. Preserve the prepared assignment and return evidence to the parent without inventing event records or model observations.';
      return block;
    }).join('\n\n');
  }
  return output;
}
