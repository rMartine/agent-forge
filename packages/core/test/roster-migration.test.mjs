import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createRosterMigrationPlan, saveRosterMigrationPlan, loadRosterMigrationPlan, applyRosterMigrationPlan, restoreRosterMigration } from '../dist/rosterMigration.js';
import { hashBuffer } from '../dist/hash.js';
import { loadDeploymentState } from '../dist/state.js';
import { prepareSharedHooks, sharedHooksAreIntact } from '../dist/sharedHooks.js';
import { applyDeploymentPlan, rollbackDeployment } from '../dist/transaction.js';

const json = value => JSON.stringify(value, null, 2) + '\n';
async function put(filePath, content) { await mkdir(path.dirname(filePath), { recursive: true }); await writeFile(filePath, content); }
async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'agent-forge-roster-migration-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const codexHome = path.join(root, '.codex'), statePath = path.join(root, '.agent-forge', 'state.json');
  const legacyLedgers = [], groups = [], files = [];
  for (const [index, packageName] of ['research-specialists', 'independent-specialists', 'consulting-specialist'].entries()) {
    const stateHome = path.join(root, `.agent-forge-${packageName}`);
    const owned = [
      { path: path.join(codexHome, 'agents', `specialist-${index}.toml`), content: `name = "specialist-${index}"\n` },
      { path: path.join(codexHome, packageName, 'hooks.mjs'), content: `// ${packageName} hook runtime\n` },
    ].map(file => ({ path: file.path, sha256: hashBuffer(Buffer.from(file.content)), content: Buffer.from(file.content).toString('base64') }));
    for (const file of owned) { await put(file.path, Buffer.from(file.content, 'base64')); files.push(file); }
    const hook = { event: 'SubagentStart', group: { matcher: `^specialist-${index}$`, hooks: [{ type: 'command', command: `node ${packageName}/hooks.mjs` }] } }; groups.push(hook);
    const ledgerPath = path.join(stateHome, 'state.json');
    await put(ledgerPath, json({ schemaVersion: 1, packageName, codexHome, stateHome, current: { files: owned, groups: [hook] }, previous: { files: [], groups: [] }, createdHooks: false }));
    legacyLedgers.push({ packageName, statePath: ledgerPath });
  }
  const coreAgent = path.join(codexHome, 'agents', 'core.toml'); await put(coreAgent, 'core original');
  const foreign = { matcher: '^personal$', hooks: [{ type: 'command', command: 'personal-command' }] };
  const baseDocument = { personalSetting: true, hooks: { SubagentStart: [foreign, ...groups.map(item => item.group)] } };
  const rendered = prepareSharedHooks(Buffer.from(json(baseDocument)), { SubagentStart: [{ matcher: '^core$', hooks: [{ type: 'command', command: 'core-command' }] }] });
  const hookPath = path.join(codexHome, 'hooks.json'); await put(hookPath, rendered.content);
  const artifacts = [
    { id: 'core', runtime: 'codex', type: 'agent', targetPath: coreAgent, deployedHash: hashBuffer(Buffer.from('core original')), existedBefore: false },
    { id: 'core-hooks', runtime: 'codex', type: 'hook', targetPath: hookPath, deployedHash: hashBuffer(rendered.content), existedBefore: true, sharedHooks: rendered.sharedHooks.ownership },
  ];
  const archivePath = path.join(root, '.copilot', 'agents', 'old-worker.agent.md'); await put(archivePath, 'locally modified legacy agent');
  const protectedPath = path.join(root, '.copilot', 'agents', 'personal.agent.md'); await put(protectedPath, 'unmanaged personal agent');
  const originalState = Buffer.from(json({ schemaVersion: 2, activeDeployments: { codex: 'old-codex', vscode: 'current-vscode' }, deployments: [
    { id: 'old-vscode', runtime: 'vscode', createdAt: '2026-01-01', repoPath: root, artifacts: [{ id: 'legacy', runtime: 'vscode', type: 'agent', targetPath: archivePath, deployedHash: hashBuffer(Buffer.from('old source')), existedBefore: false }] },
    { id: 'current-vscode', runtime: 'vscode', createdAt: '2026-01-02', repoPath: root, artifacts: [] },
    { id: 'old-codex', runtime: 'codex', createdAt: '2026-01-02', repoPath: root, artifacts },
  ] }));
  await put(statePath, originalState);
  return { root, codexHome, statePath, legacyLedgers, files, coreAgent, hookPath, archivePath, protectedPath, originalState, options: { codexHome, legacyLedgers, legacyArchivePaths: [archivePath] } };
}

