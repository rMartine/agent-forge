import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import {parse} from 'smol-toml';
import {parse as yaml} from 'yaml';
import {renderRosterEdition,catalogFingerprint} from '../dist/rosterAdapters.js';
const repo=path.resolve(import.meta.dirname,'../../..');
const catalog={schemaVersion:1,rosters:[{id:'development',name:'Development',coordinatorId:'director',coordinationSkill:'guide'}],agents:[{id:'reviewer',roster:'development',description:'Review',body:'Review evidence.',sourcePath:'roles/reviewer.md',model:'gpt-6.1-sol',reasoning:'high',readOnly:true,coordinator:false,skills:['guide'],completionEvidence:['Evidence'],delegation:'allowed'},{id:'director',roster:'development',description:'Coordinate',body:'Integrate.',sourcePath:'roles/director.md',readOnly:false,coordinator:true,skills:['guide'],completionEvidence:['Result'],delegation:'allowed'}],resources:[{id:'guide/SKILL.md',roster:'development',kind:'skill',sourcePath:'skills/guide/SKILL.md',relativePath:'guide/SKILL.md',content:Buffer.from('---\nname: guide\ndescription: guide\n---\nUse evidence.\n'),dependency:false,adaptation:'prose'}],aliases:{},diagnostics:[]};
const context={repoPath:repo,agentRoot:path.join(os.tmpdir(),'af-adapters/agents'),skillRoot:path.join(os.tmpdir(),'af-adapters/skills'),runtimeRoot:path.join(os.tmpdir(),'af-adapters/runtime'),portable:true};
test('all editions preserve canonical inventory and retain read-only restrictions',async()=>{
 const fingerprints=[];
 for(const edition of ['codex','vscode','opencode']){
  const result=await renderRosterEdition(catalog,edition,context);
  assert.equal(result.files.filter(f=>f.type==='agent').length,2);
  const reviewer=result.files.find(f=>f.id==='reviewer').content.toString();
  assert.match(reviewer,/descendants must also remain read-only/);
  if(edition==='codex'){const d=parse(reviewer);assert.equal(d.model,'gpt-6.1-sol');assert.equal(d.sandbox_mode,'read-only');assert.match(d.developer_instructions,/Subagents may delegate further/);}
  else {const d=yaml(reviewer.match(/^---\n([\s\S]*?)\n---/)[1]);if(edition==='vscode'){assert.ok(d.tools.includes('agent'));assert.ok(!d.tools.includes('execute'));assert.deepEqual(d.agents,['*']);}else{assert.equal(d.mode,'all');assert.equal(d.model,'openai/gpt-6.1-sol#high');assert.ok(d.permissions.some(p=>p.action==='edit'&&p.effect==='deny'));assert.ok(d.permissions.some(p=>p.action==='shell'&&p.effect==='deny'));assert.ok(!d.permissions.some(p=>p.effect==='allow'));}}
  fingerprints.push(JSON.parse(result.files.find(f=>f.id==='edition-inventory').content).canonicalFingerprint);
 }
 assert.equal(new Set(fingerprints).size,1);assert.equal(fingerprints[0],catalogFingerprint(catalog));
});
test('coordinators are model invocable and optional in Copilot',async()=>{const r=await renderRosterEdition(catalog,'vscode',context);const text=r.files.find(f=>f.id==='director').content.toString();const d=yaml(text.match(/^---\n([\s\S]*?)\n---/)[1]);assert.equal(d['user-invocable'],true);assert.equal(d['disable-model-invocation'],false);assert.match(text,/Coordinators are optional/);});
test('repeated rendering is deterministic and does not mutate catalog',async()=>{const before=catalogFingerprint(catalog);for(const edition of ['codex','vscode','opencode']){const a=await renderRosterEdition(catalog,edition,context),b=await renderRosterEdition(catalog,edition,context);assert.deepEqual(a,b);}assert.equal(catalogFingerprint(catalog),before);});
