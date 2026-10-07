import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { inspectPackage, sourceRoot } from '../scripts/research-package.mjs';
import { verifyResearchPackageIntegrity } from '../scripts/research-integrity.mjs';
import { generateResearchDefinitions } from '../scripts/research-definitions.mjs';

async function profile(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'agent-forge-research-global-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const codexHome = path.join(directory, 'codex');
  const stateHome = path.join(directory, 'installer-state');
  const dataRoot = path.join(directory, 'retained-records');
  const runtimeRoot = path.join(codexHome, 'research-specialists');
  const args = ['--codex-home', codexHome, '--state-home', stateHome, '--python', process.execPath, '--data-root', dataRoot];
  const run = (command, extra = []) => spawnSync(process.execPath, [path.join(sourceRoot, 'tests', 'fixtures', 'legacy-native', 'install.mjs'), command, ...args, ...extra], { encoding: 'utf8', windowsHide: true, shell: false });
  const success = (command, extra = []) => {
    const result = run(command, extra);
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
  };
  const install = () => success('install', ['--expected', success('preview').fingerprint]);
  return { directory, codexHome, stateHome, dataRoot, runtimeRoot, run, success, install };
}

test('the module preserves twenty specialist roles, twenty-one complete skills and approved model assignments', async () => {
  const inventory = await inspectPackage();
  assert.equal(inventory.specialists, 20);
  assert.equal(inventory.skills, 21);
  assert.ok(!inventory.files.some(file => /(?:marketplace|\.codex-plugin)/.test(file.path)));
  const roster = JSON.parse(await readFile(path.join(sourceRoot, 'research-roster.json'), 'utf8'));
  const models = new Map();
  for (const role of roster.specialists) {
    const key = `${role.model}/${role.reasoning}`;
    models.set(key, (models.get(key) || 0) + 1);
    assert.ok((await readFile(path.join(sourceRoot, role.roleFile), 'utf8')).length > 200);
  }
  assert.deepEqual(Object.fromEntries(models), { 'gpt-6.1-sol/high': 3, 'gpt-6-astra/high': 15, 'gpt-6.1-sol/medium': 1, 'gpt-6-astra/medium': 1 });
  assert.equal(roster.specialists.filter(a => a.readOnly).length, 1);
});

test('generated skill descriptions preserve the folded Nature response block and the twenty simple descriptions', async () => {
  const definitions = (await generateResearchDefinitions(sourceRoot, sourceRoot, path.dirname(sourceRoot))).filter(definition => definition.kind === 'skill');
  assert.equal(definitions.length, 21);
  const response = definitions.find(definition => definition.name === 'agent-forge-research-nature-response');
  const description = JSON.parse(response.bytes.toString('utf8').split('\n').find(line => line.startsWith('description: ')).slice('description: '.length));
  assert.equal(description, 'Draft, audit, or revise responses to peer review, revision cover letters, and marked-manuscript or LaTeX revision packages. Use for 审稿意见回复、逐点回复、返修信、 rebuttals and edits to existing response drafts. Initial-submission materials belong to nature-writing; simulated peer review belongs to nature-reviewer.');
  for (const definition of definitions.filter(item => item !== response)) {
    const name = definition.name.slice('agent-forge-research-'.length);
    const original = await readFile(path.join(sourceRoot, 'skills', name, 'SKILL.md'), 'utf8');
    const expected = original.split(/\r?\n/).find(line => line.startsWith('description:')).slice('description:'.length).replace(/\s+/g, ' ').trim();
    const actual = JSON.parse(definition.bytes.toString('utf8').split('\n').find(line => line.startsWith('description: ')).slice('description: '.length));
    assert.equal(actual, expected, name);
  }
});

