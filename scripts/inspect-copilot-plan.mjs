// Static installation inspection only. Does not run agents, hooks, models, or scientific scripts.
import path from 'node:path';
import { readFile, mkdir, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseDocument } from 'yaml';
import { createDeploymentPlan } from '../packages/core/dist/index.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const plan = await createDeploymentPlan(root, {target:'vscode',rosters:'all',harness:process.argv[2] ?? 'copilot'});
const key = p => path.resolve(p).toLowerCase();
const paths = new Set(plan.artifacts.map(a => key(a.targetPath)));
const brokenLinks = [], references = new Set(), legacy = [];
const agents = [];
for (const file of plan.artifacts) {
  if (!/\.(?:md|yaml|json)$/.test(file.targetPath)) continue;
  const text = file.content.toString('utf8');
  if(file.type==='agent') agents.push(parseDocument(text.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1]).toJS());
  if(file.type !== 'agent' && file.type !== 'skill') continue;
  if(/\bCODEX_HOME\b|\bCODEX_THREAD_ID\b|mcp__codex_apps__|\.codex[\\/]plugins[\\/]cache|collaboration\.spawn_agent/.test(text)) legacy.push(file.id);
  for(const match of text.matchAll(/\$((?:agent-forge-copilot-)[a-z0-9-]+)/g)) references.add(match[1]);
  if (!file.targetPath.endsWith('.md')) continue;
  const prose = text.replace(/^```[^\n]*\n[\s\S]*?^```/gm, '').replace(/`[^`\n]+`/g, '');
  for(const match of prose.matchAll(/\]\((<[^>]+>|[^)]+)\)/g)) {
    const destination=match[1].replace(/^<|>$/g,'').split('#')[0];
    if(!destination || /^(?:https?:|mailto:|#|data:)/i.test(destination) || /[{}]/.test(destination)) continue;
    const target=path.resolve(path.dirname(file.targetPath),destination);
    if(paths.has(key(target))) continue;
    try { await access(target); } catch { brokenLinks.push({file:file.id,link:destination}); }
  }
}
const catalog=JSON.parse(plan.artifacts.find(a=>a.id==='runtime/catalog.json').content.toString('utf8'));
const known=new Set(catalog.skills.map(s=>s.id));
const unknownSkills=[...references].filter(s=>!known.has(s)).sort();
const counts={agents:agents.length,visible:agents.filter(a=>a['user-invocable']).length,hidden:agents.filter(a=>!a['user-invocable']).length,ownSkills:catalog.skills.filter(s=>!s.dependency).length,dependencySkills:catalog.skills.filter(s=>s.dependency).length,explicitSpecialistModels:catalog.agents.filter(a=>!a.coordinator&&a.model).length,files:plan.artifacts.length,obsoleteManaged:plan.cleanupActions.length};
const structuralErrors=[];
const renderedResearch=JSON.parse(plan.artifacts.find(a=>a.id==='runtime/research-specialists/research-roster.json').content.toString('utf8'));
const sourceResearch=JSON.parse(await readFile(path.join(root,'packages/research-specialists/research-roster.json'),'utf8'));
if(JSON.stringify(renderedResearch.specialists.map(a=>[a.id,a.model,a.reasoning,a.skills]))!==JSON.stringify(sourceResearch.specialists.map(a=>[a.id,a.model,a.reasoning,a.skills])))structuralErrors.push('Scientific role IDs, paths or models changed');
if(counts.agents!==45||counts.visible!==4||counts.hidden!==41||counts.ownSkills!==60||counts.explicitSpecialistModels!==40) structuralErrors.push('Counts differ from approved plan');
for(const a of agents) if(!a['user-invocable'] && (a.agents?.length!==0||a.tools?.includes('agent'))) structuralErrors.push(`Specialist can delegate: ${a.name}`);
const agentNames=new Set(agents.map(a=>a.name));
if(agentNames.size!==agents.length)structuralErrors.push('Duplicate agent names');
for(const a of agents){if(a.agents.some(name=>!agentNames.has(name)))structuralErrors.push(`Unresolved delegation target: ${a.name}`);if('sandbox_mode' in a||'reasoning_effort' in a)structuralErrors.push(`Unsupported Codex field: ${a.name}`);const original=catalog.agents.find(source=>source.copilotName===a.name);if(a.model!==original?.model)structuralErrors.push(`Model substitution: ${a.name}`);}
const report={checkedAt:new Date().toISOString(),kind:'static-installation-only',harness:process.argv[2]??'copilot',counts,structuralErrors,unknownSkills,legacyReferences:legacy,brokenLinks,diagnostics:plan.diagnostics,models:catalog.agents.map(a=>({id:a.id,model:a.model??'inherit',reasoning:a.reasoning??'inherit',availability:'not-executed; explicit assignment retained'}))};
await mkdir(path.join(root,'project_docs'),{recursive:true});
await writeFile(path.join(root,`project_docs/copilot-static-${report.harness}.json`),JSON.stringify(report,null,2)+'\n');
// Local review payload is ignored by Git; deployment uses the existing immutable plan store.
await mkdir(path.join(root,'.cache/copilot'),{recursive:true});
await writeFile(path.join(root,'.cache/copilot/catalog.json'),JSON.stringify(catalog,null,2)+'\n');
await writeFile(path.join(root,'.cache/copilot/artifacts.json'),JSON.stringify(plan.artifacts.map(a=>({...a,content:a.content.toString('base64')})),null,2)+'\n');
console.log(JSON.stringify({counts,structuralErrors,unknownSkills,legacy,brokenLinkCount:brokenLinks.length,errors:plan.diagnostics.filter(d=>d.severity==='error')},null,2));
if(structuralErrors.length||unknownSkills.length||legacy.length||brokenLinks.length||plan.diagnostics.some(d=>d.severity==='error'))process.exitCode=1;
