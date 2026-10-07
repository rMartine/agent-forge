import { mkdir, readdir, readFile, writeFile, rename, lstat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as path from 'node:path';
import { randomBytes } from 'node:crypto';
import { loadRosterCatalog } from './rosterCatalog.js';
import { renderRosterEdition, catalogFingerprint } from './rosterAdapters.js';
import type { ArtifactEdition } from './rosterTypes.js';
import { hashBuffer } from './hash.js';

const exec=promisify(execFile);
export async function exportEditions(repoPath:string, output:string, options:{target?:ArtifactEdition|'all';downloadSkills?:boolean}={}) {
  const destination=path.resolve(output);
  if(destination===path.parse(destination).root || destination===path.resolve(repoPath))throw new Error('Choose a dedicated export directory.');
  try {await lstat(destination);throw new Error('Export destination already exists; choose a new directory to preserve its contents.');}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  const parent=path.dirname(destination);
  let cursor=parent;while(cursor!==path.parse(cursor).root){try{if((await lstat(cursor)).isSymbolicLink())throw new Error('Export destination must not traverse symbolic links.');}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}cursor=path.dirname(cursor);}
  await mkdir(parent,{recursive:true});
  const target=options.target??'all';if(!['all','codex','vscode','opencode'].includes(target))throw new Error('Export target must be all, codex, vscode or opencode.');
  const editions:ArtifactEdition[]=target==='all'?['codex','vscode','opencode']:[target];
  const catalog=await loadRosterCatalog(repoPath,{downloadSkills:options.downloadSkills});
  const fingerprint=catalogFingerprint(catalog);
  const staging=path.join(parent,`.${path.basename(destination)}-${randomBytes(5).toString('hex')}`);
  await mkdir(staging);
  let commit:string|undefined, dirty:boolean|undefined;
  try{commit=(await exec('git',['rev-parse','HEAD'],{cwd:repoPath,windowsHide:true})).stdout.trim();dirty=!!(await exec('git',['status','--porcelain'],{cwd:repoPath,windowsHide:true})).stdout.trim();}catch{/* Source distributions may not contain Git. */}
  const receipts=[];
  for(const edition of editions){
    const root=path.join(destination,edition);
    const rendered=await renderRosterEdition(catalog,edition,{repoPath,agentRoot:path.join(root,'agents'),skillRoot:path.join(root,'skills'),runtimeRoot:path.join(root,'runtime'),hooksRoot:path.join(root,'hooks'),portable:true});
    if(rendered.diagnostics.some(d=>d.severity==='error'))throw new Error(`Cannot export ${edition}: ${JSON.stringify(rendered.diagnostics)}`);
    for(const file of rendered.files){
      const relative=path.normalize(file.relativePath);if(path.isAbsolute(relative)||relative.split(path.sep).includes('..'))throw new Error('Unsafe edition resource path.');
      const filePath=path.join(staging,edition,relative);await mkdir(path.dirname(filePath),{recursive:true});await writeFile(filePath,file.content);
    }
    if(edition==='opencode')await writeFile(path.join(staging,edition,'opencode.jsonc'),JSON.stringify({$schema:'https://opencode.ai/config.json',plugins:['./runtime/plugins/agent-forge']},null,2)+'\n');
    if(rendered.hookGroups)await writeFile(path.join(staging,edition,'hooks.template.json'),JSON.stringify({hooks:rendered.hookGroups},null,2)+'\n');
    receipts.push({edition,canonicalFingerprint:fingerprint,agents:catalog.agents.length,skills:[...new Set(catalog.resources.filter(r=>r.kind==='skill').map(r=>r.relativePath.split('/')[0]))].length,files:rendered.files.map(f=>({path:f.relativePath,sha256:hashBuffer(f.content)})),coverage:rendered.coverage});
  }
  const receipt={schemaVersion:1,sourceCommit:commit,sourceDirty:dirty,canonicalFingerprint:fingerprint,editions:receipts};
  await writeFile(path.join(staging,'export.json'),JSON.stringify(receipt,null,2)+'\n');
  await writeFile(path.join(staging,'README.md'),'# Agent Forge generated editions\n\nGenerated from one canonical catalog. These files are export artifacts, not an installation receipt. OpenCode targets V2 and has not been run. Use the managed deployment CLI for Codex/Copilot; do not overwrite shared profile hook files with hooks.template.json. Paths are resolved for this export directory; re-export when relocating.\n');
  await rename(staging,destination);
  return {output:destination,...receipt};
}
