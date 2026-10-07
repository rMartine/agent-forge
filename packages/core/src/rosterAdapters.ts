import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { stringify } from 'yaml';
import type { RosterCatalog as CanonicalRosterCatalog, ArtifactEdition, CanonicalAgent } from './rosterTypes.js';
import type { Diagnostic } from './types.js';
import type { SharedHooksGroups } from './sharedHooks.js';
import { hashBuffer } from './hash.js';
import { diagnostic } from './diagnostics.js';
import { adaptCopilotProcedure } from './copilotProcedureAdaptations.js';
import { adaptOpenCodeProcedure } from './openCodeProcedures.js';
import { addScientificIntegrity } from './editionScientificRuntime.js';
import { resolveTargetPath } from './paths.js';

const toml = require('smol-toml') as { stringify(value: Record<string, unknown>): string };
const posix = (s: string): string => s.replaceAll('\\', '/');
const json = (value: unknown): Buffer => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const quoted = (value: string): string => `'${value.replaceAll("'", "''")}'`;
export interface EditionFile { id: string; type: 'agent' | 'skill' | 'hook' | 'instruction'; relativePath: string; sourcePath: string; content: Buffer; }
export interface EditionContext { repoPath: string; agentRoot: string; skillRoot: string; runtimeRoot: string; hooksRoot?: string; harness?: 'local' | 'copilot'; availableModels?: string[]; availableTools?: string[]; portable?: boolean; }
export interface EditionResult { edition: ArtifactEdition; files: EditionFile[]; diagnostics: Diagnostic[]; coverage: unknown; hookGroups?: SharedHooksGroups; }

export const delegationContract = 'You may delegate to any suitable available agent, including agents in other rosters, whenever useful for the authorized assignment. Subagents may delegate further. Give each child a bounded objective, context, file ownership and expected result; integrate its findings. Preserve the scope, permissions and read-only restrictions of every ancestor. Respect native concurrency limits and stop conditions; do not repeatedly delegate the same task. Coordinators are optional, not exclusive delegation gateways.';
export const hookPolicies = ['assignment-context', 'delegation-lineage', 'authorization-boundaries', 'tool-results', 'completion-evidence', 'interruption', 'session-closure'];

export function editionAgentName(agent: Pick<CanonicalAgent, 'id' | 'coordinator'>, edition: ArtifactEdition): string {
  return edition === 'vscode' && !agent.coordinator ? `agent-forge-copilot-${agent.id}` : agent.id;
}
export function editionSkillName(name: string, edition: ArtifactEdition): string {
  return edition === 'vscode' ? `agent-forge-copilot-${name.replace(/^agent-forge-/, '')}` : name;
}
export function catalogFingerprint(catalog: CanonicalRosterCatalog): string {
  return hashBuffer(json({ rosters: catalog.rosters, agents: catalog.agents.map(({sourcePath, ...agent}) => agent), resources: catalog.resources.map(r => ({id:r.id,kind:r.kind,relativePath:posix(r.relativePath),sha256:hashBuffer(r.content)})), hookPolicies }));
}
export function editionFileTarget(file: EditionFile, context: EditionContext): string {
  const [kind, ...parts] = file.relativePath.split('/');
  const root = kind === 'agents' ? context.agentRoot : kind === 'skills' ? context.skillRoot : kind === 'hooks' ? context.hooksRoot ?? path.join(context.runtimeRoot, 'hooks') : context.runtimeRoot;
  return path.join(root, ...parts);
}