test('migration transfers three ledgers and shared hook ownership, archives exact modified historical files and restores everything', async t => {
  const f = await fixture(t), originalHooks = await readFile(f.hookPath);
  const originals = await Promise.all(f.legacyLedgers.map(item => readFile(item.statePath)));
  const plan = await createRosterMigrationPlan(f.statePath, f.options);
  const planPath = await saveRosterMigrationPlan(plan, f.statePath);
  assert.deepEqual(await readFile(f.statePath), f.originalState);
  assert.equal(plan.archives[0].sha256, hashBuffer(Buffer.from('locally modified legacy agent')));
  const loaded = await loadRosterMigrationPlan(f.statePath, plan.planId);
  assert.deepEqual(loaded, plan);
  const applied = await applyRosterMigrationPlan(loaded, f.statePath, plan.planId);
  assert.equal(applied.success, true, json(applied.errors));
  const state = await loadDeploymentState(f.statePath), record = state.deployments.find(item => item.id === plan.planId);
  assert.equal(state.activeDeployments.codex, plan.planId);
  assert.equal(state.activeDeployments.vscode, 'current-vscode');
  assert.equal(record.artifacts.length, 8);
  assert.equal(record.artifacts.find(item => item.sharedHooks).sharedHooks.groups.length, 4);
  assert.equal(sharedHooksAreIntact(await readFile(f.hookPath), record.artifacts.find(item => item.sharedHooks).sharedHooks), true);
  assert.deepEqual(await readFile(f.hookPath), originalHooks);
  for (const item of f.legacyLedgers) assert.equal(JSON.parse(await readFile(item.statePath, 'utf8')).schemaVersion, 0);
  await assert.rejects(readFile(f.archivePath), /ENOENT/);
  assert.equal(await readFile(path.join(path.dirname(planPath), 'archive', '0.bak'), 'utf8'), 'locally modified legacy agent');
  assert.equal(await readFile(f.protectedPath, 'utf8'), 'unmanaged personal agent');
  const restored = await restoreRosterMigration(f.statePath, plan.planId, plan.planId);
  assert.equal(restored.success, true, json(restored.errors));
  assert.deepEqual(await readFile(f.statePath), f.originalState);
  for (const [index, item] of f.legacyLedgers.entries()) assert.deepEqual(await readFile(item.statePath), originals[index]);
  assert.equal(await readFile(f.archivePath, 'utf8'), 'locally modified legacy agent');
});

test('normal deployment and rollback preserve imported ownership before migration recovery', async t => {
  const f = await fixture(t), plan = await createRosterMigrationPlan(f.statePath, f.options);
  assert.equal((await applyRosterMigrationPlan(plan, f.statePath, plan.planId)).success, true);
  const state = await loadDeploymentState(f.statePath), record = state.deployments.find(item => item.id === plan.planId);
  const artifacts = [];
  for (const item of record.artifacts) {
    if (item.sharedHooks) {
      const desired = {};
      for (const entry of item.sharedHooks.groups) (desired[entry.event] ??= []).push({ ...entry.group, hooks: [{ type: 'command', command: `updated-${entry.group.matcher}` }] });
      const hooks = prepareSharedHooks(await readFile(item.targetPath), desired, item.sharedHooks);
      artifacts.push({ id: item.id, type: item.type, runtime: 'codex', targetPath: item.targetPath, sourcePath: 'source', content: hooks.content, sourceHash: hashBuffer(hooks.content), sharedHooks: hooks.sharedHooks });
    } else {
      const content = Buffer.from(`updated ${item.id}`);
      artifacts.push({ id: item.id, type: item.type, runtime: 'codex', targetPath: item.targetPath, sourcePath: 'source', content, sourceHash: hashBuffer(content) });
    }
  }
  const deployed = await applyDeploymentPlan({ deploymentId: 'unified-release', createdAt: new Date().toISOString(), repoPath: f.root, targets: ['codex'], diagnostics: [], cleanupActions: [], artifacts }, f.statePath);
  assert.equal(deployed.success, true, json(deployed));
  assert.equal((await restoreRosterMigration(f.statePath, plan.planId, plan.planId)).success, false);
  assert.equal((await rollbackDeployment(f.statePath, 'codex')).success, true);
  const recovered = await restoreRosterMigration(f.statePath, plan.planId, plan.planId);
  assert.equal(recovered.success, true, json(recovered));
  assert.deepEqual(await readFile(f.statePath), f.originalState);
});

