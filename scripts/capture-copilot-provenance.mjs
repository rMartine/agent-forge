import { execFileSync } from 'node:child_process';
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const origins=[
 {roster:'development',root:'D:/Repositorios/agent-forge',directories:['agents','skills','hooks/codex','config'],files:['agent-forge.manifest.jsonc','packages/core/src/productDevelopment.ts','packages/core/src/sharedHooks.ts']},
 {roster:'research',root:'D:/Proyectos/Agent Forge/integration-research-plugin',directories:['packages/research-specialists'],files:[]},
 {roster:'communication',root:'D:/Proyectos/Agent Forge/implementation-independent-specialists',directories:['packages/independent-specialists'],files:[]},
 {roster:'consulting',root:'D:/Proyectos/Agent Forge/implementation-consulting-specialist',directories:['packages/consulting-specialist'],files:[]},
];
async function walk(dir){const r=[];for(const e of await readdir(dir,{withFileTypes:true})){if(['node_modules','.git','.venv','__pycache__'].includes(e.name))continue;const f=path.join(dir,e.name);if(e.isDirectory())r.push(...await walk(f));else if(e.isFile())r.push(f);}return r;}
const report=[];
for(const origin of origins){
 const git=args=>execFileSync('git',['-c',`safe.directory=${origin.root}`,...args],{cwd:origin.root,encoding:'utf8',windowsHide:true}).trim();
 const files=origin.files.map(p=>path.join(origin.root,p));for(const dir of origin.directories)files.push(...await walk(path.join(origin.root,dir)));
 const selected=[];
 for(const file of files){const relative=path.relative(origin.root,file).replaceAll('\\','/');let copy;try{copy=await readFile(path.join(root,relative));}catch{continue;}const original=await readFile(file);selected.push({path:relative,sourceSha256:createHash('sha256').update(original).digest('hex'),importedSha256:createHash('sha256').update(copy).digest('hex'),identical:original.equals(copy)});}
 report.push({roster:origin.roster,sourceRoot:origin.root,commit:git(['rev-parse','HEAD']),branch:git(['branch','--show-current']),pendingStatus:git(['status','--short']),files:selected});
}
await mkdir(path.join(root,'project_docs'),{recursive:true});
await writeFile(path.join(root,'project_docs/copilot-source-provenance.json'),JSON.stringify({schemaVersion:1,capturedAt:new Date().toISOString(),origins:report},null,2)+'\n');
console.log(JSON.stringify(report.map(o=>({roster:o.roster,commit:o.commit,files:o.files.length}))));
