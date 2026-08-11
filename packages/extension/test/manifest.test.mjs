import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

test('extension exposes safe VS Code deployment commands', () => {
  assert.equal(manifest.engines.vscode, '^1.104.0');
  const commands = manifest.contributes.commands.map(entry => entry.command);
  for (const command of ['agentForge.validate', 'agentForge.doctor', 'agentForge.preview', 'agentForge.deploy', 'agentForge.rollback', 'agentForge.setupMcp']) {
    assert.ok(commands.includes(command));
  }
  assert.ok(!commands.includes('agentForge.enableSubAgents'));
  assert.ok(!commands.includes('agentForge.selectImageModel'));
  assert.equal(manifest.contributes.configuration.properties['agentForge.autoConfirm'], undefined);
});
