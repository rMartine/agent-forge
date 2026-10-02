import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { hashBuffer, loadExternalSkillCatalog, resolveExternalSkillFiles, externalSkillCachePath } from '../dist/index.js';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'agent-forge-external-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const skill = { id: 'example', deploymentName: 'agent-forge-example', directoryUrl: 'https://www.skills.sh/example/repo/example', repositoryUrl: 'https://github.com/example/repo', revision: 'a'.repeat(40), sourceDirectory: 'skills/example', license: 'MIT', licensePath: 'LICENSE', agentIds: ['worker'], description: 'During a software product build, use the example workflow.', files: [] };
  const inputs = { 'SKILL.md': Buffer.from('---\nname: example\ndescription: Original\n---\nRead [reference](references/usage.md).\nUnwanted rule.\n'), 'references/usage.md': Buffer.from('Use assets/sample.bin.\n'), 'assets/sample.bin': Buffer.from([0, 255, 27, 128]), LICENSE: Buffer.from('Test license text') };
  for (const [name, content] of Object.entries(inputs)) {
    const file = { path: name, repositoryPath: name === 'LICENSE' ? name : `skills/example/${name}`, sha256: hashBuffer(content) };
    skill.files.push(file);
    const location = externalSkillCachePath(root, skill, file);
    await mkdir(path.dirname(location), { recursive: true });
    await writeFile(location, content);
  }
  const manifest = { codex: { agents: { worker: {} }, skillBundles: {}, externalSkillCatalog: 'catalog.json' } };
  const save = () => writeFile(path.join(root, 'catalog.json'), JSON.stringify({ version: 1, skills: [skill] }));
  await save();
  return { root, skill, manifest, save, inputs };
}

test('external skills preserve all pinned resource bytes and apply only explicit adaptations', async t => {
  const f = await fixture(t);
  f.skill.adaptations = [{ path: 'SKILL.md', find: 'Unwanted rule.', replace: 'Follow the assigned task.', reason: 'Avoid an unrelated action.' }];
  await f.save();
  const catalog = await loadExternalSkillCatalog(f.root, f.manifest);
  const files = await resolveExternalSkillFiles(f.root, catalog.skills[0]);
  assert.deepEqual(files.find(file => file.relativePath === 'assets/sample.bin').content, f.inputs['assets/sample.bin']);
  assert.match(files[0].content.toString(), /name: agent-forge-example/);
  assert.doesNotMatch(files[0].content.toString(), /Unwanted rule/);
  assert.match(files[0].content.toString(), /Follow the assigned task/);
  assert.match((await readFile(externalSkillCachePath(f.root, f.skill, f.skill.files[0]))).toString(), /Unwanted rule/);
  assert.equal(JSON.parse(files.find(file => file.relativePath === 'SOURCE.json').content).revision, f.skill.revision);
});

test('modified or missing cached resources block offline preview instead of using unpinned bytes', async t => {
  const f = await fixture(t);
  const location = externalSkillCachePath(f.root, f.skill, f.skill.files[1]);
  await writeFile(location, 'changed');
  await assert.rejects(resolveExternalSkillFiles(f.root, f.skill), /integrity check failed/);
  await rm(location);
  await assert.rejects(resolveExternalSkillFiles(f.root, f.skill), /download-skills/);
});

test('catalog rejects traversal, unpinned sources, missing licenses and unknown agents', async t => {
  const f = await fixture(t);
  const baseline = structuredClone(f.skill);
  for (const edit of [
    skill => { skill.files[0].path = '../outside'; },
    skill => { skill.files[0].path = 'file:alternate'; },
    skill => { skill.files.push({ path: 'source.JSON', repositoryPath: 'SOURCE.json', sha256: 'a'.repeat(64) }); },
    skill => { skill.revision = 'main'; },
    skill => { skill.directoryUrl = 'https://example.com/skill'; },
    skill => { skill.licensePath = 'missing-license'; },
    skill => { skill.agentIds = ['unknown']; },
  ]) {
    Object.assign(f.skill, structuredClone(baseline)); edit(f.skill); await f.save();
    await assert.rejects(loadExternalSkillCatalog(f.root, f.manifest));
  }
});

test('an upstream change cannot silently disable an adaptation', async t => {
  const f = await fixture(t);
  f.skill.adaptations = [{ path: 'SKILL.md', find: 'Text not present', replace: '', reason: 'Required removal' }];
  await assert.rejects(resolveExternalSkillFiles(f.root, f.skill), /exactly once/);
});
