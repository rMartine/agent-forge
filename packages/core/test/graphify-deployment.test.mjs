import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir,mkdtemp,readFile,rm,writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyDeploymentPlan,prepareGraphifyDeployment,verifyGraphifyDeployment,loadDeploymentState,hashBuffer,loadGraphifyRuntime,createGraphifyProvisionPlan } from '../dist/index.js';

const cache=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../.cache');
async function fixture(t) {
  await mkdir(cache,{recursive:true});
  const root=await mkdtemp(path.join(cache,'graphify-deployment-'));
  t.after(async()=>{assert.equal(path.dirname(root),cache);await rm(root,{recursive:true,force:true});});
  const runtimeId='a'.repeat(64);
  const runtimePath=path.join(root,'runtimes',runtimeId);
  await mkdir(path.join(runtimePath,'python'),{recursive:true});
  const content=Buffer.from('Synthetic integrity fixture, not an executable runtime.');
  await writeFile(path.join(runtimePath,'python/python.exe'),content);
  const runtime={schemaVersion:1,runtimeId,managedRoot:root,runtimePath,pythonPath:path.join(runtimePath,'python/python.exe'),graphifyVersion:'0.9.74',pythonVersion:'3.12.13',lockHash:'b'.repeat(64),installedAt:'2026-10-02T00:00:00Z',files:[{path:'python/python.exe',sha256:hashBuffer(content),size:content.length}]};
  await writeFile(path.join(root,'runtime.json'),JSON.stringify(runtime));
  await writeFile(path.join(runtimePath,'runtime.json'),JSON.stringify(runtime));
  return {root,runtime};
}
test('Deployment preserves the reviewed Graphify receipt and never provisions during a reused-runtime apply',async t=>{
  const {root}=await fixture(t);
  const graphify=await prepareGraphifyDeployment(root);
  const statePath=path.join(root,'state.json');
  const plan={deploymentId:'synthetic-receipt',repoPath:root,createdAt:new Date().toISOString(),targets:['codex'],artifacts:[],cleanupActions:[],diagnostics:[],graphify};
  const result=await applyDeploymentPlan(plan,statePath);
  assert.equal(result.success,true);
  assert.deepEqual((await loadDeploymentState(statePath)).deployments[0].graphify,graphify);
});
test('Changed Graphify bytes block the deployment before any managed artifact is written',async t=>{
  const {root,runtime}=await fixture(t);
  const graphify=await prepareGraphifyDeployment(root);
  await writeFile(runtime.pythonPath,'changed after preview');
  await assert.rejects(verifyGraphifyDeployment(graphify),/integrity/);
  const targetPath=path.join(root,'should-not-exist.txt');
  const content=Buffer.from('managed');
  const plan={deploymentId:'synthetic-tamper',repoPath:root,createdAt:new Date().toISOString(),targets:['codex'],artifacts:[{id:'fixture',type:'skill',runtime:'codex',sourcePath:'synthetic',targetPath,content,sourceHash:hashBuffer(content)}],cleanupActions:[],diagnostics:[],graphify};
  const result=await applyDeploymentPlan(plan,path.join(root,'state.json'));
  assert.equal(result.success,false);
  await assert.rejects(readFile(targetPath),{code:'ENOENT'});
});

test('Real frozen Graphify provisioning is recovered when a subsequent customization write fails', {skip: !process.env.AGENT_FORGE_GRAPHIFY_REAL_RUNTIME}, async t=>{
  await mkdir(cache,{recursive:true});
  const root=await mkdtemp(path.join(cache,'graphify-transaction-'));
  t.after(async()=>{assert.equal(path.dirname(root),cache);await rm(root,{recursive:true,force:true});});
  const previous=await loadGraphifyRuntime(process.env.AGENT_FORGE_GRAPHIFY_REAL_RUNTIME);
  const managedRoot=path.join(root,'graphify');
  const provision=await createGraphifyProvisionPlan({managedRoot,pythonPath:previous.pythonPath,lockPath:path.join(cache,'..','config','graphify-windows-x64-python312.lock.json'),wheelCachePath:path.join(previous.runtimePath,'wheels'),helperDirectory:path.join(cache,'..','scripts','graphify')});
  const graphify=await prepareGraphifyDeployment(managedRoot,provision.planId);
  // The destination does not exist at preview. Its parent is an ordinary file,
  // causing an actual filesystem failure only when application reaches it.
  const parent=path.join(root,'ordinary-file');await writeFile(parent,'retained');
  const targetPath=path.join(parent,'child.txt');const content=Buffer.from('managed');
  const plan={deploymentId:'synthetic-recovery',repoPath:root,createdAt:new Date().toISOString(),targets:['codex'],artifacts:[{id:'fixture',type:'skill',runtime:'codex',sourcePath:'synthetic',targetPath,content,sourceHash:hashBuffer(content)}],cleanupActions:[],diagnostics:[],graphify};
  const result=await applyDeploymentPlan(plan,path.join(root,'state.json'));
  assert.equal(result.success,false);
  assert.match(result.errors[0]?.message??'',/EEXIST|ENOTDIR/);
  assert.equal(result.errors.length,1,JSON.stringify(result.errors));
  await assert.rejects(readFile(path.join(managedRoot,'runtime.json')),{code:'ENOENT'});
  assert.equal(await readFile(parent,'utf8'),'retained');
  assert.equal((await loadDeploymentState(path.join(root,'state.json'))).activeDeployments.codex,undefined);
});
