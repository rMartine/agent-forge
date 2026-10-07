import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { emptyDeploymentState, hashBuffer, loadManifest, saveDeploymentState, validateRoster } from '../dist/index.js';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const skillId = 'agent-forge-engineering';
const skillBytes = Buffer.from('---\nname: agent-forge-engineering\ndescription: fixture\n---\nRead only.\n');
const canonical = {
  schemaVersion: 1,
  rosters: [],
  agents: [],
  resources: [{ kind: 'skill', relativePath: `${skillId}/SKILL.md`, content: skillBytes }],
  diagnostics: [],
};

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'agent-forge-v6-discovery-'));
  const workspace = path.join(root, 'workspace');
  const profile = path.join(root, 'profile');
  await mkdir(workspace, { recursive: true });
  await mkdir(profile, { recursive: true });
  t.after(async () => {
    const tempRoot = await realpath(os.tmpdir());
    const resolved = await realpath(root);
    const relative = path.relative(tempRoot, resolved);
    if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error(`Refusing cleanup outside os.tmpdir(): ${resolved}`);
    await rm(resolved, { recursive: true, force: true });
  });
  return { root, workspace, profile, manifest: await loadManifest(repo), env: { USERPROFILE: profile } };
}

async function validate(f, extra = {}) {
  return validateRoster(f.workspace, f.manifest, undefined, { target: 'codex', env: f.env, resolvedCatalog: canonical, ...extra });
}

test('v6 discovery rejects project agents, project skills and personal canonical skill copies', async t => {
  const f = await fixture(t);
  await mkdir(path.join(f.workspace, '.codex/agents'), { recursive: true });
  await writeFile(path.join(f.workspace, '.codex/agents/old.agent.md'), 'old copy');
  const projectSkill = path.join(f.workspace, '.agents/skills', skillId);
  const personalSkill = path.join(f.profile, '.codex/skills', skillId);
  await mkdir(projectSkill, { recursive: true });
  await mkdir(personalSkill, { recursive: true });
  await writeFile(path.join(projectSkill, 'SKILL.md'), skillBytes);
  await writeFile(path.join(personalSkill, 'SKILL.md'), skillBytes);

  const result = await validate(f);
  const duplicates = result.diagnostics.filter(item => item.code === 'AF002' && item.severity === 'error');
  assert.equal(duplicates.length >= 3, true, JSON.stringify(result.diagnostics));
});

test('v6 discovery ignores empty canonical skill directories but still blocks a discoverable duplicate', async t => {
  const f = await fixture(t);
  const personalSkill = path.join(f.profile, '.codex/skills', skillId);
  await mkdir(personalSkill, { recursive: true });

  const empty = await validate(f);
  assert.equal(empty.diagnostics.some(item => item.code === 'AF002' && item.severity === 'error'), false, JSON.stringify(empty.diagnostics));

  await writeFile(path.join(personalSkill, 'SKILL.md'), skillBytes);
  const discoverable = await validate(f);
  const duplicate = discoverable.diagnostics.filter(item => item.code === 'AF002' && item.severity === 'error');
  assert.equal(duplicate.length, 1, JSON.stringify(discoverable.diagnostics));
  assert.match(duplicate[0].message, /Personal Codex skill duplicates managed skill/);
});

test('v6 migration exempts only hash-intact active files scheduled for removal', async t => {
  const f = await fixture(t);
  const skillDirectory = path.join(f.profile, '.codex/skills', skillId);
  const skillFile = path.join(skillDirectory, 'SKILL.md');
  await mkdir(skillDirectory, { recursive: true });
  await writeFile(skillFile, skillBytes);
  const statePath = path.join(f.profile, '.agent-forge/state.json');
  const state = emptyDeploymentState();
  state.activeDeployments.codex = 'active-codex';
  state.deployments.push({ id: 'active-codex', runtime: 'codex', createdAt: '2026-10-07T00:00:00.000Z', repoPath: f.workspace, artifacts: [{
    id: `${skillId}/SKILL.md`, runtime: 'codex', type: 'skill', sourcePath: 'canonical', targetPath: skillFile,
    deployedHash: hashBuffer(skillBytes), existedBefore: false,
  }] });
  await saveDeploymentState(statePath, state);

  const plannedCleanupPaths = new Set([path.resolve(skillFile).toLowerCase()]);
  const intact = await validate(f, { plannedCleanupPaths });
  assert.equal(intact.diagnostics.some(item => item.code === 'AF002' && item.severity === 'error'), false, JSON.stringify(intact.diagnostics));
  assert.equal(intact.diagnostics.some(item => item.code === 'AF002' && item.severity === 'warning'), true, JSON.stringify(intact.diagnostics));

  await writeFile(skillFile, 'modified user content');
  const modified = await validate(f, { plannedCleanupPaths });
  assert.equal(modified.diagnostics.some(item => item.code === 'AF002' && item.severity === 'error'), true, JSON.stringify(modified.diagnostics));

  await writeFile(skillFile, skillBytes);
  await writeFile(path.join(skillDirectory, 'personal-note.txt'), 'unowned content');
  const withForeignFile = await validate(f, { plannedCleanupPaths });
  assert.equal(withForeignFile.diagnostics.some(item => item.code === 'AF002' && item.severity === 'error'), true, JSON.stringify(withForeignFile.diagnostics));
});
