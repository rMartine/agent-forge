import assert from 'node:assert/strict';
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { loadRosterCatalog, loadManifest, createDeploymentPlan, validateManifest, validateRoster, catalogFingerprint } from '../dist/index.js';

const repo = path.resolve(import.meta.dirname, '../../..');

test('all four rosters use 45 neutral agent sources and one preserved skill inventory', async () => {
  const catalog = await loadRosterCatalog(repo);
  assert.equal(catalog.agents.length, 45);
  assert.equal(catalog.agents.filter(agent => agent.coordinator).length, 4);
  assert.equal(catalog.agents.filter(agent => agent.model && !agent.coordinator).length, 40);
  assert.deepEqual(Object.fromEntries(catalog.rosters.map(roster => [roster.id, catalog.agents.filter(agent => agent.roster === roster.id && !agent.coordinator).length])), { development: 16, research: 20, communication: 4, consulting: 1 });
  assert.equal(new Set(catalog.resources.filter(resource => resource.kind === 'skill').map(resource => resource.relativePath.split('/')[0])).size, 70);
  for (const agent of catalog.agents) {
    assert.equal(agent.delegation, 'allowed');
    assert.match(agent.sourcePath.replaceAll('\\', '/'), /\/rosters\/[^/]+\/[^/]+\.md$/);
    assert.doesNotMatch(agent.body, /do not delegate|do not[^\n.]{0,100}spawn subagents|no delegues/i);
    assert.ok(agent.completionEvidence.length);
  }
  for (const agent of catalog.agents.filter(entry => entry.roster === 'research')) {
    const sourceDirectory = path.dirname(path.resolve(repo, agent.sourcePath));
    const links = [...agent.body.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map(match => match[1]);
    for (const target of links.filter(value => !/^[a-z][a-z0-9+.-]*:/i.test(value))) {
      await access(path.resolve(sourceDirectory, target), undefined).catch(error => {
        throw new Error(`${agent.id} contains an unresolved source link ${target}: ${error.message}`);
      });
    }
  }
  const licenses = catalog.resources.filter(resource => /(?:^|\/)(?:LICENSE|NOTICE|COPYING)(?:\.[^/]+)?$/i.test(resource.relativePath));
  assert.ok(licenses.length >= 10);
  for (const resource of licenses) {
    assert.equal(resource.adaptation, 'none');
    assert.deepEqual(resource.content, await readFile(resource.sourcePath));
  }
  assert.equal(catalogFingerprint(await loadRosterCatalog(repo)), catalogFingerprint(catalog));
});

test('v6 requires a canonical catalog and neutral deployment roots', async () => {
  const manifest = await loadManifest(repo);
  const missing = structuredClone(manifest);
  delete missing.rosterCatalog;
  assert.throws(() => validateManifest(missing), /rosterCatalog/);
  const traversal = structuredClone(manifest);
  traversal.rosterCatalog = '../outside.json';
  assert.throws(() => validateManifest(traversal), /repository-relative/);
  const catalog = await loadRosterCatalog(repo);
  const result = await validateRoster(repo, manifest, undefined, { resolvedCatalog: catalog });
  assert.equal(result.valid, true, JSON.stringify(result.diagnostics));
});

test('both native deployments use the same 45 roles and merge foreign Codex hooks', async () => {
  const profile = await mkdtemp(path.join(os.tmpdir(), 'agent-forge-canonical-plan-'));
  const oldProfile = process.env.USERPROFILE, oldHome = process.env.HOME;
  process.env.USERPROFILE = profile;
  process.env.HOME = profile;
  try {
    const hooks = path.join(profile, '.codex', 'hooks.json');
    await mkdir(path.dirname(hooks), { recursive: true });
    const foreign = { hooks: [{ type: 'command', command: 'foreign-owned-command' }] };
    await writeFile(hooks, JSON.stringify({ hooks: { Stop: [foreign] }, foreignSetting: true }));
    const plan = await createDeploymentPlan(repo, { target: 'all' });
    assert.deepEqual(plan.diagnostics.filter(item => item.severity === 'error'), []);
    for (const runtime of ['codex', 'vscode']) {
      const agents = plan.artifacts.filter(item => item.runtime === runtime && item.type === 'agent');
      assert.equal(agents.length, 45);
      assert.equal(new Set(agents.map(item => item.id)).size, 45);
      for (const artifact of agents) assert.ok(artifact.targetPath.startsWith(profile));
    }
    const shared = plan.artifacts.find(item => item.runtime === 'codex' && item.sharedHooks);
    assert.ok(shared);
    const document = JSON.parse(shared.content.toString('utf8'));
    assert.equal(document.foreignSetting, true);
    assert.deepEqual(document.hooks.Stop[0], foreign);
    assert.equal(new Set(plan.artifacts.map(item => item.targetPath.toLowerCase())).size, plan.artifacts.length);
  } finally {
    if (oldProfile === undefined) delete process.env.USERPROFILE; else process.env.USERPROFILE = oldProfile;
    if (oldHome === undefined) delete process.env.HOME; else process.env.HOME = oldHome;
    await rm(profile, { recursive: true, force: true });
  }
});