/** All editions consume this same resolved catalog; no edition reads another edition's output. */
export async function renderRosterEdition(catalog: CanonicalRosterCatalog, edition: ArtifactEdition, context: EditionContext): Promise<EditionResult> {
  const files: EditionFile[] = [], diagnostics = [...catalog.diagnostics];
  let observedTools=context.availableTools??[];
  if(edition==='vscode'&&!context.portable&&!observedTools.length){
    try{const inventory=JSON.parse(await readFile(path.resolve(context.runtimeRoot,'..','client-inventory.json'),'utf8'));observedTools=(inventory.tools??[]).map((t:{name:string})=>t.name).filter((n:unknown)=>typeof n==='string');}catch{/* Missing client metadata remains visible in coverage. */}
  }
  const names = new Map(Object.entries(catalog.aliases));
  const skillIds = [...new Set(catalog.resources.filter(r => r.kind === 'skill').map(r => posix(r.relativePath).split('/')[0]))].sort();
  for (const id of skillIds) names.set(id, editionSkillName(id, edition));
  for (const [old, canonical] of Object.entries(catalog.aliases)) {const agent=catalog.agents.find(a=>a.id===canonical);names.set(old,agent?editionAgentName(agent,edition):editionSkillName(canonical, edition));}
  const add = (id: string, type: EditionFile['type'], relativePath: string, sourcePath: string, content: Buffer): void => { files.push({id,type,relativePath:posix(relativePath),sourcePath,content}); };
  const resourcePath = (relative: string, kind: string): string => {
    const parts = posix(relative).split('/');
    if (kind === 'skill') parts[0] = editionSkillName(parts[0], edition);
    return `${kind === 'skill' ? 'skills' : 'runtime'}/${parts.join('/')}`;
  };
  const sourceTargets = new Map(catalog.resources.map(r => [path.resolve(r.sourcePath).toLowerCase(), editionFileTarget({relativePath:resourcePath(r.relativePath,r.kind)} as EditionFile, context)]));
  const helper = posix(path.join(context.runtimeRoot, 'hooks/session.mjs'));
  function prose(source: string, sourcePath: string, targetPath: string, roster: string): string {
    let result = source.replaceAll('\r\n','\n');
    if (edition === 'vscode') result = adaptCopilotProcedure(result, {sourcePath,targetPath,runtimeRoot:context.runtimeRoot,skillRoot:context.skillRoot,roster});
    if (edition === 'opencode') result = adaptOpenCodeProcedure(result, {sourcePath,targetPath,runtimeRoot:context.runtimeRoot,skillRoot:context.skillRoot,roster});
    result = result.replace(/\]\((<[^>]+>|[^)]+)\)/g, (whole, raw: string) => {
      const target = raw.replace(/^<|>$/g,'');
      if (/^(?:[a-z]+:|#|\/)/i.test(target)) return whole;
      const [name,anchor] = target.split('#'), mapped = sourceTargets.get(path.resolve(path.dirname(sourcePath),name).toLowerCase());
      return mapped ? `](<${posix(mapped)}${anchor ? '#'+anchor : ''}>)` : whole;
    });
    for (const [old,name] of [...names].sort((a,b)=>b[0].length-a[0].length)) {
      result = result.replace(new RegExp(`(?<![a-z0-9/\\\\-])${old.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?![a-z0-9/\\\\-])`,'g'),name);
    }
    for (const folder of ['research-specialists','independent-specialists','consulting-specialist']) {
      for (const prefix of ['~/.codex/', 'CODEX_HOME/', 'C:\\Users\\rober\\.codex\\']) result=result.replaceAll(prefix+folder,posix(path.join(context.runtimeRoot,folder)));
    }
    for(const prefix of ['~/.codex/skills','~/.agents/skills','CODEX_HOME/skills','C:\\Users\\rober\\.codex\\skills','C:\\Users\\rober\\.agents\\skills'])result=result.replaceAll(prefix,posix(context.skillRoot));
    if (edition !== 'codex') {
      result=result.replaceAll('collaboration.spawn_agent',edition==='vscode'?'the native agent delegation tool':'the native subagent tool');
      if (edition==='vscode') for(const agent of catalog.agents) result=result.replaceAll('`'+agent.id+'`','`'+editionAgentName(agent,edition)+'`');
      result=result.replaceAll('$env:CODEX_THREAD_ID','<actual-session-id>').replaceAll('CODEX_THREAD_ID','the actual client session identifier');
    }
    if (edition==='vscode') result=result.replace(/node\s+(?:"\$ResearchRoot\/scripts\/research-session\.mjs"|\S*research-session\.mjs)/g,`node "${helper}" research`).replace(/node assignment\.mjs/g,`node "${helper}" ${roster}`);
    return result;
  }
  for (const r of catalog.resources) {
    const relativePath=resourcePath(r.relativePath,r.kind), targetPath=editionFileTarget({relativePath} as EditionFile,context);
    let content=r.content;
    if(r.adaptation==='prose' && /\.(md|txt|ya?ml)$/i.test(relativePath) && !/(LICENSE|NOTICE|COPYING|PROVENANCE|SOURCE)/.test(path.basename(relativePath))) {
      let value=prose(content.toString('utf8'),r.sourcePath,targetPath,r.roster);
      if (r.kind==='skill' && relativePath.endsWith('/SKILL.md')) value=value.replace(/^name:.*$/m,`name: ${relativePath.split('/')[1]}`);
      content=Buffer.from(value);
    }
    if(r.kind==='runtime' && /(?:independent-specialists|consulting-specialist)\/manifest.json$/.test(relativePath)) {
      const manifest=JSON.parse(content.toString('utf8')); manifest.skillDirectory=posix(context.skillRoot);
      for(const agent of manifest.agents ?? []) agent.skills=agent.skills.map((id:string)=>editionSkillName(id,edition));
      content=json(manifest);
    }
    if(relativePath.endsWith('/scripts/graphify-runtime.json')&&!context.portable){
      const descriptor=JSON.parse(content.toString('utf8'));descriptor.managedRoot=resolveTargetPath(descriptor.managedRoot);
      try{const bytes=await readFile(path.join(descriptor.managedRoot,'runtime.json'));descriptor.runtimeId=JSON.parse(bytes.toString('utf8')).runtimeId;descriptor.runtimeHash=hashBuffer(bytes);}catch{/* Null runtimeId explicitly records unavailable Graphify. */}
      content=json(descriptor);
    }
    add(r.id,r.kind==='skill'?'skill':'hook',relativePath,r.sourcePath,content);
  }
  for(const agent of catalog.agents) {
    const name=editionAgentName(agent,edition), body=[delegationContract,agent.readOnly?'Read-only assignment: descendants must also remain read-only. Return evidence to the parent without writing files.':'Preserve the permissions and approval policy of the parent.',prose(agent.body,agent.sourcePath,path.join(context.agentRoot,name),agent.roster),`Skills: ${agent.skills.map(id=>'$'+editionSkillName(id,edition)).join(', ')}.`, `Completion evidence: ${agent.completionEvidence.join('; ')}.`].join('\n\n');
    let content: string, suffix: string;
    if(edition==='codex') {
      content=toml.stringify({name,description:agent.description,developer_instructions:body,sandbox_mode:agent.readOnly?'read-only':'workspace-write',...(agent.model?{model:agent.model,model_reasoning_effort:agent.reasoning}:{})}); suffix='.toml';
    } else {
      const providers=agent.coordinator?['github','gitkraken','digitalocean','canva','elevenlabs','shotstack']:agent.roster==='development'?['github','gitkraken','digitalocean']:agent.roster==='research'?['github']:agent.roster==='communication'?['canva','elevenlabs','shotstack']:['canva'];
      const mcpTools=providers.flatMap(provider=>{const matches=observedTools.filter(name=>name.startsWith('mcp_')&&name.toLowerCase().includes(provider));return matches.length?matches:[`${provider}/*`];});
      const header=edition==='vscode'
        ? {name,description:agent.description,'user-invocable':agent.coordinator,'disable-model-invocation':false,tools:agent.readOnly?['agent','read','search','web']:['agent','read','search','edit','execute','web',...mcpTools],agents:['*'],...(agent.model?{model:agent.model}:{})}
        : {description:agent.description,mode:'all',permissions:agent.readOnly?['edit','shell','browser','*_*'].map(action=>({action,resource:'*',effect:'deny'})):[],...(agent.model?{model:`openai/${agent.model}${agent.reasoning?'#'+agent.reasoning:''}`}:{})};
      content=`---\n${stringify(header)}---\n\n${body}\n`;suffix=edition==='vscode'?'.agent.md':'.md';
      if(agent.model && !(context.availableModels??[]).includes(agent.model)) diagnostics.push(diagnostic('AF011','warning',`${name}: configured model ${agent.model} retained; availability not established in ${edition}.`,{agentId:agent.id}));
    }
    add(agent.id,'agent',`agents/${name}${suffix}`,agent.sourcePath,Buffer.from(content));
  }
  const roles=Object.fromEntries(catalog.agents.filter(a=>a.roster==='development'&&!a.coordinator).map(a=>[a.id,{readOnly:a.readOnly,evidenceWriter:a.readOnly?'principal':'agent',expectedModel:a.model,expectedReasoningEffort:a.reasoning,skillNames:a.skills.map(id=>editionSkillName(id,edition)),conditionalSkills:[],instructions:delegationContract,evidence:a.completionEvidence}]));
  const rolesFile='runtime/development/product-roles.json';
  const existing=files.findIndex(f=>f.relativePath===rolesFile);if(existing>=0)files.splice(existing,1);
  add('development/product-roles','hook',rolesFile,'canonical-catalog',json({agents:roles}));
  const nativeEvents=['PreToolUse','PostToolUse','SubagentStart','SubagentStop','Stop','Interrupt','SessionEnd'];
  const coverage={schemaVersion:1,edition,harness:edition==='vscode'?(context.harness??'copilot'):edition,policies:hookPolicies,observed:false,limitations:edition==='codex'?['Hook trust and live execution must be verified independently in Desktop and the VS Code extension.']:edition==='vscode'?['Reasoning effort has no equivalent agent frontmatter field.','Missing actor or assignment IDs are never inferred.','Lifecycle availability depends on selected harness.']:['OpenCode V2 artifact only; no client installed or live execution observed.','Context hook is automatic. Assignment lifecycle and tool authorization require explicit verified identities; unsupported native event mappings are not fabricated.','Readonly enforcement requires the bundled permission hook. OpenCode custom children do not inherit parent permissions: readonly parents can target only canonical readonly profiles. Missing actor identity restricts actions conservatively; global denies are never relaxed.','Configured OpenAI model and reasoning variant availability must be checked when OpenCode is installed.']};
  let hookGroups:SharedHooksGroups|undefined;
  if(edition==='codex') {
    hookGroups={};
    for(const [roster,relative] of [['development','development/product-hooks.mjs'],['research','research-specialists/scripts/research-hooks.mjs'],['communication','independent-specialists/hooks.mjs'],['consulting','consulting-specialist/hooks.mjs']]) {
      for(const event of nativeEvents) {
        const script=posix(path.join(context.runtimeRoot,relative));
        (hookGroups[event]??=[]).push({hooks:[{type:'command',command:`node "${script}"`,timeout:10,statusMessage:`Agent Forge | ${roster} | ${event}`} ]});
      }
    }
  } else if(edition==='vscode') {
    for(const name of ['runtime.mjs','adapter.mjs','session.mjs','README.md']) {
      const source=path.join(context.repoPath,'hooks/copilot',name);add(`adapter/${name}`,'hook',`runtime/hooks/${name}`,source,await readFile(source));
    }
    const harness=context.harness??'copilot', script=posix(path.join(context.runtimeRoot,'hooks/adapter.mjs'));
    const events=harness==='copilot'?['sessionStart','subagentStart','subagentStop','preToolUse','postToolUse','postToolUseFailure','agentStop','sessionEnd']:['SessionStart','SubagentStart','SubagentStop','PreToolUse','PostToolUse','Stop'];
    const hooks=Object.fromEntries(events.map(e=>[e,[harness==='copilot'?{type:'command',powershell:`& ${quoted(process.execPath)} ${quoted(script)} ${harness} ${e}`,bash:`node '${script.replaceAll("'","'\\''")}' ${harness} ${e}`,timeoutSec:15}:{type:'command',command:`node "${script}" ${harness} ${e}`,windows:`& ${quoted(process.execPath)} ${quoted(script)} ${harness} ${e}`,timeout:15}]]));
    add('native-hooks','hook','hooks/agent-forge-rosters.json','canonical-hook-policies',json(harness==='copilot'?{version:1,hooks}:{hooks}));
  } else {
    const plugin=`import { Plugin } from '@opencode/plugin';
const readonlyAgents=new Set(${JSON.stringify(catalog.agents.filter(a=>a.readOnly).map(a=>a.id))});
const safeActions=new Set(['read','glob','grep','webfetch','websearch','skill','execute','question']);
export default Plugin.define({id:'agent-forge',async setup(ctx){
 const permissions=await ctx.permission.hook('evaluate',event=>{
  if(event.agent&&!readonlyAgents.has(event.agent))return;
  const safe=event.action==='subagent'?event.resources.length>0&&event.resources.every(id=>readonlyAgents.has(id)):safeActions.has(event.action);
  if(!safe){event.effect='deny';event.message=event.agent?'Agent Forge readonly scope: descendants must use readonly profiles.':'Actor identity unavailable: only readonly actions and readonly delegates are permitted.';}
 });
 const context=await ctx.session.hook('context',event=>{event.system.push({type:'text',text:${JSON.stringify(delegationContract+' Agent Forge hook policy inventory: '+hookPolicies.join(', ')+'. Preserve actual root, parent, instance and assignment identifiers. Report missing identities rather than inferring them.')}});});
 return async()=>{await permissions.dispose();await context.dispose();};
}});
`;
    add('opencode-plugin','hook','runtime/plugins/agent-forge/index.ts','canonical-hook-policies',Buffer.from(plugin));
    add('opencode-config','hook','runtime/opencode.jsonc','canonical-catalog',json({$schema:'https://opencode.ai/config.json',plugins:['./plugins/agent-forge']}));
  }
  add('hook-coverage','hook','runtime/hooks/coverage.json','canonical-hook-policies',json(coverage));
  add('edition-inventory','hook','runtime/catalog.json','canonical-catalog',json({schemaVersion:1,edition,canonicalFingerprint:catalogFingerprint(catalog),rosters:catalog.rosters,agents:catalog.agents.map(({body,sourcePath,...a})=>({...a,deployedName:editionAgentName(a,edition),sourceHash:hashBuffer(Buffer.from(body))})),skills:skillIds,hookPolicies,coverage}));
  await addScientificIntegrity(files,context);
  const seen=new Set<string>();for(const f of files){const key=f.relativePath.toLowerCase();if(seen.has(key))throw new Error(`Duplicate edition file ${f.relativePath}`);seen.add(key);}
  return {edition,files:files.sort((a,b)=>a.relativePath.localeCompare(b.relativePath)),diagnostics,coverage,...(hookGroups?{hookGroups}:{})};
}