test('migration refuses unrecorded, active and duplicate archival paths', async t => {
  const f = await fixture(t);
  for (const legacyArchivePaths of [[f.protectedPath], [f.coreAgent], [f.archivePath, f.archivePath]]) await assert.rejects(createRosterMigrationPlan(f.statePath, { ...f.options, legacyArchivePaths }), /AF009/);
  assert.equal(await readFile(f.protectedPath, 'utf8'), 'unmanaged personal agent');
});

test('migration blocks ledger, owned file, hook group and archived content drift without mutation', async t => {
  for (const mutation of ['core', 'ledger', 'owned', 'hooks', 'archive']) {
    const f = await fixture(t), plan = await createRosterMigrationPlan(f.statePath, f.options);
    if (mutation === 'core') await writeFile(f.statePath, Buffer.concat([f.originalState, Buffer.from('\n')]));
    if (mutation === 'ledger') await writeFile(f.legacyLedgers[0].statePath, '{}');
    if (mutation === 'owned') await writeFile(f.files[0].path, 'changed');
    if (mutation === 'hooks') { const document = JSON.parse(await readFile(f.hookPath, 'utf8')); document.hooks.SubagentStart.pop(); await writeFile(f.hookPath, json(document)); }
    if (mutation === 'archive') await writeFile(f.archivePath, 'changed');
    const before = await readFile(f.statePath);
    const result = await applyRosterMigrationPlan(plan, f.statePath, plan.planId);
    assert.equal(result.success, false, mutation);
    assert.deepEqual(await readFile(f.statePath), before);
    assert.ok(await readFile(f.archivePath));
  }
});

test('migration preserves foreign hook additions during ownership transfer and recovery', async t => {
  const f = await fixture(t), plan = await createRosterMigrationPlan(f.statePath, f.options);
  const document = JSON.parse(await readFile(f.hookPath, 'utf8'));
  document.hooks.Stop = [{ hooks: [{ type: 'command', command: 'personal-new-hook' }] }];
  await writeFile(f.hookPath, json(document));
  assert.equal((await applyRosterMigrationPlan(plan, f.statePath, plan.planId)).success, true);
  assert.equal((await restoreRosterMigration(f.statePath, plan.planId, plan.planId)).success, true);
  assert.deepEqual(JSON.parse(await readFile(f.hookPath, 'utf8')), document);
});

test('imported ownership collisions and duplicate source hook groups are rejected', async t => {
  for (const mutation of ['file', 'hook', 'protected-path']) {
    const f = await fixture(t), item = f.legacyLedgers[0], ledger = JSON.parse(await readFile(item.statePath, 'utf8'));
    if (mutation === 'file') ledger.current.files[0] = { path: f.coreAgent, sha256: hashBuffer(Buffer.from('core original')), content: Buffer.from('core original').toString('base64') };
    if (mutation === 'hook') ledger.current.groups.push(ledger.current.groups[0]);
    if (mutation === 'protected-path') { const protectedConfig = path.join(f.codexHome, 'config.toml'); await put(protectedConfig, 'protected'); ledger.current.files[0] = { path: protectedConfig, sha256: hashBuffer(Buffer.from('protected')), content: Buffer.from('protected').toString('base64') }; }
    await writeFile(item.statePath, json(ledger));
    await assert.rejects(createRosterMigrationPlan(f.statePath, f.options), /AF009/);
  }
});

