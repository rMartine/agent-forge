import { readFile, readdir } from 'node:fs/promises';
import * as path from 'node:path';
import { parseDocument, stringify } from 'yaml';
import type { CopilotHarness, DeploymentArtifact, DeploymentManifestV3, Diagnostic } from './types.js';
import { resolveRepoFilePath, resolveTargetPath } from './paths.js';
import { hashBuffer } from './hash.js';
import { renderCodexAgent, parseCodexToml } from './renderCodex.js';
import { renderCodexSkillBundle, codexSkillMap } from './skillBundles.js';
import { loadExternalSkillCatalog, resolveExternalSkillFiles } from './externalSkills.js';
import { renderProductDevelopmentSkill } from './productDevelopment.js';
import { renderCopilotHooks } from './copilotHooks.js';
import { renderCopilotScientificRuntime } from './copilotScientificRuntime.js';
import { adaptCopilotProcedure } from './copilotProcedureAdaptations.js';
import { diagnostic } from './diagnostics.js';

interface Roster { id: string; name: string; coordinator: { id: string; name: string; model?: string; reasoning?: string }; specialistCount: number; skillCount: number; coordinationSkill: string; }
interface Agent { id: string; roster: string; description: string; body: string; source: string; model?: string; reasoning?: string; readOnly: boolean; coordinator?: boolean; skills: string[]; }
interface Skill { id: string; roster: string; source: string; dependency: boolean; }
interface PendingFile { id: string; type: DeploymentArtifact['type']; sourcePath: string; targetPath: string; content: Buffer; adapt: boolean; }
const posix = (s: string): string => s.replaceAll('\\', '/');
const key = (s: string): string => path.resolve(s).toLowerCase();
const json = (value: unknown): Buffer => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const newName = (name: string): string => name.startsWith('agent-forge-copilot-') ? name : `agent-forge-copilot-${name.replace(/^agent-forge-/, '')}`;
const textFile = (file: string): boolean => /\.(?:md|txt|json|jsonc|ya?ml|toml|ps1|sh|py|mjs|cjs|js|ts|html|css|tex|bib|csv|svg)$/i.test(file) || /(?:^|[\\/])(?:LICENSE|NOTICE|COPYING)$/i.test(file);

