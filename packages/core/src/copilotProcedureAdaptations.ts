export interface CopilotProcedureContext {
  sourcePath: string;
  targetPath: string;
  runtimeRoot: string;
  skillRoot: string;
  roster: string;
}

const slash = (value: string): string => value.replaceAll('\\', '/');

/** Replace a client-specific paragraph without shortening scientific or operational content. */
function paragraph(text: string, prefix: string, replacement: string): string {
  return text.split('\n\n').map(block => block.startsWith(prefix) ? replacement : block).join('\n\n');
}

/** Adapt procedures before the renderer resolves links and rewrites skill identifiers. No source file is edited. */
export function adaptCopilotProcedure(text: string, context: CopilotProcedureContext): string {
  // Executable sources, inventories and licensing records keep their native contracts.
  if (!/\.(?:md|txt)$/i.test(context.targetPath)) return text;
  let output = text.replaceAll('\r\n', '\n');
  const source = slash(context.sourcePath);
  const runtime = slash(context.runtimeRoot);
  const skills = slash(context.skillRoot);
  const helper = `${runtime}/hooks/session.mjs`;
  const research = `${runtime}/research-specialists`;
  const dependency = (name: string): string => `${skills}/agent-forge-copilot-${name}/SKILL.md`;
  const researchCommand = `node "${helper}" research`;
  const replace = (prefix: string, replacement: string): void => { output = paragraph(output, prefix, replacement); };

  if (source.includes('/direct-research/') || source.endsWith('/research-specialists/README.md')) {
    replace('Only the primary conversation delegates research assignments.',
      'Only the primary coordinator delegates research assignments. Use the Copilot agent delegation tool with the `agentName` and `prompt` fields returned by `spawn-input`; its `binding` field is guidance for the coordinator and is not a tool argument. Select the named installed custom agent, preserve the complete prepared prompt and assignment token, and pass only fields supported by the live tool schema. The agent profile retains the original model; reasoning effort is recorded in the catalog because the client does not expose the original per-agent control. Do not invent a fresh-context flag or override the profile model. Supply only the authorized task context. Respect available concurrency and create only specialists needed for the outcome. Keep delegation inside the current chat.');
    replace('Pass the returned JSON payload directly to the native',
      'Read the JSON returned by `spawn-input`. It contains `agentName` (the exact installed role), `prompt` (the full prepared message with task name, assignment token and absolute role/skill paths), and `binding` (instructions for later correlation). Submit only `agentName` and `prompt` through the Copilot agent delegation tool if those fields match its live schema. Do not send `binding` as a tool argument. Preserve the prompt and token exactly. The installed agent profile selects the original model; reasoning is retained as metadata, not a verified client setting. An unavailable profile/model is a reported limitation; do not substitute a different model.');
    replace('Use this reference when registering and completing research assignments.',
      `Use this reference when registering and completing research assignments. Invoke the Copilot adapter with \`${researchCommand} <command>\`; it loads the installed shared research resources at \`${research}\` and keeps session state separate from other clients. Never invoke the original research-session helper directly. Read the adapter's reported help or error if the installed interface differs; do not silently improvise another protocol.`);
    output = output.replace(/- `\$ResearchRoot`[^\n]*/g, `- \`$ResearchRoot\` is the absolute installed shared resource directory \`${research}\`.`)
      .replace(/- `\$env:CODEX_THREAD_ID`[^\n]*/g, '- `$CopilotSessionId` is the actual parent session identifier observed by the client/hook receipt. If it is unavailable, report missing session coverage; do not invent it or use a child identifier.');
    replace('The installed research runtime obtains its shared session storage location',
      `The adapter and hook processes use the same private Copilot session store beneath \`${runtime}/../state\`. The wrapper supplies that storage context to the original research helpers; do not change environment variables to point at another client's records. The scientific package configuration still records the interpreter and integrity inventory. Keep state outside the authorized scientific project.`);
    replace('Prepare and create one unbound assignment at a time',
      'Prepare and create one unbound assignment at a time until its actual instance identity can be correlated. The Copilot start event may expose only a role name; that does not identify a unique instance. A later lifecycle event may provide the actual instance ID. Bind only a receipt-observed identity to the prepared assignment through the adapter. After binding, independent specialists may work concurrently within available capacity. Read only relevant skills. Entries in `externalSkills` refer to the installed portable Copilot skill catalog and do not authorize installing or executing optional dependencies.');
    replace('The pre-tool hook checks creations it can observe.',
      'The adapter applies original checks only when the client supplies enough real session, role and instance identity. `status` shows recorded evidence and incomplete coverage; a model name in a prompt or profile is not independent confirmation of the model that actually ran. Events without actor identity receive a coverage warning and are not attributed to a guessed specialist. If a hook rejects a visible operation, resolve its concrete mismatch without changing correlation tokens, bypassing the adapter or weakening authorization.');
    replace('For a bound research specialist, submit one literal PowerShell command',
      'For a bound research specialist, submit one literal PowerShell command directly through the VS Code terminal execution tool. Resolve the installed scientific runtime and authorization paths first. Use the example below with the actual authorized locations and the applicable script and arguments. The original scientific launcher and policy validator remain mandatory; do not invoke another interpreter to bypass them.');
    replace('Codex reports native unified terminal execution to hooks',
      'Use the direct terminal tool exposed by the selected VS Code harness. The hook adapter normalizes only observed terminal events and their actual command arguments; it cannot infer commands hidden inside another tool, shell wrapper or nested execution service. Read the installed coverage report for supported event shapes. A tool name shown in a transcript does not establish that a pre-tool hook received the command or its actor identity.');
    replace('After a native specialist creation, check that `status` contains',
      `After delegation, inspect \`status\` for actual lifecycle evidence. When a real instance ID is observed, the coordinator runs \`${researchCommand} bind --session $CopilotSessionId --project $ResearchProject --agent <observed-instance-id> --assignment $ResearchAssignmentId\` before recording assignment evidence. The adapter requires an observed hook receipt. The Copilot start event may lack this ID; report the missing coverage and wait for a real later receipt instead of fabricating identity. If no receipt can establish the correspondence, leave the assignment unresolved and report the limitation. Do not repeat creation or manufacture lifecycle events to fill the record.`);
    replace('The creation hook checks the prepared task name, role selection, model, reasoning,',
      'The adapter preserves the prepared task, role and correlation token and uses original integrity and authorization checks where the required event fields are present. The VS Code harness does not provide the same creation-argument contract as the source runtime: do not claim automatic verification of reasoning effort, a fresh-history flag, hidden prompt transport or the model actually used. It never decrypts or records opaque messages. The coordinator compares the returned work with the prepared prompt and evidence. Real instance identifiers must come from hook receipts; insufficient identity is a coverage limitation, not evidence of approval.');
    replace('This hook check applies only when `PreToolUse` receives',
      'This launcher-specific check applies only when the hook adapter receives a supported direct terminal event with sufficient identity to associate it with the research assignment. Nested calls or events without actor identity are not covered by that pre-tool check. Ordinary scientific commands and unrelated agents are not subjected to this launcher-specific check. Precise data paths, destinations, credentials, operation limits and spending constraints remain checked inside `research_policy.py`; the hook is not a general shell security analyzer.');
    replace('Missing evidence can justify the bounded completion step implemented by the stop hook.',
      'Missing evidence can justify at most one aggregate continuation per session when the selected harness supports the corresponding stop decision. A stop event ends a turn, not the session. It does not justify restarting interrupted work, hiding a failed check or launching new scientific work. Use the adapter `suspend` command for an actual user interruption; no automatic interruption event is assumed.');
    replace('The command result and native event evidence determine what can be reported as verified.',
      'The command result and actual native event evidence determine what can be reported as verified. Distinguish manual helper operations from observed hooks in VS Code. `end` explicitly closes the session; `suspend` records interruption and requires an explicit authorized resumption. The Local harness has no documented session-end event; a turn-stop event must never replace `end`. These helpers and hooks do not cover every tool or establish an operating-system sandbox.');
    replace('La instalación conserva el modelo y el esfuerzo de razonamiento',
      'La instalación conserva el modelo original en cada perfil y el esfuerzo de razonamiento en el catálogo; este último no equivale a un ajuste soportado por el motor. La dirección usa el modelo acordado sin cambiar la configuración global. El adaptador `spawn-input` devuelve `agentName`, `prompt` y una guía `binding`; únicamente los dos primeros se envían a la herramienta de delegación compatible, preservando el token. La correlación exige una identidad real observada; no se inventan argumentos de otro cliente.');
    output = output.replace(/node "\$ResearchRoot\/scripts\/research-session\.mjs"/g, researchCommand);
  }

  if (source.includes('/research-latex/')) {
    output = output.replace(/^description:.*$/m, 'description: Create or revise scientific LaTeX deliverables in VS Code with the installed portable LaTeX skill and authorized local project compiler.');
    replace('Create or edit the saved .tex source with file tools',
      `Create or edit the saved .tex source in the authorized output location and keep it editable in VS Code. Read [the portable LaTeX procedure](<${dependency('latex')}>) before selecting an installed compiler. Discover available engines through \`node "${runtime}/dependencies/discover.mjs"\`; use the skill's compile helper or the project's established build command. Open the source with the editor or \`code --reuse-window <absolute-source-path>\` when available, and inspect the generated PDF with the PDF skill. A saved source, opened editor or pre-existing PDF does not establish successful compilation.`);
    replace('Correct source errors within the tool\'s documented repair limit',
      'Read the compiler return code and log, correct source errors and retry at most three repair attempts. If another build holds the output, wait briefly before a bounded retry. Preserve the source and keep it editable when compilation fails. Report a missing engine or package; do not install a TeX distribution, extension or dependency unless the user has authorized that installation.');
    replace('Inspect the project\'s entry point, class, bibliography inputs',
      'Inspect the project\'s entry point, class, included files, bibliography inputs and established compile command. Use the existing authorized project environment and its multi-file build procedure. When choosing the portable helper, read its engine limitations and use the project\'s BibTeX/Biber workflow when needed. Report missing capabilities rather than silently converting the manuscript into another project structure or installing a toolchain.');
  }

  if (source.includes('/independent-specialist-coordination/')) {
    replace('Los agentes tienen modelos explícitos en sus perfiles.',
      'Los agentes tienen modelos explícitos en sus perfiles `.agent.md`. Selecciona el nombre exacto del especialista mediante la herramienta de delegación de Copilot y pasa un encargo acotado en los campos que admita su esquema activo. Conserva Astra para marketing y educación, y 6.1 Sol para marca y audiovisual, con el esfuerzo original alto registrado en el catálogo. Ese registro no acredita que el motor soporte un control de razonamiento por agente. Si un modelo no está disponible, informa el bloqueo sin sustituirlo ni cambiar el modelo de la principal.');
    replace('El evento nativo `SubagentStart` registra automáticamente',
      'Un evento de inicio registra al especialista únicamente si aporta una identidad real suficiente. En Copilot el inicio puede contener sólo el rol; en ese caso el adaptador registra cobertura incompleta y espera un identificador observado, sin inventarlo. El trabajo local reversible no requiere llenar un formulario. La principal puede registrar la autorización que Roberto ya dio para una operación externa observable; esto no exige otra confirmación por rutina. Si falta una decisión sustancial sobre datos, destino, publicación o gasto, resuélvela antes de esa operación.');
    replace('El programa está en `CODEX_HOME/independent-specialists/assignment.mjs`;',
      `Usa \`node "${helper}" communication <comando>\`. El adaptador selecciona el programa y almacén privados de Copilot. \`--session\` recibe el identificador real observado de la principal y \`--project\` su ruta absoluta. No cambies variables ni reutilices identificadores de otra conversación. Si falta identidad observada, informa la cobertura pendiente:`);
    output = output.replaceAll('node assignment.mjs', `node "${helper}" communication`);
  }
  if (source.includes('/consulting-specialist-coordination/')) {
    replace('El ayudante instalado está en `CODEX_HOME/consulting-specialist/assignment.mjs`;',
      `Usa \`node "${helper}" consulting <comando>\` antes de delegar cuando ya conoces cliente y proyecto. El adaptador selecciona el programa y almacén privados de Copilot. \`--session\` recibe la identidad real observada de la principal y \`--project\` su directorio absoluto, el mismo que informará el hook:`);
    replace('`SubagentStart` vincula la instancia pendiente',
      'El adaptador vincula una instancia pendiente sólo cuando un evento observable aporta un identificador real y un rol suficientes. Un inicio que contiene únicamente el rol no acredita una identidad; se informa cobertura incompleta y se espera un evento suficiente. Sin registro previo, el consultor usa las instrucciones generales y el material autorizado del encargo. Para otro encargo del mismo cliente puedes reanudar cuando esté permitido; para cambiar de cliente o proyecto crea una instancia y pasa únicamente su contexto. Una conversación antigua conserva lo que leyó: cambiar un identificador no la aísla.');
    output = output.replaceAll('node assignment.mjs', `node "${helper}" consulting`);
  }

  if (source.includes('/independent-elevenlabs/')) {
    output = output.replace(/^description:.*$/m, 'description: Dirigir voz y transcripción autorizadas con las skills portables de ElevenLabs y su servidor MCP conectado en VS Code.');
    replace('Guía de coordinación creada para estos agentes.',
      'Guía de coordinación para estos agentes en VS Code. Utiliza las adaptaciones portables instaladas y el servidor MCP oficial de ElevenLabs. No atribuyas a estas adaptaciones una redistribución de las skills propietarias de otra aplicación. Descubre las capacidades y esquemas reales después de conectar el servidor; el nombre de una skill no demuestra disponibilidad ni autenticación.');
    output = output.replace('## Seleccionar la skill oficial', '## Seleccionar la skill instalada')
      .replace('La lista siguiente es el conjunto de capacidades oficiales que utiliza esta guía:', 'La lista siguiente identifica las adaptaciones portables y su operación:')
      .replace('- `creative-studio` del plugin de ElevenLabs: generar voz o transcribir directamente mediante su conector.', `- [agent-forge-copilot-elevenlabs-creative-studio](<${dependency('elevenlabs-creative-studio')}>): producción creativa mediante el servidor MCP conectado.`)
      .replace('- `text-to-speech` del mismo proveedor: trabajar con síntesis de voz cuando el encargo requiera su API o integración en código.', `- [agent-forge-copilot-elevenlabs-text-to-speech](<${dependency('elevenlabs-text-to-speech')}>): síntesis de voz con los modelos y parámetros disponibles.`)
      .replace('- `speech-to-text` del mismo proveedor: transcripción y sus opciones pertinentes.', `- [agent-forge-copilot-elevenlabs-speech-to-text](<${dependency('elevenlabs-speech-to-text')}>): transcripción, tiempos y exportación de subtítulos.`);
    replace('Consulta las opciones actuales del modelo y de la herramienta.',
      'Consulta las opciones actuales del modelo y de la herramienta en su esquema negociado. Escoge un modelo compatible con el idioma y la dirección solicitada; utiliza el valor predeterminado documentado por la herramienta cuando sea adecuado. No envíes etiquetas de emoción, SSML o parámetros sin comprobar compatibilidad. En narraciones largas utiliza únicamente mecanismos de continuidad soportados.');
    replace('Las generaciones consumen créditos.',
      'Las generaciones consumen créditos. Si el servidor expone una estimación, úsala con los campos de su esquema antes de una generación que la requiera. Define el número de variantes conforme al encargo y a la operación concreta; una adaptación local no establece cuatro variantes por defecto para todos los modelos. Expresa el número real en la estimación, respeta los límites autorizados y no extrapoles un costo por variante como costo total. No envíes un parámetro de estimación que no figure en el esquema activo.');
  }

  // The common role procedure is also embedded at the start of every research agent.
  replace('Use this procedure only for a scientific assignment supplied',
      `Use this procedure only for an authorized scientific assignment supplied by the research coordinator in the current Copilot chat. Roles are installed as named custom agents and skills. The scientific source catalog is \`${research}/research-roster.json\`; its relative scientific script paths resolve inside \`${research}\`. Locate adapted skill procedures in \`${skills}\` and use \`${runtime}/catalog.json\` for exact installed names, original model assignments and coverage.`);

  const aliases: Record<string, string> = {
    'zotero:Zotero': 'zotero', 'jupyter-notebook': 'jupyter-notebook',
    'documents:documents': 'documents', 'presentations:Presentations': 'presentations',
    'spreadsheets:Spreadsheets': 'spreadsheets', 'pdf:pdf': 'pdf',
  };
  for (const [original, mapped] of Object.entries(aliases)) {
    output = output.replaceAll(`\`${original}\``, `\`agent-forge-copilot-${mapped}\` ([installed procedure](<${dependency(mapped)}>))`);
  }
  // Absolute source-cache links become stable installed dependency entry points.
  output = output.replace(/(?:[A-Z]:[\\/][^\n`<>]*?|~[\\/])\.codex[\\/]plugins[\\/]cache[\\/][^\n`<>]*?[\\/]skills[\\/](documents|presentations|spreadsheets|pdf|latex|jupyter-notebook|zotero|creative-studio|text-to-speech|speech-to-text)[\\/]SKILL\.md/gi,
    (_whole, name: string) => dependency(['creative-studio', 'text-to-speech', 'speech-to-text'].includes(name.toLowerCase()) ? `elevenlabs-${name.toLowerCase()}` : name.toLowerCase()));
  output = output.replaceAll('~/.codex/skills/', `${skills}/`).replaceAll('C:\\Users\\rober\\.codex\\skills\\', `${skills}/`);
  for (const folder of ['research-specialists', 'independent-specialists', 'consulting-specialist']) {
    output = output.replaceAll(`C:\\Users\\rober\\.codex\\${folder}`, `${runtime}/${folder}`)
      .replaceAll(`~/.codex/${folder}`, `${runtime}/${folder}`)
      .replaceAll(`CODEX_HOME/${folder}`, `${runtime}/${folder}`);
  }
  output = output.replaceAll('$env:CODEX_THREAD_ID', '$CopilotSessionId');
  return output;
}
