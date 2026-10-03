import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir,mkdtemp,rm,writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {discoverCodexEnvironment,validateCodexModelAvailability} from '../dist/index.js';

test('Codex reports cached model availability separately from successful execution',async t=>{
  const profile=await mkdtemp(path.join(os.tmpdir(),'agent-forge-model-cache-'));
  t.after(()=>rm(profile,{recursive:true,force:true}));
  const codexHome=path.join(profile,'.codex');await mkdir(codexHome);
  const cache=path.join(codexHome,'models_cache.json');
  await writeFile(cache,JSON.stringify({models:[{slug:'synthetic-model',visibility:'list',supported_reasoning_levels:[{effort:'high'}]},{slug:'hidden-model',visibility:'hide'}]}));
  const env=await discoverCodexEnvironment({env:{USERPROFILE:profile}});
  assert.deepEqual(env.availableModels,['synthetic-model']);
  assert.deepEqual(env.availableReasoningEfforts,{'synthetic-model':['high']});
  assert.equal(env.modelCatalogSource,cache);
  assert.match(env.diagnostics.find(item=>item.code==='AF011').message,/separate check/);
  assert.equal(validateCodexModelAvailability({role:{id:'role',model:'missing-model',modelReasoningEffort:'high'}},env).some(item=>item.severity==='error'),true);
  await writeFile(cache,'invalid');
  const unreadable=await discoverCodexEnvironment({env:{USERPROFILE:profile}});
  assert.equal(unreadable.availableModels,undefined);
  assert.equal(unreadable.diagnostics.some(item=>item.code==='AF011'&&item.severity==='warning'),true);
});
