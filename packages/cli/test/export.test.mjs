import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const cli = path.resolve('dist/index.js');
const repo = path.resolve('../..');

test('export --target all writes three editions without changing profile sentinels', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'agent-forge-export-'));
  const output = path.join(root, 'editions');
  const profiles = path.join(root, 'profiles');
  const codexProfile = path.join(profiles, 'codex', 'agents', 'user.toml');
  const vscodeProfile = path.join(profiles, 'vscode', 'agents', 'user.agent.md');
  await mkdir(path.dirname(codexProfile), { recursive: true });
  await mkdir(path.dirname(vscodeProfile), { recursive: true });
  await writeFile(codexProfile, 'user codex profile sentinel\n');
  await writeFile(vscodeProfile, 'user vscode profile sentinel\n');

  try {
    const result = spawnSync(process.execPath, [cli, '--repo', repo, 'export', '--target', 'all', '--output', output, '--json'], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const receipt = JSON.parse(result.stdout);
    assert.deepEqual(receipt.editions.map(edition => edition.edition), ['codex', 'vscode', 'opencode']);
    assert.equal(receipt.editions.every(edition => edition.agents === 45 && edition.skills === 70), true);
    for (const edition of ['codex', 'vscode', 'opencode']) {
      const files = await readdir(path.join(output, edition));
      assert.ok(files.length > 0, `${edition} export must contain files`);
    }
    await readFile(path.join(output, 'opencode', 'opencode.jsonc'), 'utf8');
    const manifest = JSON.parse(await readFile(path.join(repo, 'agent-forge.manifest.jsonc'), 'utf8'));
    assert.deepEqual(manifest.platforms, ['vscode', 'codex']);
    assert.equal(await readFile(codexProfile, 'utf8'), 'user codex profile sentinel\n');
    assert.equal(await readFile(vscodeProfile, 'utf8'), 'user vscode profile sentinel\n');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('export rejects a pre-existing destination without replacing its contents', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'agent-forge-export-existing-'));
  const output = path.join(root, 'editions');
  await mkdir(output, { recursive: true });
  const sentinel = path.join(output, 'keep.txt');
  await writeFile(sentinel, 'preserve\n');
  try {
    const result = spawnSync(process.execPath, [cli, '--repo', repo, 'export', '--target', 'all', '--output', output], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /already exists/);
    assert.equal(await readFile(sentinel, 'utf8'), 'preserve\n');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
