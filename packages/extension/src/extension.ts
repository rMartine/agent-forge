import * as path from 'node:path';
import * as vscode from 'vscode';
import { handleDeploy, handleRestore, handleWipe, handleStatus, resolveRepoPath } from './commands';
import { RosterTreeViewProvider } from './rosterTreeView';

let outputChannel: vscode.OutputChannel;

function getConfiguredRepoPath(): string | undefined {
  return vscode.workspace.getConfiguration('agentForge').get<string>('repoPath') || undefined;
}

function updateRepoContext(): void {
  const repoPath = getConfiguredRepoPath();
  vscode.commands.executeCommand('setContext', 'agentForge.repoConfigured', !!repoPath);
}

export function activate(context: vscode.ExtensionContext): void {
  outputChannel = vscode.window.createOutputChannel('Agent Forge');

  const provider = new RosterTreeViewProvider(() => getConfiguredRepoPath());

  updateRepoContext();

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('agentForge.roster', provider),

    vscode.commands.registerCommand('agentForge.deploy', async () => {
      await handleDeploy(outputChannel);
      provider.refresh();
    }),
    vscode.commands.registerCommand('agentForge.restore', async () => {
      await handleRestore(outputChannel);
      provider.refresh();
    }),
    vscode.commands.registerCommand('agentForge.wipe', async () => {
      await handleWipe(outputChannel);
      provider.refresh();
    }),
    vscode.commands.registerCommand('agentForge.status', () => handleStatus(outputChannel)),

    vscode.commands.registerCommand('agentForge.refresh', () => {
      provider.refresh();
    }),

    vscode.commands.registerCommand('agentForge.setRepoPath', async () => {
      const value = await vscode.window.showInputBox({
        prompt: 'Enter the path to your Agent Forge repository',
        placeHolder: 'e.g., D:\\Projects\\agent-roster',
        value: getConfiguredRepoPath() ?? '',
      });
      if (value !== undefined) {
        await vscode.workspace
          .getConfiguration('agentForge')
          .update('repoPath', value || '', vscode.ConfigurationTarget.Global);
        updateRepoContext();
        provider.refresh();
      }
    }),

    vscode.commands.registerCommand('agentForge.openFile', (item: { fileStatus?: { path: string } }) => {
      const repoPath = getConfiguredRepoPath();
      if (item?.fileStatus?.path && repoPath) {
        const fullPath = path.join(repoPath, item.fileStatus.path);
        const uri = vscode.Uri.file(fullPath);
        vscode.workspace.openTextDocument(uri).then((doc) => vscode.window.showTextDocument(doc));
      }
    }),

    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('agentForge.repoPath')) {
        updateRepoContext();
        provider.refresh();
      }
    }),

    outputChannel,
  );
}

export function deactivate(): void {
  // No cleanup needed
}
