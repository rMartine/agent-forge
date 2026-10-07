import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  applyDeploymentPlan, applyManagedCleanupPlan, hashBuffer, loadDeploymentState,
  loadManifest, removeManagedDeployment, rollbackDeployment, status,
} from '../dist/index.js';
import { prepareSharedHooks, sharedHooksAreIntact, sharedHooksOwnershipHash } from '../dist/sharedHooks.js';

const repository = path.resolve(import.meta.dirname, '../../..');
const hook = command => ({ matcher: 'backend-developer', hooks: [{ type: 'command', command }] });
const ownedGroups = command => ({ SubagentStart: [hook(command)] });
const bytes = document => Buffer.from(JSON.stringify(document));

async function fixture(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'agent-forge-shared-hooks-'));
  const targetPath = path.join(root, '.codex', 'hooks.json');
  const statePath = path.join(root, 'state', 'state.json');
  await mkdir(path.dirname(targetPath), { recursive: true });
  const plan = async (id, desired, previousOwnership) => {
    const existing = await readFile(targetPath).catch(error => { if (error.code === 'ENOENT') return undefined; throw error; });
    const prepared = prepareSharedHooks(existing, desired, previousOwnership);
    return {
      deploymentId: id, repoPath: root, createdAt: new Date().toISOString(),
      targets: ['codex'], diagnostics: [], cleanupActions: [], artifacts: [{
        id: 'codex-hooks', type: 'hook', runtime: 'codex', sourcePath: 'managed-hooks', targetPath,
        ...prepared, sourceHash: hashBuffer(prepared.content),
      }],
    };
  };
  const ownership = async () => {
    const ledger = await loadDeploymentState(statePath);
    return ledger.deployments.find(item => item.id === ledger.activeDeployments.codex)?.artifacts.find(item => item.sharedHooks)?.sharedHooks;
  };
  try { await run({ root, targetPath, statePath, plan, ownership }); }
  finally { await rm(root, { recursive: true, force: true }); }
}

test('shared hooks preserve pre-existing groups and settings and track only owned groups', async () => fixture(async context => {
  const { targetPath, statePath, plan, ownership, root } = context;
  const foreign = hook('user-start');
  await writeFile(targetPath, bytes({ feature: 'preserve', hooks: { SubagentStart: [foreign], Stop: [hook('user-stop')] } }));
  const first = await plan('first', ownedGroups('managed-start'));
  assert.equal((await applyDeploymentPlan(first, statePath)).success, true);
  const document = JSON.parse(await readFile(targetPath, 'utf8'));
  assert.equal(document.feature, 'preserve');
  assert.deepEqual(document.hooks.SubagentStart, [foreign, hook('managed-start')]);
  assert.deepEqual(document.hooks.Stop, [hook('user-stop')]);
  document.hooks.Stop.push(hook('user-added-after'));
  await writeFile(targetPath, bytes(document));
  const managed = await ownership();
  assert.equal(sharedHooksAreIntact(await readFile(targetPath), managed), true);
  const ledger = await loadDeploymentState(statePath);
  assert.equal(ledger.deployments[0].artifacts[0].deployedHash, sharedHooksOwnershipHash(managed));
  const manifest = structuredClone(await loadManifest(repository));
  manifest.targets.state = statePath;
  await writeFile(path.join(root, 'agent-forge.manifest.jsonc'), JSON.stringify(manifest));
  assert.equal((await status(root, 'codex')).syncState, 'synced');
}));

test('update, rollback and wipe preserve foreign changes made after each deployment', async () => fixture(async ({ targetPath, statePath, plan, ownership }) => {
  await writeFile(targetPath, bytes({ hooks: { Stop: [hook('original-foreign')] } }));
  assert.equal((await applyDeploymentPlan(await plan('first', ownedGroups('version-one')), statePath)).success, true);
  let document = JSON.parse(await readFile(targetPath, 'utf8'));
  document.hooks.Stop.push(hook('foreign-after-first'));
  await writeFile(targetPath, bytes(document));
  assert.equal((await applyDeploymentPlan(await plan('second', ownedGroups('version-two'), await ownership()), statePath)).success, true);
  document = JSON.parse(await readFile(targetPath, 'utf8'));
  document.hooks.Stop.push(hook('foreign-after-second'));
  await writeFile(targetPath, bytes(document));
  const rollback = await rollbackDeployment(statePath, 'codex');
  assert.equal(rollback.success, true);
  document = JSON.parse(await readFile(targetPath, 'utf8'));
  assert.deepEqual(document.hooks.SubagentStart, [hook('version-one')]);
  assert.equal(document.hooks.Stop.length, 3);
  assert.equal((await removeManagedDeployment(statePath, 'codex')).deleted, 1);
  document = JSON.parse(await readFile(targetPath, 'utf8'));
  assert.equal(document.hooks.SubagentStart, undefined);
  assert.equal(document.hooks.Stop.length, 3);
}));

