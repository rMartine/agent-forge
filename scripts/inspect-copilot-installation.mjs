// File/metadata inspection only; never invokes hooks, agents, models or generation helpers.
import { readFile, readdir, writeFile, mkdir, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'jsonc-parser';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const home=process.env.USERPROFILE;
const hash=b=>createHash('sha256').update(b).digest('hex');
const statePath=path.join(home,'.agent-forge/state.json');
const state=JSON.parse(await readFile(statePath,'utf8'));
const codex=state.deployments.find(d=>d.id===state.activeDeployments.codex&&d.runtime==='codex');
const cache=path.join(root,'.cache/copilot');await mkdir(cache,{recursive:true});
async function walk(dir){const files=[];for(const e of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory())files.push(...await walk(file));else if(e.isFile())files.push(file);}return files;}
if(process.argv[2]==='before'){
 const protectedPaths=new Set(codex.artifacts.map(a=>a.targetPath));
 for(const directory of ['.codex/agents','.codex/skills','.agents/skills']) for(const file of await walk(path.join(home,directory)))protectedPaths.add(file);
 const protectedFiles=[];for(const file of protectedPaths){try{protectedFiles.push({path:file,sha256:hash(await readFile(file))});}catch{protectedFiles.push({path:file,missing:true});}}
 const active=state.deployments.find(d=>d.id===state.activeDeployments.vscode&&d.runtime==='vscode');
 const modified=[];for(const file of active?.artifacts??[]){try{const bytes=await readFile(file.targetPath);if(hash(bytes)!==file.deployedHash)modified.push({path:file.targetPath,sha256:hash(bytes)});}catch{}}
 const mcpPath=path.join(home,'AppData/Roaming/Code/User/mcp.json');const mcp=parse(await readFile(mcpPath,'utf8'));
 const mcpProviderHashes=Object.fromEntries(Object.entries(mcp.servers??{}).map(([name,value])=>[name,hash(Buffer.from(JSON.stringify(value)))]));
 const snapshot={capturedAt:new Date().toISOString(),codexRecordHash:hash(Buffer.from(JSON.stringify(codex))),codexActive:state.activeDeployments.codex,protectedFiles,modified,mcpProviderHashes};
 await writeFile(path.join(cache,'before-install.json'),JSON.stringify(snapshot,null,2)+'\n');
 console.log(JSON.stringify({protectedFiles:protectedFiles.length,modifiedLegacy:modified.map(m=>m.path),mcpProviders:Object.keys(mcpProviderHashes)}));
}else{
 const snapshot=JSON.parse(await readFile(path.join(cache,'before-install.json'),'utf8'));
 const changed=[];for(const file of [...snapshot.protectedFiles,...snapshot.modified]){try{if(hash(await readFile(file.path))!==file.sha256)changed.push(file.path);}catch{if(!file.missing)changed.push(file.path);}}
 const active=state.deployments.find(d=>d.id===state.activeDeployments.vscode&&d.runtime==='vscode');
 const mismatches=[];for(const file of active.artifacts){try{if(hash(await readFile(file.targetPath))!==file.deployedHash)mismatches.push(file.targetPath);}catch{mismatches.push(file.targetPath);}}
 const mcp=parse(await readFile(path.join(home,'AppData/Roaming/Code/User/mcp.json'),'utf8'));
 const mcpChanged=Object.entries(snapshot.mcpProviderHashes).filter(([name,digest])=>hash(Buffer.from(JSON.stringify(mcp.servers?.[name]??null)))!==digest).map(([name])=>name);
 const report={checkedAt:new Date().toISOString(),status:'installed-and-statically-checked',deploymentId:active.id,sourceCommit:active.sourceCommit,files:active.artifacts.length,protectedCodexFiles:snapshot.protectedFiles.length,codexRecordUnchanged:hash(Buffer.from(JSON.stringify(codex)))===snapshot.codexRecordHash&&state.activeDeployments.codex===snapshot.codexActive,changedProtectedFiles:changed,preservedModifiedLegacy:snapshot.modified,installedHashMismatches:mismatches,mcpProvidersPreserved:Object.keys(snapshot.mcpProviderHashes),mcpProvidersChanged:mcpChanged,mcpConfiguredProviders:Object.keys(mcp.servers??{}),removedManaged:active.removedArtifacts?.length??0,backups:path.dirname(statePath),behavioralVerification:'not-performed-per-user-instruction'};
 const backupInventory=[];const backupErrors=[];
 for(const file of [...active.artifacts,...(active.removedArtifacts??[])])if(file.backupPath){try{const sha256=hash(await readFile(file.backupPath));backupInventory.push({originalPath:file.targetPath,backupPath:file.backupPath,sha256});if((active.removedArtifacts??[]).includes(file)&&sha256!==file.deployedHash)backupErrors.push(file.backupPath);}catch{backupErrors.push(file.backupPath);}}
 const fileInventory={deploymentId:active.id,sourceCommit:active.sourceCommit,installed:active.artifacts,removed:active.removedArtifacts??[],backups:backupInventory};
 await writeFile(path.join(root,'project_docs/copilot-installed-files.json'),JSON.stringify(fileInventory,null,2)+'\n');
 report.fileInventory='copilot-installed-files.json';report.checkedBackups=backupInventory.length;report.backupErrors=backupErrors;
 if(changed.length||mismatches.length||mcpChanged.length||backupErrors.length||!report.codexRecordUnchanged){report.status='static-verification-failed';process.exitCode=1;}
 await writeFile(path.join(root,'project_docs/copilot-installation-report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({...report,preservedModifiedLegacy:report.preservedModifiedLegacy.map(f=>f.path)},null,2));
}