test('installation generates twenty global agents and twenty-one skill entries with the catalog models and no permission overrides', async t => {
  const f = await profile(t);
  const preview = f.success('preview');
  assert.equal(preview.agents, 20);
  assert.equal(preview.hookGroups, 7);
  await assert.rejects(readdir(f.codexHome), { code: 'ENOENT' });
  f.success('install', ['--expected', preview.fingerprint]);
  const verified = f.success('verify');
  assert.equal(verified.agents.length, 20);
  assert.equal(verified.skills, 21);
  assert.equal(verified.integrity.verifiedDefinitions, 44);
  const roster = JSON.parse(await readFile(path.join(sourceRoot, 'research-roster.json'), 'utf8'));
  assert.equal((await readdir(path.join(f.codexHome, 'agents'))).length, 20);
  assert.equal((await readdir(path.join(f.codexHome, 'skills'))).length, 21);
  for (const role of roster.specialists) {
    const definition = await readFile(path.join(f.codexHome, 'agents', `${role.id}.toml`), 'utf8');
    assert.ok(definition.includes(`model = "${role.model}"`));
    assert.ok(definition.includes(`model_reasoning_effort = "${role.reasoning}"`));
    assert.ok(definition.includes(f.runtimeRoot.replaceAll('\\', '/')));
    assert.doesNotMatch(definition, /^(?:sandbox_mode|approval_policy|mcp_servers)\s*=/m);
    if (role.readOnly) assert.match(definition, /This role is read-only/);
  }
  const sourceInventory = await inspectPackage();
  for (const file of sourceInventory.files) assert.deepEqual(await readFile(path.join(f.runtimeRoot, file.path)), await readFile(path.join(sourceRoot, file.path)), file.path);
  const entry = await readFile(path.join(f.codexHome, 'skills', 'agent-forge-research-direct-research', 'SKILL.md'), 'utf8');
  assert.ok(entry.includes(path.join(f.runtimeRoot, 'skills', 'direct-research', 'SKILL.md').replaceAll('\\', '/')));
  for (const name of ['nature-shared', 'nature-writing', 'nature-response']) {
    const metadata = await readFile(path.join(f.codexHome, 'skills', `agent-forge-research-${name}`, 'agents', 'openai.yaml'), 'utf8');
    const original = await readFile(path.join(sourceRoot, 'skills', name, 'agents', 'openai.yaml'), 'utf8');
    assert.equal(metadata, original.replace(/\$(nature-(?:shared|writing|response))\b/g, '$agent-forge-research-$1'));
    assert.ok(metadata.includes(`$agent-forge-research-${name}`));
    if (name === 'nature-shared') assert.match(metadata, /allow_implicit_invocation: false/);
  }
  await assert.rejects(readdir(f.dataRoot), { code: 'ENOENT' });
});

test('installation is idempotent and preserves foreign agents skills configuration hooks and existing session records', async t => {
  const f = await profile(t);
  await mkdir(path.join(f.codexHome, 'agents'), { recursive: true });
  await mkdir(path.join(f.codexHome, 'skills', 'foreign-skill'), { recursive: true });
  await mkdir(f.dataRoot, { recursive: true });
  const foreign = [
    [path.join(f.codexHome, 'config.toml'), 'model = "foreign-model"\n'],
    [path.join(f.codexHome, 'AGENTS.md'), 'Existing personal instructions.\n'],
    [path.join(f.codexHome, 'agents', 'foreign.toml'), 'name = "foreign"\n'],
    [path.join(f.codexHome, 'skills', 'foreign-skill', 'SKILL.md'), 'Existing foreign skill.\n'],
    [path.join(f.dataRoot, 'retained-session.json'), '{"status":"interrupted"}\n'],
  ];
  for (const [file, content] of foreign) await writeFile(file, content);
  const group = { hooks: [{ type: 'command', command: 'foreign-hook', timeout: 3, statusMessage: 'foreign' }] };
  const hooks = { existingMetadata: 'retained', hooks: { PreToolUse: [group] } };
  await writeFile(path.join(f.codexHome, 'hooks.json'), JSON.stringify(hooks));
  f.install();
  const second = f.install();
  assert.equal(second.alreadyCurrent, true);
  assert.equal(second.changedFiles, 0);
  for (const [file, content] of foreign) assert.equal(await readFile(file, 'utf8'), content);
  const next = JSON.parse(await readFile(path.join(f.codexHome, 'hooks.json'), 'utf8'));
  assert.deepEqual(next.hooks.PreToolUse[0], group);
  assert.equal(next.existingMetadata, 'retained');
  const originalHooks = JSON.parse(await readFile(path.join(sourceRoot, 'hooks', 'hooks.json'), 'utf8'));
  assert.equal(Object.keys(next.hooks).length, 7);
  for (const [event, groups] of Object.entries(next.hooks)) {
    const own = groups.at(-1).hooks[0];
    assert.equal(own.timeout, originalHooks.hooks[event][0].hooks[0].timeout);
    assert.equal(own.statusMessage, originalHooks.hooks[event][0].hooks[0].statusMessage);
    assert.equal(own.commandWindows, `node "${path.join(f.runtimeRoot, 'scripts', 'research-hooks.mjs').replaceAll('\\', '/')}"`);
    assert.ok(!own.command.includes('PLUGIN_ROOT'));
  }
});