test('failure after replacing one legacy ledger compensates earlier writes and permits retry', async t => {
  const f = await fixture(t), plan = await createRosterMigrationPlan(f.statePath, f.options);
  const originals = await Promise.all(f.legacyLedgers.map(item => readFile(item.statePath)));
  const blocker = `${f.legacyLedgers[1].statePath}.migration-tmp`; await mkdir(blocker);
  const applied = await applyRosterMigrationPlan(plan, f.statePath, plan.planId);
  assert.equal(applied.success, false);
  assert.deepEqual(await readFile(f.statePath), f.originalState);
  for (const [index, item] of f.legacyLedgers.entries()) assert.deepEqual(await readFile(item.statePath), originals[index]);
  assert.equal(await readFile(f.archivePath, 'utf8'), 'locally modified legacy agent');
  await rm(blocker, { recursive: true });
  assert.equal((await applyRosterMigrationPlan(plan, f.statePath, plan.planId)).success, true);
});

test('recovery handles an interrupted apply with mixed old and migrated ledgers', async t => {
  const f = await fixture(t), plan = await createRosterMigrationPlan(f.statePath, f.options);
  assert.equal((await applyRosterMigrationPlan(plan, f.statePath, plan.planId)).success, true);
  // Emulate termination after only the first ledger write: original core,
  // two original legacy ledgers, original archival file, persisted preparation.
  await writeFile(f.statePath, f.originalState);
  for (const item of plan.legacyLedgers.slice(1)) await writeFile(item.path, Buffer.from(item.contentBase64, 'base64'));
  await writeFile(f.archivePath, Buffer.from(plan.archives[0].contentBase64, 'base64'));
  const recovered = await restoreRosterMigration(f.statePath, plan.planId, plan.planId);
  assert.equal(recovered.success, true, json(recovered));
  assert.deepEqual(await readFile(f.statePath), f.originalState);
  for (const item of f.legacyLedgers) assert.equal(JSON.parse(await readFile(item.statePath, 'utf8')).schemaVersion, 1);
});

test('recovery preserves concurrent customizations and detects damaged archival backups', async t => {
  for (const mutation of ['archive-replacement', 'owned', 'backup', 'other-runtime']) {
    const f = await fixture(t), plan = await createRosterMigrationPlan(f.statePath, f.options);
    const applied = await applyRosterMigrationPlan(plan, f.statePath, plan.planId); assert.equal(applied.success, true);
    if (mutation === 'archive-replacement') await writeFile(f.archivePath, 'new personal file');
    if (mutation === 'owned') await writeFile(f.files[0].path, 'new customization');
    if (mutation === 'backup') await writeFile(path.join(applied.backupDirectory, 'archive', '0.bak'), 'corrupted');
    if (mutation === 'other-runtime') { const state = JSON.parse(await readFile(f.statePath, 'utf8')); state.activeDeployments.vscode = 'new-vscode'; await writeFile(f.statePath, json(state)); }
    const before = await readFile(f.statePath);
    assert.equal((await restoreRosterMigration(f.statePath, plan.planId, plan.planId)).success, false, mutation);
    assert.deepEqual(await readFile(f.statePath), before);
    assert.equal(JSON.parse(await readFile(f.legacyLedgers[0].statePath, 'utf8')).schemaVersion, 0);
  }
});

test('confirmation, plan snapshots and migration IDs must match exactly', async t => {
  const f = await fixture(t), plan = await createRosterMigrationPlan(f.statePath, f.options);
  assert.equal((await applyRosterMigrationPlan(plan, f.statePath, 'wrong')).success, false);
  const changed = structuredClone(plan); changed.archives[0].contentBase64 = Buffer.from('tampered').toString('base64');
  assert.equal((await applyRosterMigrationPlan(changed, f.statePath, changed.planId)).success, false);
  await assert.rejects(loadRosterMigrationPlan(f.statePath, '../escape'), /AF012/);
  assert.deepEqual(await readFile(f.statePath), f.originalState);
});

test('migration rejects a symbolic link in an owned runtime ancestor', async t => {
  const f = await fixture(t), runtimeRoot = path.join(f.codexHome, 'independent-specialists'), redirect = path.join(f.root, 'redirect');
  await mkdir(redirect); await writeFile(path.join(redirect, 'hooks.mjs'), '// independent-specialists hook runtime\n');
  await rm(runtimeRoot, { recursive: true });
  await symlink(redirect, runtimeRoot, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(createRosterMigrationPlan(f.statePath, f.options), /links and redirects/);
});