test('initial rollback removes only inserted groups even if a previously absent hooks file gains foreign groups', async () => fixture(async ({ targetPath, statePath, plan }) => {
  assert.equal((await applyDeploymentPlan(await plan('first', ownedGroups('managed')), statePath)).success, true);
  const document = JSON.parse(await readFile(targetPath, 'utf8'));
  document.hooks.Stop = [hook('added-later')];
  await writeFile(targetPath, bytes(document));
  assert.equal((await rollbackDeployment(statePath, 'codex')).success, true);
  assert.deepEqual(JSON.parse(await readFile(targetPath, 'utf8')), { hooks: { Stop: [hook('added-later')] } });
}));

test('rollback removes a newly created hooks file once no foreign content remains', async () => fixture(async ({ targetPath, statePath, plan }) => {
  assert.equal((await applyDeploymentPlan(await plan('first', ownedGroups('managed')), statePath)).success, true);
  assert.equal((await rollbackDeployment(statePath, 'codex')).success, true);
  await assert.rejects(readFile(targetPath), /ENOENT/);
}));

test('apply blocks preimage drift and tampered preview bytes before any artifact is changed', async () => fixture(async ({ targetPath, statePath, plan, root }) => {
  await writeFile(targetPath, bytes({ hooks: { Stop: [hook('foreign')] } }));
  const preview = await plan('first', ownedGroups('managed'));
  const changed = bytes({ hooks: { Stop: [hook('foreign-later')] } });
  await writeFile(targetPath, changed);
  const companion = Buffer.from('agent');
  const companionPath = path.join(root, 'companion.toml');
  preview.artifacts.unshift({ id: 'agent', type: 'agent', runtime: 'codex', sourcePath: 'agent', targetPath: companionPath, content: companion, sourceHash: hashBuffer(companion) });
  const result = await applyDeploymentPlan(preview, statePath);
  assert.equal(result.success, false);
  assert.match(result.diagnostics.at(-1).message, /changed after preview/);
  assert.deepEqual(await readFile(targetPath), changed);
  await assert.rejects(readFile(companionPath), /ENOENT/);
  const tampered = await plan('second', ownedGroups('managed'));
  tampered.artifacts[0].content = bytes({ hooks: {} });
  assert.equal((await applyDeploymentPlan(tampered, statePath)).success, false);
  assert.deepEqual(await readFile(targetPath), changed);
}));

test('apply rejects altered shared merge bytes even when their replacement checksum is supplied', async () => fixture(async ({ targetPath, statePath, plan }) => {
  const original = bytes({ hooks: { Stop: [hook('foreign')] } });
  await writeFile(targetPath, original);
  const preview = await plan('first', ownedGroups('managed'));
  const item = preview.artifacts[0];
  item.content = bytes({ hooks: ownedGroups('managed') });
  item.sourceHash = hashBuffer(item.content);
  assert.equal((await applyDeploymentPlan(preview, statePath)).success, false);
  assert.deepEqual(await readFile(targetPath), original);
}));

test('preview never appropriates an identical unmanaged hook group', () => {
  assert.throws(() => prepareSharedHooks(bytes({ hooks: ownedGroups('same') }), ownedGroups('same')), /unmanaged group/);
});

test('modified, missing or duplicated owned groups are preserved and keep ownership visible', async () => {
  for (const mutation of ['modified', 'missing', 'duplicated']) {
    await fixture(async ({ targetPath, statePath, plan, ownership }) => {
      assert.equal((await applyDeploymentPlan(await plan('first', ownedGroups('managed')), statePath)).success, true);
      const originalOwnership = await ownership();
      const document = JSON.parse(await readFile(targetPath, 'utf8'));
      if (mutation === 'modified') document.hooks.SubagentStart[0].hooks[0].command = 'user-edit';
      if (mutation === 'missing') delete document.hooks.SubagentStart;
      if (mutation === 'duplicated') document.hooks.SubagentStart.push(hook('managed'));
      const modified = bytes(document);
      await writeFile(targetPath, modified);
      assert.equal(sharedHooksAreIntact(modified, originalOwnership), false);
      assert.throws(() => prepareSharedHooks(modified, ownedGroups('new'), originalOwnership), /modified, removed, or duplicated/);
      assert.equal((await rollbackDeployment(statePath, 'codex')).success, false);
      assert.equal((await loadDeploymentState(statePath)).activeDeployments.codex, 'first');
      const wipe = await removeManagedDeployment(statePath, 'codex');
      assert.equal(wipe.skipped, 1);
      assert.deepEqual(await readFile(targetPath), modified);
      assert.equal((await loadDeploymentState(statePath)).activeDeployments.codex, 'first');
    });
  }
});

