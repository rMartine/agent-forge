import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {cases} from '../evals/codex/models/cases.mjs';

const repository=path.resolve(import.meta.dirname,'..');
const directory=path.resolve(process.argv[2]??'');
const cache=path.join(repository,'.cache','model-comparison');
if(!directory.startsWith(cache+path.sep))throw new Error('Assignment must be a prepared model-comparison directory');
const prepared=JSON.parse(await readFile(path.join(directory,'prepared.json'),'utf8'));
const item=cases.find(candidate=>candidate.agent===prepared.agent);
const digest=content=>createHash('sha256').update(content).digest('hex');
const verifiedDefinitionsHash=digest(await readFile(path.join(repository,'evals/codex/models/cases.mjs')));
const revisions=JSON.parse(await readFile(path.join(repository,'evals/codex/models/evaluator-revisions.json'),'utf8'));
const compatibleRevision=revisions.revisions.find(revision=>revision.preparedDefinitionsHash===prepared.definitionsHash&&revision.verifiedDefinitionsHash===verifiedDefinitionsHash);
if(!item||(prepared.definitionsHash!==verifiedDefinitionsHash&&!compatibleRevision))throw new Error('Frozen evaluation criteria changed without a recorded evaluator repair');
const checks=[];
for(const [name,expected]of Object.entries(prepared.files)){
  if(item.ownership.includes(name))continue;
  const bytes=await readFile(path.join(directory,name)).catch(()=>null);
  checks.push({name:`Preserve ${name}`,passed:bytes!==null&&digest(bytes)===expected});
}
checks.push({name:'Preserve retained user material',passed:await readFile(path.join(directory,'PROTECTED.txt'),'utf8').catch(()=>null)==='Synthetic retained user material. Must remain unchanged.\n'});
async function command(executable,args,cwd,timeout=90000){
  return new Promise(resolve=>{
    const child=spawn(executable,args,{cwd,shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';let done=false;
    const timer=setTimeout(()=>child.kill(),timeout);
    child.stdout.on('data',data=>stdout+=data);child.stderr.on('data',data=>stderr+=data);
    const finish=code=>{if(done)return;done=true;clearTimeout(timer);resolve({code,stdout,stderr});};
    child.on('error',error=>{stderr+=String(error);finish(null);});child.on('close',finish);
  });
}
let verification;
if(item.verification){
  await writeFile(path.join(directory,'independent-checks.mjs'),item.verification);
  verification=await command(process.execPath,['independent-checks.mjs'],directory);
  checks.push({name:'Independent implementation acceptance',passed:verification.code===0});
}else if(item.kind==='dotnet'){
  verification=await command('dotnet',['run','--project','Evaluation.csproj','--no-restore'],directory);
  if(verification.code!==0&&/assets file|NETSDK1004/i.test(verification.stdout+verification.stderr))verification=await command('dotnet',['run','--project','Evaluation.csproj'],directory);
  checks.push({name:'Independent decimal allocation acceptance',passed:verification.code===0});
}else if(item.kind==='qa'){
  verification=[];
  for(const implementation of item.implementations){
    const target=path.join(directory,`verification-${implementation.name}`);
    await mkdir(target,{recursive:true});
    await writeFile(path.join(target,'solution.mjs'),implementation.source);
    await writeFile(path.join(target,'acceptance.test.mjs'),await readFile(path.join(directory,'acceptance.test.mjs')));
    const result=await command(process.execPath,['--test','acceptance.test.mjs'],target);
    verification.push({name:implementation.name,...result});
    checks.push({name:`QA distinguishes ${implementation.name}`,passed:(result.code===0)===implementation.shouldPass});
  }
}
const result={...prepared,verifiedDefinitionsHash,...(compatibleRevision?{evaluatorRepair:compatibleRevision.reason}:{}),verifiedAt:new Date().toISOString(),checks,verification,reviewRequired:item.kind==='review',qualityConclusion:item.kind==='review'?'pending-manual-review':checks.every(check=>check.passed)?'passed-bounded-synthetic-case':'failed-bounded-synthetic-case',limitations:['This case does not establish native model selection or hook execution in Desktop or VS Code.','Consumption and duration require observations from the actual agent run; this verifier does not estimate them.']};
await writeFile(path.join(directory,'independent-result.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({agent:prepared.agent,model:prepared.model,checks,result:result.qualityConclusion}));
