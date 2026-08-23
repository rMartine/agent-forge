import assert from 'node:assert/strict';
import * as vscode from 'vscode';

export async function runExtensionTests(): Promise<void> {
  const extension = vscode.extensions.getExtension('agent-forge.agent-forge');
  assert.ok(extension, 'Agent Forge extension should be installed in the development host');
  await extension.activate();
  const commands = await vscode.commands.getCommands(true);
  for (const command of ['agentForge.validate', 'agentForge.doctor', 'agentForge.preview', 'agentForge.deploy', 'agentForge.cleanup', 'agentForge.rollback', 'agentForge.setupMcp', 'agentForge.codexDoctor', 'agentForge.codexPreview', 'agentForge.codexDeploy', 'agentForge.codexCleanup', 'agentForge.codexStatus', 'agentForge.codexRollback']) {
    assert.ok(commands.includes(command), `Expected registered command ${command}`);
  }
  assert.ok(!commands.includes('agentForge.enableSubAgents'));
  assert.ok(!commands.includes('agentForge.selectImageModel'));
}