test('grouped failure restores hooks.json and the earlier ledger byte for byte', async () => fixture(async ({ targetPath, statePath, plan, ownership, root }) => {
  await writeFile(targetPath, bytes({ hooks: { Stop: [hook('foreign')] } }));
  assert.equal((await applyDeploymentPlan(await plan('first', ownedGroups('managed')), statePath)).success, true);
  const originalHooks = await readFile(targetPath);
  const originalState = await readFile(statePath);
  const update = await plan('second', ownedGroups('updated'), await ownership());
  const blocker = path.join(root, 'file-blocking-directory');
  await writeFile(blocker, 'file');
  const content = Buffer.from('agent');
  update.targets.push('vscode');
  update.artifacts.push({ id: 'later', type: 'agent', runtime: 'vscode', sourcePath: 'source', targetPath: path.join(blocker, 'agent.md'), content, sourceHash: hashBuffer(content) });
  assert.equal((await applyDeploymentPlan(update, statePath)).success, false);
  assert.deepEqual(await readFile(targetPath), originalHooks);
  assert.deepEqual(await readFile(statePath), originalState);
}));

test('managed cleanup and stale-cleanup rollback preserve foreign hook groups', async () => fixture(async ({ targetPath, statePath, plan, ownership, root }) => {
  await writeFile(targetPath, bytes({ hooks: { Stop: [hook('foreign')] } }));
  assert.equal((await applyDeploymentPlan(await plan('first', ownedGroups('managed')), statePath)).success, true);
  const owned = await ownership();
  const action = { runtime: 'codex', targetPath, expectedHash: sharedHooksOwnershipHash(owned), type: 'hook', reason: 'stale-managed', sharedHooks: owned };
  const cleanupDeployment = { deploymentId: 'stale', repoPath: root, createdAt: new Date().toISOString(), targets: ['codex'], diagnostics: [], artifacts: [], cleanupActions: [action] };
  assert.equal((await applyDeploymentPlan(cleanupDeployment, statePath)).success, true);
  let document = JSON.parse(await readFile(targetPath, 'utf8'));
  assert.equal(document.hooks.SubagentStart, undefined);
  document.hooks.Stop.push(hook('foreign-after-cleanup'));
  await writeFile(targetPath, bytes(document));
  assert.equal((await rollbackDeployment(statePath, 'codex')).success, true);
  document = JSON.parse(await readFile(targetPath, 'utf8'));
  assert.deepEqual(document.hooks.SubagentStart, [hook('managed')]);
  assert.equal(document.hooks.Stop.length, 2);
  const result = await applyManagedCleanupPlan({ planId: 'cleanup', repoPath: root, createdAt: new Date().toISOString(), targets: ['codex'], actions: [action], diagnostics: [] }, statePath);
  assert.equal(result.success, true);
  assert.equal(result.deleted, 1);
  document = JSON.parse(await readFile(targetPath, 'utf8'));
  assert.equal(document.hooks.SubagentStart, undefined);
  assert.equal(document.hooks.Stop.length, 2);
}));

test('managed cleanup preserves modified hook groups instead of deleting the shared document', async () => fixture(async ({ targetPath, statePath, plan, ownership, root }) => {
  assert.equal((await applyDeploymentPlan(await plan('first', ownedGroups('managed')), statePath)).success, true);
  const owned = await ownership();
  const modified = bytes({ hooks: ownedGroups('user-modified') });
  await writeFile(targetPath, modified);
  const result = await applyManagedCleanupPlan({ planId: 'cleanup', repoPath: root, createdAt: new Date().toISOString(), targets: ['codex'], diagnostics: [], actions: [{ runtime: 'codex', targetPath, expectedHash: sharedHooksOwnershipHash(owned), type: 'hook', reason: 'stale-managed', sharedHooks: owned }] }, statePath);
  assert.equal(result.skipped, 1);
  assert.equal(result.deleted, 0);
  assert.deepEqual(await readFile(targetPath), modified);
  assert.equal((await loadDeploymentState(statePath)).deployments[0].artifacts.length, 1);
}));