async function tree(root: string): Promise<string[]> {
  const result: string[] = [];
  for (const entry of (await readdir(root, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (['node_modules', '__pycache__', '.git', '.pytest_cache', '.venv'].includes(entry.name)) continue;
    if (entry.isSymbolicLink()) throw new Error(`Copilot resources must be regular files: ${path.join(root, entry.name)}`);
    if (entry.isDirectory()) result.push(...await tree(path.join(root, entry.name)));
    else if (entry.isFile()) result.push(path.join(root, entry.name));
  }
  return result;
}

/** Render full sources to one transactional target. This function never starts a session or executes a hook. */
export async function renderCopilotRosters(repoPath: string, manifest: DeploymentManifestV3, options: { harness?: CopilotHarness; downloadSkills?: boolean; availableModels?: string[] } = {}): Promise<{ artifacts: DeploymentArtifact[]; diagnostics: Diagnostic[] }> {
  const config = manifest.copilotFourRosters;
  if (!config) throw new Error('Four-roster configuration is missing');
  const harness = options.harness ?? config.defaultHarness;
  if (!['copilot', 'local'].includes(harness)) throw new Error('Unsupported Copilot harness');
  const configPath = resolveRepoFilePath(repoPath, config.catalog);
  const catalog = JSON.parse(await readFile(configPath, 'utf8')) as { schemaVersion: number; rosters: Roster[]; expected: { coordinators: number; specialists: number; ownSkills: number } };
  if (catalog.schemaVersion !== 1 || catalog.rosters.length !== 4) throw new Error('Invalid four-roster catalog');
  const runtimeRoot = resolveTargetPath(config.runtimeRoot);
  const skillRoot = resolveTargetPath(manifest.targets.vscode.skills);
  const agentRoot = resolveTargetPath(manifest.targets.vscode.agents);
  const hookRoot = resolveTargetPath(manifest.targets.vscode.hooks);
  const pending: PendingFile[] = [];
  const agents: Agent[] = [];
  const skills: Skill[] = [];
  const diagnostics: Diagnostic[] = [];
  const clientInventoryPath = path.resolve(runtimeRoot, '..', 'client-inventory.json');
  let client: { capturedAt?: string; models: Array<{ id: string; name?: string; family?: string }>; tools: Array<{ name: string; description?: string; inputSchema?: object }> } = {models:[],tools:[]};
  try {
    const observed = JSON.parse(await readFile(clientInventoryPath, 'utf8'));
    if (Array.isArray(observed.models) && Array.isArray(observed.tools)) client = {capturedAt:observed.capturedAt,models:observed.models,tools:observed.tools};
  } catch { diagnostics.push(diagnostic('AF004', 'warning', 'VS Code metadata inventory is unavailable. Export it with Agent Forge: Export Copilot Model and Tool Metadata; no model or tool execution is required.')); }
  const providerFor = (name: string): string | undefined => /^mcp_canva_/.test(name) ? 'canva' : /^mcp_github_/.test(name) ? 'github' : /^mcp_gitkraken_/.test(name) ? 'gitkraken' : /^mcp_.*digitaloc/.test(name) ? 'digitalocean' : /^mcp_.*eleven/.test(name) ? 'elevenlabs' : /^mcp_.*shotstack/.test(name) ? 'shotstack' : undefined;
  const toolMappings: Array<{original: string; configured: string | null; status: string}> = [];
  const names = new Map<string, string>();
  const sourceTargets = new Map<string, string>();
  const add = (id: string, type: PendingFile['type'], sourcePath: string, targetPath: string, content: Buffer, adapt = true): void => {
    pending.push({ id, type, sourcePath, targetPath, content, adapt: adapt && !/(?:SOURCE|PROVENANCE)\.json$|(?:^|[\\/])(?:LICENSE|NOTICE|COPYING)(?:\.[^/\\]+)?$/i.test(targetPath) });
    if (!sourceTargets.has(key(sourcePath))) sourceTargets.set(key(sourcePath), targetPath);
  };
  const registerSkill = (original: string, roster: string, source: string, dependency = false): string => {
    const id = newName(original);
    if (skills.some(skill => skill.id === id)) throw new Error(`Duplicate Copilot skill ${id}`);
    names.set(original, id);
    skills.push({ id, roster, source, dependency });
    return id;
  };
  const copySkill = async (source: string, original: string, roster: string, dependency = false): Promise<void> => {
    const id = registerSkill(original, roster, source, dependency);
    for (const file of await tree(source)) add(`${id}/${posix(path.relative(source, file))}`, 'skill', file, path.join(skillRoot, id, path.relative(source, file)), await readFile(file));
  };

  const external = await loadExternalSkillCatalog(repoPath, manifest);
  for (const bundle of Object.values(manifest.codex.skillBundles)) {
    const id = registerSkill(bundle.deploymentName, 'development', bundle.entrypoint);
    for (const file of await renderCodexSkillBundle(repoPath, manifest, bundle)) add(`${id}/${posix(file.relativePath)}`, 'skill', file.sourcePath, path.join(skillRoot, id, file.relativePath), file.content);
    // Preserve resources beyond the legacy renderer's flattened Markdown references.
    for (const component of bundle.componentSkills) {
      const source = resolveRepoFilePath(repoPath, manifest.skills.find(item => item.id === component)!.source);
      for (const file of await tree(source)) {
        if (pending.some(item => key(item.sourcePath) === key(file))) continue;
        add(`${id}/resources/${component}/${posix(path.relative(source, file))}`, 'skill', file, path.join(skillRoot, id, 'resources', component, path.relative(source, file)), await readFile(file));
      }
    }
  }
  for (const skill of external.skills) {
    const id = registerSkill(skill.deploymentName, 'development', skill.repositoryUrl);
    for (const file of await resolveExternalSkillFiles(repoPath, skill, options.downloadSkills)) add(`${id}/${posix(file.relativePath)}`, 'skill', file.sourcePath, path.join(skillRoot, id, file.relativePath), file.content);
  }
  const product = manifest.codex.productDevelopment;
  if (!product) throw new Error('Development coordination skill is required');
  const productId = registerSkill(product.deploymentName, 'development', product.source);
  for (const file of await renderProductDevelopmentSkill(repoPath, manifest, external)) {
    if (/^scripts[\\/](?:product-(?:session|hooks)\.mjs|hook-storage\.mjs|product-roles\.json)$/.test(file.relativePath)) continue;
    add(`${productId}/${posix(file.relativePath)}`, 'skill', file.sourcePath, path.join(skillRoot, productId, file.relativePath), file.content);
  }
  for (const script of ['product-hooks.mjs', 'product-session.mjs', 'hook-storage.mjs']) {
    const source = resolveRepoFilePath(repoPath, `${product.hooksSource}/${script}`);
    add(`runtime/development/${script}`, 'hook', source, path.join(runtimeRoot, 'development', script), await readFile(source), false);
  }
  if (manifest.codex.graphify) {
    const scriptRoot = path.join(skillRoot, productId, 'scripts');
    const client = resolveRepoFilePath(repoPath, 'hooks/codex/graphify-client.cjs');
    add(`${productId}/scripts/graphify-client.cjs`, 'skill', client, path.join(scriptRoot, 'graphify-client.cjs'), await readFile(client), false);
    for (const name of ['graphifyCommand.js', 'graphifyRuntime.js', 'graphifyIndex.js', 'graphifyFiles.js', 'graphifyProcess.js']) {
      const source = path.join(__dirname, name);
      add(`${productId}/scripts/graphify/${name}`, 'skill', source, path.join(scriptRoot, 'graphify', name), await readFile(source), false);
    }
    const managedRoot = resolveTargetPath(manifest.codex.graphify.managedRoot);
    let runtimeId: string | null = null;
    let runtimeHash: string | undefined;
    try {
      const bytes = await readFile(path.join(managedRoot, 'runtime.json'));
      runtimeId = JSON.parse(bytes.toString('utf8')).runtimeId;
      runtimeHash = hashBuffer(bytes);
    } catch { diagnostics.push(diagnostic('AF012', 'warning', 'Graphify helpers included; existing binary runtime descriptor was not found. No index or research was executed.')); }
    add(`${productId}/scripts/graphify-runtime.json`, 'skill', manifest.codex.graphify.lockFile, path.join(scriptRoot, 'graphify-runtime.json'), json({ schemaVersion: 1, managedRoot, runtimeId, ...(runtimeHash ? { runtimeHash } : {}) }), false);
  }
  for (const agent of Object.values(manifest.codex.agents)) {
    const source = resolveRepoFilePath(repoPath, manifest.agents[agent.sourceAgent].source);
    const extra = external.skills.filter(skill => skill.agentIds.includes(agent.id)).map(skill => skill.deploymentName);
    const data = parseCodexToml(renderCodexAgent(await readFile(source, 'utf8'), agent, manifest, extra));
    agents.push({ id: agent.id, roster: 'development', description: String(data.description), body: String(data.developer_instructions), source, model: agent.model, reasoning: agent.modelReasoningEffort, readOnly: agent.sandboxMode === 'read-only', skills: [...agent.requiredSkillBundles.map(id => manifest.codex.skillBundles[id].deploymentName), ...extra].map(newName) });
  }
  const researchRoot = resolveRepoFilePath(repoPath, 'packages/research-specialists');
  const research = JSON.parse(await readFile(path.join(researchRoot, 'research-roster.json'), 'utf8'));
  for (const role of research.specialists) {
    const source = path.join(researchRoot, role.roleFile);
    const body = [await readFile(path.join(researchRoot, 'roles/research-specialist-common.md'), 'utf8'), await readFile(source, 'utf8'), `Required completion evidence: ${JSON.stringify(role.completionEvidence)}.`, `Assigned skills: ${role.skills.map((s: string) => newName(`agent-forge-research-${s.split('/')[1]}`)).join(', ')}. External skills: ${JSON.stringify(role.externalSkills)}.`, 'Return scientific decisions, findings and deliverables to the coordinator. Do not delegate.'].join('\n\n');
    agents.push({ id: role.id, roster: 'research', description: role.name, body, source, model: role.model, reasoning: role.reasoning, readOnly: !!role.readOnly, skills: role.skills.map((s: string) => newName(`agent-forge-research-${s.split('/')[1]}`)) });
  }
  for (const entry of await readdir(path.join(researchRoot, 'skills'), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    await copySkill(path.join(researchRoot, 'skills', entry.name), `agent-forge-research-${entry.name}`, 'research');
    names.set(entry.name, newName(`agent-forge-research-${entry.name}`));
  }
  for (const [folder, roster] of [['independent-specialists', 'communication'], ['consulting-specialist', 'consulting']]) {
    const root = resolveRepoFilePath(repoPath, `packages/${folder}`);
    const packageManifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
    for (const file of await tree(path.join(root, 'agents'))) {
      if (!file.endsWith('.toml')) continue;
      const data = parseCodexToml(await readFile(file, 'utf8'));
      const role = packageManifest.agents.find((item: { name: string }) => item.name === data.name);
      agents.push({ id: String(data.name), roster, description: String(data.description), body: String(data.developer_instructions), source: file, model: data.model as string | undefined, reasoning: data.model_reasoning_effort as string | undefined, readOnly: data.sandbox_mode === 'read-only', skills: (role?.skills ?? []).map(newName) });
    }
    for (const entry of await readdir(path.join(root, 'skills'), { withFileTypes: true })) if (entry.isDirectory()) await copySkill(path.join(root, 'skills', entry.name), entry.name, roster);
  }
  const dependencyRoot = resolveRepoFilePath(repoPath, 'packages/copilot-dependencies');
  const dependencies = JSON.parse(await readFile(path.join(dependencyRoot, 'manifest.json'), 'utf8'));
  for (const skill of dependencies.skills) await copySkill(resolveRepoFilePath(repoPath, skill.source), skill.id, 'dependencies', true);
  for (const file of await tree(path.join(dependencyRoot, dependencies.runtimeDir))) add(`runtime/dependencies/${posix(path.relative(path.join(dependencyRoot, dependencies.runtimeDir), file))}`, 'hook', file, path.join(runtimeRoot, 'dependencies', path.relative(path.join(dependencyRoot, dependencies.runtimeDir), file)), await readFile(file));

  // Shared runtime contains the complete scientific package; discovery uses only .copilot/skills.
  // Communication/consulting point at that single discovered skill library, including styles.
  for (const folder of ['research-specialists', 'independent-specialists', 'consulting-specialist']) {
    const root = resolveRepoFilePath(repoPath, `packages/${folder}`);
    for (const file of await tree(root)) {
      const rel = posix(path.relative(root, file));
      if (/^(?:test|tests|evals|\.git)[/]/.test(rel) || /^(?:install|verify-native)\.mjs$/.test(rel) || /^agents\//.test(rel) || ['hooks/hooks.json', 'README.md', 'evaluation-cases.md'].includes(rel)) continue;
      if (folder !== 'research-specialists' && rel.startsWith('skills/')) continue;
      let bytes = await readFile(file);
      if (folder !== 'research-specialists' && rel === 'manifest.json') {
        const data = JSON.parse(bytes.toString('utf8'));
        data.skillDirectory = posix(skillRoot);
        for (const role of data.agents) role.skills = role.skills.map(newName);
        data.externalTools = (data.externalTools ?? []).flatMap((original: string) => {
          const match = original.match(/^mcp__codex_apps__(canva|elevenlabs|shotstack)_(.+)$/);
          const suffix = match?.[2].replaceAll('_', '-');
          const candidates = match ? client.tools.filter(tool => providerFor(tool.name) === match[1] && tool.name.endsWith('_' + suffix)) : [];
          const configured = candidates.length === 1 ? candidates[0].name : null;
          toolMappings.push({original,configured,status:configured ? 'same-operation-name-observed; consult live schema' : 'no-unambiguous-observed-tool; authorization rules still accept exact live names'});
          return configured ? [configured] : [];
        });
        bytes = json(data);
      }
      if (folder === 'research-specialists' && rel === 'research-roster.json') {
        const data = JSON.parse(bytes.toString('utf8'));
        const externalNames: Record<string,string> = {'zotero:Zotero':'agent-forge-copilot-zotero','jupyter-notebook':'agent-forge-copilot-jupyter-notebook'};
        for (const role of data.specialists) role.externalSkills = role.externalSkills.map((name:string) => externalNames[name] ?? name);
        bytes = json(data);
      }
      if (folder === 'research-specialists' && rel === 'manifest.json') {
        const data = JSON.parse(bytes.toString('utf8'));
        data.hooks = posix(path.join(hookRoot, 'agent-forge-rosters.json'));
        data.client = 'vscode-copilot';
        bytes = json(data);
      }
      add(`runtime/${folder}/${rel}`, 'hook', file, path.join(runtimeRoot, folder, rel), bytes, !/\.(?:mjs|cjs|js|py)$/.test(file));
    }
  }
  // Explicit aliases never replace a model or expose a second discoverable skill.
  for (const [old, id] of codexSkillMap(manifest)) names.set(old, newName(id));
  const dependencyAliases: Record<string, string> = {
    'zotero:Zotero': 'agent-forge-copilot-zotero', 'jupyter-notebook': 'agent-forge-copilot-jupyter-notebook',
    'documents:documents': 'agent-forge-copilot-documents', 'presentations:Presentations': 'agent-forge-copilot-presentations',
    'spreadsheets:Spreadsheets': 'agent-forge-copilot-spreadsheets', 'pdf:pdf': 'agent-forge-copilot-pdf',
    'creative-studio': 'agent-forge-copilot-elevenlabs-creative-studio', 'text-to-speech': 'agent-forge-copilot-elevenlabs-text-to-speech', 'speech-to-text': 'agent-forge-copilot-elevenlabs-speech-to-text',
  };
  for (const [old, id] of Object.entries(dependencyAliases)) names.set(old, id);
  const helper = posix(path.join(runtimeRoot, 'hooks/session.mjs'));
  function adapt(source: string, file: PendingFile): string {
    // Runtime IDs, executable contracts and provenance must not be rewritten as prose.
    if (!/\.(?:md|txt|ya?ml)$/i.test(file.targetPath)) return source.replaceAll('__COPILOT_RUNTIME__', posix(runtimeRoot));
    const roster = file.id.includes('research') ? 'research' : file.id.includes('consulting') ? 'consulting' : file.id.includes('independent') ? 'communication' : 'development';
    let result = adaptCopilotProcedure(source, {sourcePath:file.sourcePath,targetPath:file.targetPath,runtimeRoot,skillRoot,roster}).replaceAll('\r\n', '\n').replaceAll('__COPILOT_RUNTIME__', posix(runtimeRoot));
    // Resolve links against their original file before identifier rewriting.
    result = result.replace(/\]\((<[^>]+>|[^)]+)\)/g, (whole, raw: string) => {
      const target = raw.replace(/^<|>$/g, '');
      if (/^(?:[a-z]+:|#|\/)/i.test(target)) return whole;
      const [filename, anchor] = target.split('#');
      let destination = sourceTargets.get(key(path.resolve(path.dirname(file.sourcePath), filename)));
      if (!destination && file.type === 'agent') {
        const coordination = catalog.rosters.find(item => item.coordinator.id === file.id);
        const candidate = coordination && path.resolve(skillRoot, coordination.coordinationSkill, filename);
        if (candidate && pending.some(item => key(item.targetPath) === key(candidate))) destination = candidate;
      }
      return destination ? `](<${posix(destination)}${anchor ? '#' + anchor : ''}>)` : whole;
    });
    for (const [old, id] of [...names].sort((a, b) => b[0].length - a[0].length)) {
      result = result.replace(new RegExp(`(?<![a-z0-9/\\\\-])${old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z0-9/\\\\-])`, 'g'), id);
    }
    for (const agent of agents.filter(item => !item.coordinator)) result = result.replaceAll('`' + agent.id + '`', '`agent-forge-copilot-' + agent.id + '`');
    for (const folder of ['research-specialists', 'independent-specialists', 'consulting-specialist']) {
      result = result.replaceAll(`~/.codex/${folder}`, posix(path.join(runtimeRoot, folder)))
        .replaceAll(`CODEX_HOME/${folder}`, posix(path.join(runtimeRoot, folder)))
        .replaceAll(`C:\\Users\\rober\\.codex\\${folder}`, path.join(runtimeRoot, folder));
    }
    result = result.replace(/node\s+(?:"\$ResearchRoot\/scripts\/research-session\.mjs"|\S*research-session\.mjs)/g, `node "${helper}" research`)
      .replace(/node\s+(?:<skill-directory>\/scripts\/product-session\.mjs|\S*product-session\.mjs)/g, `node "${helper}" development`)
      .replace(/node assignment\.mjs/g, `node "${helper}" ${roster}`)
      .replaceAll('$env:CODEX_THREAD_ID', '$CopilotSessionId').replaceAll('CODEX_THREAD_ID', 'the actual client session identifier')
      .replaceAll('CODEX_HOME', 'the managed Copilot runtime directory')
      .replaceAll('mcp__codex_apps__', 'MCP_SCHEMA_REQUIRED_')
      .replaceAll('mcp__codex_app__', 'COPILOT_LOCAL_ADAPTER_')
      .replaceAll('collaboration.spawn_agent', 'the Copilot agent delegation tool').replaceAll('spawn_agent', 'the Copilot agent delegation tool')
      .replaceAll('functions.exec_command', 'the direct VS Code terminal tool').replaceAll('exec_command', 'the direct VS Code terminal tool')
      .replaceAll('Codex Desktop', 'VS Code').replaceAll('Codex runtime contract', 'Copilot runtime contract').replaceAll('Codex', 'Copilot');
    if (file.type === 'skill' && /[/\\]SKILL\.md$/.test(file.targetPath)) result = result.replace(/^name:.*$/m, `name: ${file.id.split('/')[0]}`);
    return result;
  }
  for (const roster of catalog.rosters) {
    const own = agents.filter(a => a.roster === roster.id);
    const ownSkills = skills.filter(s => s.roster === roster.id);
    if (own.length !== roster.specialistCount || ownSkills.length !== roster.skillCount) throw new Error(`Roster ${roster.id}: expected ${roster.specialistCount}/${roster.skillCount}, got ${own.length}/${ownSkills.length}`);
    const skill = pending.find(file => file.id === `${roster.coordinationSkill}/SKILL.md`);
    if (!skill) throw new Error(`Missing coordination procedure ${roster.coordinationSkill}`);
    agents.push({ id: roster.coordinator.id, roster: roster.id, coordinator: true, description: `Coordinar el Roster de ${roster.name}; asignar especialistas e integrar entregables.`, body: skill.content.toString('utf8').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, ''), source: skill.sourcePath, model: roster.coordinator.model, reasoning: roster.coordinator.reasoning, readOnly: false, skills: [roster.coordinationSkill] });
  }
  if (agents.length !== 45 || agents.filter(a => a.model && !a.coordinator).length !== 40 || skills.filter(s => !s.dependency).length !== 60) throw new Error('Four-roster counts/model conservation mismatch');
  const copilotName = (agent: Pick<Agent, 'id' | 'coordinator'>): string => agent.coordinator ? agent.id : `agent-forge-copilot-${agent.id}`;
  const specialists = agents.filter(a => !a.coordinator).map(copilotName);
  for (const agent of agents) {
    const providers = agent.coordinator ? ['github','gitkraken','digitalocean','canva','elevenlabs','shotstack'] : agent.roster === 'development' ? ['github','gitkraken','digitalocean'] : agent.roster === 'research' ? ['github'] : agent.roster === 'communication' ? ['canva','elevenlabs','shotstack'] : ['canva'];
    const mcpTools = providers.flatMap(provider => { const observed = client.tools.filter(tool => providerFor(tool.name) === provider).map(tool => tool.name); return observed.length ? observed : [provider + '/*']; });
    const tools = agent.readOnly ? ['read', 'search', 'web'] : ['read', 'search', 'edit', 'execute', 'web', ...mcpTools, ...(agent.coordinator ? ['agent'] : [])];
    const header = { name: copilotName(agent), description: agent.description, 'user-invocable': !!agent.coordinator, 'disable-model-invocation': !!agent.coordinator, tools, agents: agent.coordinator ? specialists : [], ...(agent.model ? { model: agent.model } : {}) };
    const runtimeContract = [
      `# Contrato de ejecución Copilot: ${agent.id}`,
      `Responsabilidad: ${agent.coordinator ? 'coordinar, asignar, integrar y entregar' : 'completar únicamente el encargo y devolver resultados al coordinador'}.`,
      'Los nombres de perfiles Copilot de especialistas llevan el prefijo agent-forge-copilot- seguido por el identificador original del rol. Usa ese nombre exacto al delegar. Los catálogos científicos y registros internos conservan sus identificadores de rol originales.',
      agent.coordinator ? 'Puedes asignar especialistas de los cuatro rosters según la responsabilidad necesaria. Mantén dueño, contexto mínimo autorizado, límites, cliente y proyecto de cada encargo. Utiliza la herramienta agent con el perfil por nombre; no crees chats independientes. Nunca sustituyas modelos indisponibles.' : 'No delegues. Si necesitas otra especialidad, devuelve la tarea concreta al coordinador. agents: [] es deliberado.',
      agent.readOnly ? 'Sólo lectura. No uses herramientas de terminal, escritura ni MCP mutadoras. Devuelve propuestas y evidencia al coordinador para su registro.' : 'Conserva permisos, autorizaciones y límites del usuario y del cliente.',
      agent.model ? `Modelo original requerido: ${agent.model}. Esfuerzo original: ${agent.reasoning}. Copilot no documenta un campo frontmatter equivalente al esfuerzo; esta asignación se conserva en el catálogo. No se ha comprobado disponibilidad ejecutando modelos.` : 'Hereda el modelo seleccionado en el chat.',
      `Lee las skills pertinentes: ${agent.skills.join(', ')}.`,
      ...(['frontend-developer', 'ux-engineer'].includes(agent.id) ? ['Para dirección visual usa la biblioteca única $agent-forge-copilot-communication-design-styles v1.1.0.'] : []),
      `Para estado y autorizaciones usa node "${helper}" ${agent.roster} <comando> --session <ID-real-del-cliente> --project <ruta-absoluta>. No invoques directamente los auxiliares originales.`,
      `Lee ${posix(path.join(runtimeRoot, 'hooks/coverage.json'))} y ${posix(path.join(runtimeRoot, 'COPILOT-COMPATIBILITY.md'))}. Los eventos sin identidad suficiente se registran como cobertura incompleta. Stop termina un turno, no una sesión. Suspender/cerrar requiere el auxiliar salvo un evento real informado por el motor.`,
      'Los nombres de herramientas MCP se obtienen del catálogo negociado por VS Code. Un nombre histórico no acredita disponibilidad ni esquema; conserva límites y consulta el esquema antes de operar.',
    ].join('\n\n');
    const file: PendingFile = { id: agent.id, type: 'agent', sourcePath: agent.source, targetPath: path.join(agentRoot, `${copilotName(agent)}.agent.md`), content: Buffer.alloc(0), adapt: false };
    add(agent.id, 'agent', agent.source, file.targetPath, Buffer.from(`---\n${stringify(header)}---\n\n${runtimeContract}\n\n${adapt(agent.body, file)}\n`), false);
    if (agent.model) diagnostics.push(diagnostic('AF011', 'warning', `${agent.id}: original model ${agent.model} retained; ${options.availableModels?.includes(agent.model) || client.models.some(model => model.id === agent.model) ? 'listed by client' : client.capturedAt ? 'not exposed by the inspected VS Code metadata API; no substitute selected' : 'availability not established in this client'}. Original reasoning ${agent.reasoning} is catalog metadata, not a supported frontmatter control.`, { agentId: agent.id }));
  }
  const hooks = await renderCopilotHooks(repoPath, runtimeRoot, harness);
  for (const file of hooks.files) add(`runtime/${posix(file.relativePath)}`, 'hook', file.sourcePath, path.join(runtimeRoot, file.relativePath), file.content, false);
  for (const file of hooks.hookFiles) add(`copilot-hooks/${file.name}`, 'hook', configPath, path.join(hookRoot, file.name), file.content, false);
  const guide = resolveRepoFilePath(repoPath, 'docs/copilot-four-rosters.md');
  add('runtime/COPILOT-COMPATIBILITY.md', 'hook', guide, path.join(runtimeRoot, 'COPILOT-COMPATIBILITY.md'), await readFile(guide), false);
  add('runtime/client-catalog.json', 'hook', clientInventoryPath, path.join(runtimeRoot, 'client-catalog.json'), json({...client,toolMappings,verification:'metadata-only; no inference, tool invocation or generation'}), false);

  const adapted = pending.map(file => ({ ...file, content: file.adapt && textFile(file.targetPath) ? Buffer.from(adapt(file.content.toString('utf8'), file)) : file.content }));
  for (const file of await renderCopilotScientificRuntime(repoPath, runtimeRoot, adapted)) {
    const targetPath = path.join(runtimeRoot, file.relativePath);
    const index = adapted.findIndex(item => key(item.targetPath) === key(targetPath));
    const item = { id: `runtime/${posix(file.relativePath)}`, type: 'hook' as const, sourcePath: file.sourcePath, targetPath, content: file.content, adapt: false };
    if (index >= 0) adapted[index] = item; else adapted.push(item);
  }
  const unique = new Set<string>();
  for (const file of adapted) {
    if (unique.has(key(file.targetPath))) throw new Error(`Duplicate planned target ${file.targetPath}`);
    unique.add(key(file.targetPath));
    if (file.type === 'agent' || (file.type === 'skill' && file.targetPath.endsWith('SKILL.md'))) {
      const header = file.content.toString('utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!header) throw new Error(`Missing frontmatter ${file.id}`);
      const doc = parseDocument(header[1], { uniqueKeys: true });
      if (doc.errors.length) throw new Error(`Invalid frontmatter ${file.id}: ${doc.errors.join('; ')}`);
    }
  }
  const installedCatalog = { ...catalog, harness, runtimeRoot, skillRoot, modelExecution: 'not-tested', clientMetadataCapturedAt:client.capturedAt, agents: agents.map(({ body, ...agent }) => ({ ...agent, copilotName: copilotName(agent), sourceHash: hashBuffer(Buffer.from(body)), configuredModel: agent.model ?? 'inherit', modelAdvertised:agent.model ? client.models.some(model=>model.id===agent.model) : null, reasoningRepresentable: false })), skills, dependencies, hookCoverage: hooks.coverage, files: adapted.map(file => ({ id: file.id, path: file.targetPath, sha256: hashBuffer(file.content), source: file.sourcePath })) };
  adapted.push({ id: 'runtime/catalog.json', type: 'hook', sourcePath: configPath, targetPath: path.join(runtimeRoot, 'catalog.json'), content: json(installedCatalog), adapt: false });
  return { artifacts: adapted.map(file => ({ id: file.id, type: file.type, runtime: 'vscode', sourcePath: file.sourcePath, targetPath: file.targetPath, content: file.content, sourceHash: hashBuffer(file.content) })), diagnostics };
}