test('foreign target collisions and stale previews are rejected before any managed write', async t => {
  const f = await profile(t);
  const preview = f.success('preview');
  await mkdir(path.join(f.codexHome, 'agents'), { recursive: true });
  const collision = path.join(f.codexHome, 'agents', 'research-literature-search.toml');
  await writeFile(collision, 'Existing file owned by someone else.');
  assert.equal(f.run('install', ['--expected', preview.fingerprint]).status, 1);
  assert.equal(await readFile(collision, 'utf8'), 'Existing file owned by someone else.');
  await assert.rejects(readdir(f.runtimeRoot), { code: 'ENOENT' });
  await rm(collision);
  const current = f.success('preview');
  await writeFile(path.join(f.codexHome, 'hooks.json'), JSON.stringify({ hooks: {}, metadata: 'changed after preview' }));
  assert.equal(f.run('install', ['--expected', current.fingerprint]).status, 1);
  await assert.rejects(readdir(f.runtimeRoot), { code: 'ENOENT' });
});

test('changed global model definitions and runtime content fail integrity and are preserved by reinstallation', async t => {
  const f = await profile(t);
  f.install();
  const agent = path.join(f.codexHome, 'agents', 'research-literature-search.toml');
  const original = await readFile(agent, 'utf8');
  const changed = original.replace('model = "gpt-6.1-sol"', 'model = "unexpected-model"');
  await writeFile(agent, changed);
  await assert.rejects(verifyResearchPackageIntegrity(f.runtimeRoot), /differs/);
  assert.equal(f.run('verify').status, 1);
  assert.equal(f.run('preview').status, 1);
  assert.equal(await readFile(agent, 'utf8'), changed);
  await writeFile(agent, original);
  await writeFile(path.join(f.runtimeRoot, 'scripts', 'research_policy.py'), '# changed by test');
  await assert.rejects(verifyResearchPackageIntegrity(f.runtimeRoot), /differs/);
});

test('the Python launcher refuses an added program that was never reviewed', async t => {
  const f = await profile(t);
  f.install();
  const authorization = path.join(f.directory, 'authorization.json');
  await writeFile(authorization, JSON.stringify({ version: 1, authorizationReference: 'Controlled launcher test', purpose: 'Reject unreviewed code' }));
  await writeFile(path.join(f.runtimeRoot, 'scripts', 'unreviewed.py'), 'raise RuntimeError("This program must never start")');
  const launched = spawnSync(process.execPath, [path.join(f.runtimeRoot, 'scripts', 'run-research-python.mjs'), '--authorization', authorization, '--script', 'scripts/unreviewed.py', '--'], { encoding: 'utf8', windowsHide: true, shell: false });
  assert.equal(launched.status, 1);
  assert.match(launched.stderr, /must be included in the reviewed inventory/);
  assert.doesNotMatch(launched.stderr, /This program must never start/);
});