test('unchanged shared deployment retains an independent rollback boundary', async () => fixture(async ({ targetPath, statePath, plan, ownership }) => {
  assert.equal((await applyDeploymentPlan(await plan('first', ownedGroups('managed')), statePath)).success, true);
  assert.equal((await applyDeploymentPlan(await plan('second', ownedGroups('managed'), await ownership()), statePath)).skipped, 1);
  assert.equal((await rollbackDeployment(statePath, 'codex')).success, true);
  assert.equal(sharedHooksAreIntact(await readFile(targetPath), await ownership()), true);
  assert.equal((await rollbackDeployment(statePath, 'codex')).success, true);
  await assert.rejects(readFile(targetPath), /ENOENT/);
}));

test('rollback after redeployment returns to the actual prior active deployment', async () => fixture(async ({ targetPath, statePath, plan, ownership }) => {
  assert.equal((await applyDeploymentPlan(await plan('first', ownedGroups('first')), statePath)).success, true);
  assert.equal((await applyDeploymentPlan(await plan('second', ownedGroups('second'), await ownership()), statePath)).success, true);
  assert.equal((await rollbackDeployment(statePath, 'codex')).success, true);
  assert.equal((await applyDeploymentPlan(await plan('third', ownedGroups('third'), await ownership()), statePath)).success, true);
  assert.equal((await rollbackDeployment(statePath, 'codex')).success, true);
  assert.equal((await loadDeploymentState(statePath)).activeDeployments.codex, 'first');
  assert.deepEqual(JSON.parse(await readFile(targetPath, 'utf8')).hooks.SubagentStart, [hook('first')]);
  assert.equal(sharedHooksAreIntact(await readFile(targetPath), await ownership()), true);
}));

test('stale cleanup plan cannot remove newly installed or foreign groups', async () => fixture(async ({ targetPath, statePath, plan, ownership, root }) => {
  await writeFile(targetPath, bytes({ hooks: { Stop: [hook('foreign')] } }));
  assert.equal((await applyDeploymentPlan(await plan('first', ownedGroups('first')), statePath)).success, true);
  const owned = await ownership();
  const action = { runtime: 'codex', targetPath, expectedHash: sharedHooksOwnershipHash(owned), type: 'hook', reason: 'stale-managed', sharedHooks: owned };
  assert.equal((await applyDeploymentPlan(await plan('second', ownedGroups('second'), owned), statePath)).success, true);
  const before = await readFile(targetPath);
  const staleResult = await applyManagedCleanupPlan({ planId: 'cleanup', repoPath: root, createdAt: new Date().toISOString(), targets: ['codex'], actions: [action], diagnostics: [] }, statePath);
  assert.equal(staleResult.skipped, 1);
  assert.deepEqual(await readFile(targetPath), before);
  const fake = prepareSharedHooks(undefined, { Stop: [hook('foreign')] }).sharedHooks.ownership;
  const fakeAction = { ...action, sharedHooks: fake, expectedHash: sharedHooksOwnershipHash(fake) };
  const forgedResult = await applyDeploymentPlan({ deploymentId: 'forged', repoPath: root, createdAt: new Date().toISOString(), targets: ['codex'], artifacts: [], cleanupActions: [fakeAction], diagnostics: [] }, statePath);
  assert.equal(forgedResult.success, false);
  assert.deepEqual(await readFile(targetPath), before);
}));

test('failed cleanup restores the shared hooks document and its ownership ledger', async () => fixture(async ({ targetPath, statePath, plan, ownership, root }) => {
  await writeFile(targetPath, bytes({ hooks: { Stop: [hook('foreign')] } }));
  assert.equal((await applyDeploymentPlan(await plan('first', ownedGroups('managed')), statePath)).success, true);
  const owned = await ownership();
  const original = await readFile(targetPath);
  const originalLedger = await readFile(statePath);
  const temporaryState = `${statePath}.tmp`;
  // saveDeploymentState must fail after the shared document has been updated.
  await mkdir(temporaryState);
  const result = await applyManagedCleanupPlan({ planId: 'cleanup-fails', repoPath: root, createdAt: new Date().toISOString(), targets: ['codex'], diagnostics: [], actions: [{ runtime: 'codex', targetPath, expectedHash: sharedHooksOwnershipHash(owned), type: 'hook', reason: 'stale-managed', sharedHooks: owned }] }, statePath);
  assert.equal(result.success, false);
  assert.deepEqual(await readFile(targetPath), original);
  assert.deepEqual(await readFile(statePath), originalLedger);
}));
