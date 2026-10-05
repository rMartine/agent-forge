import {createHash} from 'node:crypto';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const repository=path.resolve(import.meta.dirname,'..');
const output=path.resolve(process.argv[2]??'');
const cache=path.join(repository,'.cache','installation-evidence');
if(!output.startsWith(cache+path.sep))throw new Error('Inventory output must stay in the ignored installation-evidence directory');
const profile=process.env.USERPROFILE||os.homedir();
const files=[];
async function record(file){
  try{const bytes=await readFile(file);files.push({path:file,sha256:createHash('sha256').update(bytes).digest('hex'),size:bytes.length});}
  catch(error){if(error.code==='ENOENT')files.push({path:file,missing:true});else throw error;}
}
for(const name of ['config.toml','AGENTS.md','hooks.json'])await record(path.join(profile,'.codex',name));
for(const relative of ['.codex/agents','.copilot/agents']){
  const directory=path.join(profile,relative);
  let entries=[];try{entries=await readdir(directory,{withFileTypes:true});}catch(error){if(error.code!=='ENOENT')throw error;}
  for(const item of entries)if(item.isFile())await record(path.join(directory,item.name));
}
for(const relative of ['.codex/skills','.agents/skills']){
  const directory=path.join(profile,relative);
  let entries=[];try{entries=await readdir(directory,{withFileTypes:true});}catch(error){if(error.code!=='ENOENT')throw error;}
  for(const item of entries)if(item.isDirectory()&&!item.name.startsWith('.'))await record(path.join(directory,item.name,'SKILL.md'));
}
await mkdir(path.dirname(output),{recursive:true});
await writeFile(output,JSON.stringify({capturedAt:new Date().toISOString(),profile,files},null,2)+'\n');
console.log(JSON.stringify({output,files:files.length,contentsRecorded:false}));
