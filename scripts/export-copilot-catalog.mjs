import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const catalog=JSON.parse(await readFile(path.join(root,'.cache/copilot/catalog.json'),'utf8'));
const relative=value=>typeof value==='string'&&path.isAbsolute(value)&&value.toLowerCase().startsWith(root.toLowerCase()+path.sep)?path.relative(root,value).replaceAll('\\','/'):value;
const inventory={schemaVersion:1,generatedFrom:'source rosters and compiled renderer; no models executed',expected:catalog.expected,rosters:catalog.rosters,agents:catalog.agents.map(a=>({id:a.id,copilotName:a.copilotName,roster:a.roster,coordinator:!!a.coordinator,readOnly:a.readOnly,model:a.model??null,reasoning:a.reasoning??null,source:relative(a.source),sourceHash:a.sourceHash,skills:a.skills})),skills:catalog.skills.map(s=>({...s,source:relative(s.source)})),dependencies:catalog.dependencies,hookProfiles:{default:'copilot',exclusive:true,source:'packages/core/src/copilotHooks.ts',adapter:'hooks/copilot/adapter.mjs',session:'hooks/copilot/session.mjs',manual:['Interrupt: suspend','Local SessionEnd: end'],coverage:'runtime/hooks/coverage.json'}};
await writeFile(path.join(root,'config/copilot-four-rosters.inventory.json'),JSON.stringify(inventory,null,2)+'\n');
const python=JSON.parse(await readFile(path.join(root,'.cache/copilot/python-install.json'),'utf8'));
const distributions=python.install.map(p=>({name:p.metadata.name,version:p.metadata.version,sha256:p.download_info.archive_info.hashes.sha256,source:p.download_info.url})).sort((a,b)=>a.name.localeCompare(b.name));
await writeFile(path.join(root,'packages/copilot-dependencies/runtime/requirements.windows-py312.lock.txt'),'# Resolved workstation dependencies; CPython 3.12 on Windows x64.\n'+distributions.map(p=>`${p.name}==${p.version} --hash=sha256:${p.sha256}`).join('\n')+'\n');
await writeFile(path.join(root,'project_docs/copilot-python-runtime.json'),JSON.stringify({schemaVersion:1,pythonEnvironment:'%USERPROFILE%/.agent-forge/copilot/runtime/dependencies/.venv',scope:'installed package metadata; no document/notebook execution',distributions},null,2)+'\n');
const observed=JSON.parse(await readFile(path.join(process.env.USERPROFILE,'.agent-forge/copilot/client-inventory.json'),'utf8'));
const groups={};for(const t of observed.tools){const group=t.name.startsWith('mcp_')?t.name.split('_').slice(0,4).join('_'):'built-in/extension';groups[group]=(groups[group]??0)+1;}
await writeFile(path.join(root,'project_docs/copilot-client-summary.json'),JSON.stringify({capturedAt:observed.capturedAt,vscodeVersion:observed.vscodeVersion,models:observed.models,registeredToolCount:observed.tools.length,toolGroups:groups,requestedModels:[...new Set(catalog.agents.flatMap(a=>a.model?[a.model]:[]))].map(id=>({id,advertisedByInspectedApi:observed.models.some(m=>m.id===id),substitution:'none'})),limits:observed.limitations},null,2)+'\n');
console.log(JSON.stringify({agents:inventory.agents.length,skills:inventory.skills.length,pythonDistributions:distributions.length,registeredTools:observed.tools.length}));
