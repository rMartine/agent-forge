import * as vscode from 'vscode';
import { deploy, restore, wipe, status } from '@agent-forge/core';

async function resolveRepoPath(): Promise<string | undefined> {
  const config = vscode.workspace.getConfiguration('agentForge');
  let repoPath = config.get<string>('repoPath');

  if (!repoPath) {
    repoPath = await vscode.window.showInputBox({
      prompt: 'Enter the path to your Agent Forge repository',
      placeHolder: 'e.g., D:\\Projects\\agent-roster',
    });

    if (repoPath) {
      await config.update('repoPath', repoPath, vscode.ConfigurationTarget.Global);
    }
  }

  return repoPath || undefined;
}

export async function handleDeploy(outputChannel: vscode.OutputChannel): Promise<void> {
  const repoPath = await resolveRepoPath();
  if (!repoPath) return;

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'Agent Forge: Deploying...' },
    async () => {
      try {
        const result = await deploy(repoPath);
        const msg = `Deployed: ${result.deployed}, Skipped: ${result.skipped}, Failed: ${result.failed}`;

        if (result.success) {
          vscode.window.showInformationMessage(`Agent Forge: Deploy complete. ${msg}`);
        } else {
          vscode.window.showWarningMessage(`Agent Forge: Deploy finished with errors. ${msg}`);
        }

        outputChannel.appendLine(`\n[Deploy] ${new Date().toISOString()}`);
        for (const detail of result.details) {
          outputChannel.appendLine(`  ${detail.action}: ${detail.path}`);
        }
        for (const error of result.errors) {
          outputChannel.appendLine(`  ERROR: ${error.path} — ${error.message}`);
        }
      } catch (err: unknown) {
        const e = err as Error & { actionableMessage?: string };
        vscode.window.showErrorMessage(`Agent Forge: ${e.actionableMessage ?? e.message}`);
      }
    },
  );
}

export async function handleRestore(outputChannel: vscode.OutputChannel): Promise<void> {
  const repoPath = await resolveRepoPath();
  if (!repoPath) return;

  const autoConfirm = vscode.workspace
    .getConfiguration('agentForge')
    .get<boolean>('autoConfirm', false);

  if (!autoConfirm) {
    const confirm = await vscode.window.showWarningMessage(
      'Agent Forge: Restore will overwrite local files with the last committed versions. Continue?',
      { modal: true },
      'Restore',
    );
    if (confirm !== 'Restore') return;
  }

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'Agent Forge: Restoring...' },
    async () => {
      try {
        const result = await restore(repoPath);
        const msg = `Restored: ${result.restored}, Recreated: ${result.recreated}, Already matching: ${result.alreadyMatching}`;

        if (result.success) {
          vscode.window.showInformationMessage(`Agent Forge: Restore complete. ${msg}`);
        } else {
          vscode.window.showWarningMessage(`Agent Forge: Restore finished with errors. ${msg}`);
        }

        outputChannel.appendLine(`\n[Restore] ${new Date().toISOString()}`);
        for (const detail of result.details) {
          outputChannel.appendLine(`  ${detail.action}: ${detail.path}`);
        }
        for (const error of result.errors) {
          outputChannel.appendLine(`  ERROR: ${error.path} — ${error.message}`);
        }
      } catch (err: unknown) {
        const e = err as Error & { actionableMessage?: string };
        vscode.window.showErrorMessage(`Agent Forge: ${e.actionableMessage ?? e.message}`);
      }
    },
  );
}

export async function handleWipe(outputChannel: vscode.OutputChannel): Promise<void> {
  const repoPath = await resolveRepoPath();
  if (!repoPath) return;

  const autoConfirm = vscode.workspace
    .getConfiguration('agentForge')
    .get<boolean>('autoConfirm', false);

  if (!autoConfirm) {
    const confirm = await vscode.window.showWarningMessage(
      'Agent Forge: Wipe will DELETE all managed files from their target locations. This cannot be undone. Continue?',
      { modal: true },
      'Wipe',
    );
    if (confirm !== 'Wipe') return;
  }

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'Agent Forge: Wiping...' },
    async () => {
      try {
        const result = await wipe(repoPath);
        const msg = `Deleted: ${result.deleted}, Not found: ${result.notFound}`;

        if (result.success) {
          vscode.window.showInformationMessage(`Agent Forge: Wipe complete. ${msg}`);
        } else {
          vscode.window.showWarningMessage(`Agent Forge: Wipe finished with errors. ${msg}`);
        }

        outputChannel.appendLine(`\n[Wipe] ${new Date().toISOString()}`);
        for (const detail of result.details) {
          outputChannel.appendLine(`  ${detail.action}: ${detail.path}`);
        }
        for (const error of result.errors) {
          outputChannel.appendLine(`  ERROR: ${error.path} — ${error.message}`);
        }
      } catch (err: unknown) {
        const e = err as Error & { actionableMessage?: string };
        vscode.window.showErrorMessage(`Agent Forge: ${e.actionableMessage ?? e.message}`);
      }
    },
  );
}

export async function handleStatus(outputChannel: vscode.OutputChannel): Promise<void> {
  const repoPath = await resolveRepoPath();
  if (!repoPath) return;

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'Agent Forge: Checking status...' },
    async () => {
      try {
        const result = await status(repoPath);

        outputChannel.clear();
        outputChannel.appendLine(`Agent Forge Status — ${new Date().toISOString()}`);
        outputChannel.appendLine(`Overall: ${result.syncState}`);
        outputChannel.appendLine('');

        const sections = [
          { label: 'Agents', items: result.agents },
          { label: 'Instructions', items: result.instructions },
          { label: 'Skills', items: result.skills },
          { label: 'Toolsets', items: result.toolsets },
          { label: 'Prompts', items: result.prompts },
          { label: 'Hooks', items: result.hooks },
        ];

        for (const section of sections) {
          if (section.items.length > 0) {
            outputChannel.appendLine(`${section.label}:`);
            for (const item of section.items) {
              outputChannel.appendLine(`  [${item.state}] ${item.path}`);
            }
            outputChannel.appendLine('');
          }
        }

        outputChannel.show();
        vscode.window.showInformationMessage(
          `Agent Forge: ${result.syncState === 'synced' ? 'All files in sync' : 'Some files are out of sync'}. See Output panel for details.`,
        );
      } catch (err: unknown) {
        const e = err as Error & { actionableMessage?: string };
        vscode.window.showErrorMessage(`Agent Forge: ${e.actionableMessage ?? e.message}`);
      }
    },
  );
}
