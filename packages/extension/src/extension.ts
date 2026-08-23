import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import {
  handleDeploy,
  handleCleanup,
  handleDoctor,
  handlePreview,
  handleRollback,
  handleSetupMcp,
  handleStatus,
  handleValidate,
  handleWipe,
  openManagedFile,
} from './commands';
import { RosterTreeViewProvider } from './rosterTreeView';
import { SidebarViewProvider } from './sidebarViewProvider';
import { DiagnosticsService } from './services/diagnosticsService';

function repoPath(): string | undefined {
  return vscode.workspace.getConfiguration('agentForge').get<string>('repoPath') || undefined;
}

function updateContext(sidebar: SidebarViewProvider, readiness?: string): void {
  const configured = repoPath();
  const codexDetected = Boolean(vscode.extensions.getExtension('openai.chatgpt'));
  void vscode.commands.executeCommand('setContext', 'agentForge.repoConfigured', Boolean(configured));
  void vscode.commands.executeCommand('setContext', 'agentForge.codexDetected', codexDetected);
  sidebar.updateState({ repoConfigured: Boolean(configured), repoPath: configured, readiness, codexDetected });
}

function supportedVersion(): boolean {
  const [major, minor] = vscode.version.split('.').map(value => Number.parseInt(value, 10));
  return major > 1 || (major === 1 && minor >= 104);
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const output = vscode.window.createOutputChannel('Agent Forge');
  const diagnostics = new DiagnosticsService();
  const roster = new RosterTreeViewProvider(repoPath);
  const sidebar = new SidebarViewProvider(context.extensionUri);

  context.subscriptions.push(
    output,
    diagnostics,
    roster,
    vscode.window.registerWebviewViewProvider(SidebarViewProvider.viewType, sidebar),
    vscode.window.registerTreeDataProvider('agentForge.roster', roster),
    vscode.commands.registerCommand('agentForge.validate', async () => {
      const valid = await handleValidate(output, diagnostics);
      updateContext(sidebar, valid ? 'Roster valid' : 'Validation failed');
      roster.refresh();
    }),
    vscode.commands.registerCommand('agentForge.doctor', async () => {
      const ready = await handleDoctor(output, diagnostics);
      updateContext(sidebar, ready ? 'Ready' : 'Doctor found blockers');
      roster.refresh();
    }),
    vscode.commands.registerCommand('agentForge.preview', () => handlePreview(output, diagnostics)),
    vscode.commands.registerCommand('agentForge.deploy', async () => { await handleDeploy(output, diagnostics); roster.refresh(); }),
    vscode.commands.registerCommand('agentForge.status', () => handleStatus(output)),
    vscode.commands.registerCommand('agentForge.cleanup', async () => { await handleCleanup(output, diagnostics, 'all'); roster.refresh(); }),
    vscode.commands.registerCommand('agentForge.rollback', async () => { await handleRollback(output, diagnostics, 'vscode'); roster.refresh(); }),
    vscode.commands.registerCommand('agentForge.wipe', async () => { await handleWipe(output, diagnostics, 'vscode'); roster.refresh(); }),
    vscode.commands.registerCommand('agentForge.codexDoctor', async () => { await handleDoctor(output, diagnostics, 'codex'); roster.refresh(); }),
    vscode.commands.registerCommand('agentForge.codexPreview', () => handlePreview(output, diagnostics, 'codex')),
    vscode.commands.registerCommand('agentForge.codexDeploy', async () => { await handleDeploy(output, diagnostics, 'codex'); roster.refresh(); }),
    vscode.commands.registerCommand('agentForge.codexCleanup', async () => { await handleCleanup(output, diagnostics, 'codex'); roster.refresh(); }),
    vscode.commands.registerCommand('agentForge.codexStatus', () => handleStatus(output, 'codex')),
    vscode.commands.registerCommand('agentForge.codexRollback', async () => { await handleRollback(output, diagnostics, 'codex'); roster.refresh(); }),
    vscode.commands.registerCommand('agentForge.setupMcp', () => handleSetupMcp(output)),
    vscode.commands.registerCommand('agentForge.refresh', () => roster.refresh()),
    vscode.commands.registerCommand('agentForge.setRepoPath', async () => {
      const selected = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Select Agent Forge repository',
        defaultUri: repoPath() ? vscode.Uri.file(repoPath()!) : undefined,
      });
      if (!selected?.length) return;
      const candidate = selected[0].fsPath;
      if (!fs.existsSync(path.join(candidate, 'agent-forge.manifest.jsonc'))) {
        vscode.window.showErrorMessage('Agent Forge: selected folder does not contain agent-forge.manifest.jsonc.');
        return;
      }
      await vscode.workspace.getConfiguration('agentForge').update('repoPath', candidate, vscode.ConfigurationTarget.Global);
      updateContext(sidebar, 'Run Doctor');
      roster.refresh();
    }),
    vscode.commands.registerCommand('agentForge.openFile', (item) => openManagedFile(repoPath(), item)),
    vscode.commands.registerCommand('agentForge.openSettings', () => vscode.commands.executeCommand('workbench.action.openSettings', 'agentForge')),
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('agentForge')) {
        updateContext(sidebar, 'Configuration changed; run Doctor');
        roster.refresh();
      }
    }),
  );

  updateContext(sidebar, supportedVersion() ? 'Run Doctor' : 'AF010: VS Code 1.104 or later is required');
  if (!supportedVersion()) vscode.window.showErrorMessage('AF010: Agent Forge requires VS Code 1.104.0 or later.');
}

export function deactivate(): void {}
