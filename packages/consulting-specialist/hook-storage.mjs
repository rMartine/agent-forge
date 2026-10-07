import {readdir, lstat, readFile, open, unlink} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const samePath=(a,b)=>process.platform==='win32'?a.toLowerCase()===b.toLowerCase():a===b;
const within=(root,file)=>{const relative=path.relative(root,file);return !relative || (!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative));};
const READ_ONLY_DELEGATION_TOOLS=new Set(['agent','spawn_agent','collaboration.spawn_agent','functions.collaboration.spawn_agent','collaborationspawn_agent']);
const READ_ONLY_MUTATION_WORDS=new Set(['apply','patch','write','edit','delete','remove','upload','send','publish','deploy','install','update','create','generate','execute','exec','run','commit','merge','push','shell','bash','powershell','terminal','command','perform','save','modify','change','set','put','post','submit','approve','grant','revoke','connect']);
const READ_ONLY_READ_WORDS=new Set(['read','list','find','search','fetch','view','get','open','inspect']);
const READ_ONLY_NATIVE_TOOLS=new Set(['glob','grep','web.run','web__run','collaboration.wait_agent','collaboration.list_agents','collaboration.send_message','collaboration.followup_task','collaboration.interrupt_agent']);
export function classifyReadOnlyTool(name){
 if(typeof name!=='string'||!name.trim())return 'deny';
 const normalized=name.trim().replace(/^functions\./i,'');
 if(READ_ONLY_DELEGATION_TOOLS.has(normalized.toLowerCase()))return 'delegate';
 if(READ_ONLY_NATIVE_TOOLS.has(normalized.toLowerCase()))return 'read';
 const words=normalized.replace(/([a-z0-9])([A-Z])/g,'$1 $2').toLowerCase().match(/[a-z0-9]+/g)??[];
 if(words.some(word=>READ_ONLY_MUTATION_WORDS.has(word)))return 'deny';
 return words.some(word=>READ_ONLY_READ_WORDS.has(word))?'read':'deny';
}
export const identityFile=(context,agentId)=>path.join(context.root,`identity-${createHash('sha256').update(agentId).digest('hex')}.json`);

// Resolve registered identities before interpreting cwd. Legacy links are read,
// never rewritten by a hook merely looking up an assignment.
export async function resolveRegistered(input,{makeContext,readState,readJson}) {
 const direct=await makeContext(input.root_session_id ?? input.session_id,input.cwd);
 const actorId=input.agent_id??input.session_id;
 const lookupId=input.hook_event_name==='SubagentStart' && input.parent_agent_id ? input.parent_agent_id : actorId;
 let owned=false, link;
 try {
  try {link=await readJson(identityFile(direct,lookupId));owned=true;} catch(e){if(e.code!=='ENOENT'){owned=true;throw e;}}
  if(!link){
   let names;try{names=await readdir(direct.root)}catch(e){if(e.code!=='ENOENT')throw e;names=[];}
   if(names.length>4000)throw Error('Identity directory exceeds lookup limit.');
   for(const name of names.filter(name=>/^agent-[a-f0-9]{64}\.json$/.test(name))){
    let candidate;try{candidate=await readJson(path.join(direct.root,name));}catch{continue;}
    if(candidate.agentId===lookupId){
     owned=true;
     if(link&&(!samePath(link.project,candidate.project)||link.sessionId!==candidate.sessionId))throw Error('Ambiguous registered identity.');
     link=candidate;
    }
   }
  }
  if(link){
   if(link.version!==1||link.agentId!==lookupId||typeof link.project!=='string'||!path.isAbsolute(link.project))throw Error('Invalid registered identity.');
   if(input.agent_id&&input.session_id!==link.sessionId&&input.session_id!==actorId&&input.session_id!==lookupId&&input.root_session_id!==link.sessionId)throw Error('Parent session identity differs.');
   const context=await makeContext(link.sessionId,link.project);
   if(!within(context.project,direct.project))throw Error('Working directory is outside the registered project.');
   // A nested repository/worktree is a distinct project, even inside this root.
   let cursor=direct.project;
   while(!samePath(cursor,context.project)){
    try{await lstat(path.join(cursor,'.git'));throw Error('Working directory belongs to another repository.');}catch(e){if(e.code!=='ENOENT')throw e;}
    cursor=path.dirname(cursor);
   }
   return {context,actorId:input.hook_event_name==='SubagentStart'?input.agent_id:actorId,owned:true};
  }
  // Parent events have no agent ID. Find only the same session in cwd/ancestors.
  let context=direct;
  for(;;){
   const record=await readState(context);
   if(record)return {context,actorId:input.agent_id??null,owned:!!input.agent_id&&Object.values(record.assignments??{}).some(a=>a.agentId===input.agent_id)};
   try{await lstat(path.join(context.project,'.git'));break;}catch(e){if(e.code!=='ENOENT')throw e;}
   const parent=path.dirname(context.project);if(parent===context.project)break;
   try { context=await makeContext(input.session_id,parent); }
   catch(error) { if (['EPERM','EACCES'].includes(error.code) || /storage must be outside|records must be stored outside/i.test(error.message)) break; throw error; }
  }
  return {context:direct,actorId:input.agent_id??null,owned:false};
 }catch(error){error.rosterOwned=owned;throw error;}
}

// Explicit recovery only. Unknown owners and live PIDs are never reclaimed.
export async function recoverLock(file,{apply=false,expectedHash}={}){
 if(!path.isAbsolute(file)||!file.endsWith('.lock'))throw Error('An absolute .lock path is required.');
 const stat=await lstat(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>4096)throw Error('Invalid lock file.');
 const bytes=await readFile(file);const hash=createHash('sha256').update(bytes).digest('hex');
 let owner;try{owner=JSON.parse(bytes)}catch{throw Error('Unknown lock owner: preserve the lock and inspect offline.');}
 const pid=owner.processId??owner.pid;
 if(!Number.isSafeInteger(pid)||pid<=0)throw Error('Unknown lock owner: preserve the lock.');
 try{process.kill(pid,0);throw Error('The lock owner is still running; preserve the lock.');}catch(e){if(e.code!=='ESRCH')throw e;}
 if(!apply)return {recoverable:true,processId:pid,sha256:hash};
 if(expectedHash!==hash)throw Error('Recovery requires the hash from a fresh preview.');
 // Keep a local byte-for-byte receipt and recheck immediately before unlinking.
 const receipt=await open(`${file}.recovered-${hash}`,'wx',0o600);
 try{await receipt.writeFile(bytes);await receipt.sync();}finally{await receipt.close();}
 const current=await lstat(file);
 if(current.ino!==stat.ino||current.mtimeMs!==stat.mtimeMs||createHash('sha256').update(await readFile(file)).digest('hex')!==hash)throw Error('Lock changed; recovery cancelled.');
 await unlink(file);return {recovered:true,sha256:hash};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const [command,file,...flags]=process.argv.slice(2);
  if(command!=='recover-lock'||flags.some((v,i)=>v!=='--apply'&&v!=='--expected'&&flags[i-1]!=='--expected'))throw Error('Use recover-lock ABSOLUTE.lock [--apply --expected SHA256].');
  console.log(JSON.stringify(await recoverLock(file,{apply:flags.includes('--apply'),expectedHash:flags[flags.indexOf('--expected')+1]})));
 }catch(error){console.error(error.message);process.exitCode=1;}
}
