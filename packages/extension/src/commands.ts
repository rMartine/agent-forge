import * as path from 'node:path';
import * as vscode from 'vscode';
import type { Diagnostic } from '@agent-forge/core';
import { DeploymentService } from './services/deploymentService';
import { DiagnosticsService } from './services/diagnosticsService';
import { createMcpSetupPreview } from './services/mcpSetupService';

export async function resolveRepoPath(): Promise<string | undefined> {
  const config = vscode.workspace.getConfiguration('agentForge');
  let repoPath = config.get<string>('repoPath');
  if (!repoPath) {
    repoPath = await vscode.window.showInputBox({ prompt: 'Enter the Agent Forge repository path', placeHolder: 'D:\\Repositorios\\agent-forge' });
    if (repoPath) await config.update('repoPath', repoPath, vscode.ConfigurationTarget.Global);
  }
  return repoPath || undefined;
}

function appendDiagnostics(output: vscode.OutputChannel, diagnostics: Diagnostic[]): void {
  for (const item of diagnostics) output.appendLine(`${item.severity.toUpperCase()} ${item.code}: ${item.message}${item.path ? ` (${item.path})` : ''}`);
}

async function service(): Promise<DeploymentService | undefined> {
  const repoPath = await resolveRepoPath();
  return repoPath ? new DeploymentService(repoPath) : undefined;
}

export async function handleValidate(output: vscode.OutputChannel, diagnostics: DiagnosticsService): Promise<boolean> {
  const deployment = await service();
  if (!deployment) return false;
  const result = await deployment.validate();
  output.appendLine(`\n[Validate] ${new Date().toISOString()}`);
  appendDiagnostics(output, result.diagnostics);
  diagnostics.publish(deployment.repoPath, result.diagnostics);
  vscode.window.showInformationMessage(result.valid ? 'Agent Forge: roster validation passed.' : 'Agent Forge: roster validation failed. See Problems and Output.');
  return result.valid;
}

export async function handleDoctor(output: vscode.OutputChannel, diagnostics: DiagnosticsService): Promise<boolean> {
  const deployment = await service();
  if (!deployment) return false;
  const result = await deployment.doctor();
  const allDiagnostics = [...result.roster.diagnostics, ...result.mcp.diagnostics];
  output.appendLine(`\n[Doctor] ${new Date().toISOString()}`);
  appendDiagnostics(output, allDiagnostics);
  for (const [name, provider] of Object.entries(result.mcp.providers)) output.appendLine(`${name}: ${provider.ready ? 'ready' : 'not ready'} — ${provider.message}`);
  output.appendLine(`Resolved tools: ${result.tools.length}; models: ${result.models.length}`);
  diagnostics.publish(deployment.repoPath, allDiagnostics);
  vscode.window.showInformationMessage(result.ready ? 'Agent Forge: doctor passed.' : 'Agent Forge: doctor found blocking readiness issues.');
  return result.ready;
}

export async function handlePreview(output: vscode.OutputChannel, diagnostics: DiagnosticsService): Promise<void> {
  const deployment = await service();
  if (!deployment) return;
  const plan = await deployment.preview(true);
  output.appendLine(`\n[Preview ${plan.deploymentId}] ${plan.artifacts.length} rendered files`);
  appendDiagnostics(output, plan.diagnostics);
  for (const artifact of plan.artifacts) output.appendLine(`[${artifact.type}] ${artifact.targetPath} ${artifact.sourceHash}`);
  diagnostics.publish(deployment.repoPath, plan.diagnostics);
  output.show(true);
}

export async function handleDeploy(output: vscode.OutputChannel, diagnostics: DiagnosticsService): Promise<void> {
  const deployment = await service();
  if (!deployment) return;
  const plan = await deployment.preview(true);
  diagnostics.publish(deployment.repoPath, plan.diagnostics);
  if (plan.diagnostics.some(item => item.severity === 'error')) {
    appendDiagnostics(output, plan.diagnostics);
    vscode.window.showErrorMessage('Agent Forge: deployment blocked by validation or capability diagnostics.');
    return;
  }
  const confirm = await vscode.window.showWarningMessage(
    `Deploy ${plan.artifacts.length} managed files to the VS Code user profile? Unmanaged collisions will be preserved and block deployment.`,
    { modal: true },
    'Deploy',
  );
  if (confirm !== 'Deploy') return;
  const result = await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Agent Forge: deploying' }, () => deployment.deploy());
  output.appendLine(`\n[Deploy ${result.deploymentId ?? 'blocked'}] deployed=${result.deployed} skipped=${result.skipped} failed=${result.failed}`);
  appendDiagnostics(output, result.diagnostics);
  diagnostics.publish(deployment.repoPath, result.diagnostics);
  vscode.window.showInformationMessage(result.success ? `Agent Forge: deployment ${result.deploymentId} complete.` : 'Agent Forge: deployment blocked or rolled back.');
}

export async function handleStatus(output: vscode.OutputChannel): Promise<void> {
  const deployment = await service();
  if (!deployment) return;
  const result = await deployment.status();
  output.appendLine(`\n[Status] ${result.deploymentId ?? 'not deployed'} — ${result.syncState}`);
  for (const file of result.files) output.appendLine(`${file.state}: ${file.path}`);
  output.show(true);
}

export async function handleRollback(output: vscode.OutputChannel, diagnostics: DiagnosticsService): Promise<void> {
  const deployment = await service();
  if (!deployment) return;
  const current = await deployment.status();
  if (!current.deploymentId) { vscode.window.showInformationMessage('Agent Forge: no active deployment to roll back.'); return; }
  const confirm = await vscode.window.showWarningMessage(`Roll back managed deployment ${current.deploymentId}? Modified files will be preserved.`, { modal: true }, 'Rollback');
  if (confirm !== 'Rollback') return;
  const result = await deployment.rollback(current.deploymentId);
  appendDiagnostics(output, result.diagnostics);
  diagnostics.publish(deployment.repoPath, result.diagnostics);
  vscode.window.showInformationMessage(`Agent Forge: restored ${result.restored}; preserved ${result.skipped}.`);
}

export async function handleWipe(output: vscode.OutputChannel, diagnostics: DiagnosticsService): Promise<void> {
  const deployment = await service();
  if (!deployment) return;
  const current = await deployment.status();
  if (!current.deploymentId) { vscode.window.showInformationMessage('Agent Forge: no active deployment to remove.'); return; }
  const typed = await vscode.window.showInputBox({ prompt: `Type ${current.deploymentId} to remove only unchanged managed files`, ignoreFocusOut: true });
  if (typed !== current.deploymentId) { vscode.window.showWarningMessage('Agent Forge: wipe cancelled; deployment id did not match.'); return; }
  const result = await deployment.wipe();
  appendDiagnostics(output, result.diagnostics);
  diagnostics.publish(deployment.repoPath, result.diagnostics);
  vscode.window.showInformationMessage(`Agent Forge: removed/restored ${result.deleted}; preserved ${result.skipped}.`);
}

export async function handleSetupMcp(output: vscode.OutputChannel): Promise<void> {
  const repoPath = await resolveRepoPath();
  if (!repoPath) return;
  const preview = await createMcpSetupPreview(repoPath);
  output.appendLine(`\n[MCP Setup Preview] ${new Date().toISOString()}`);
  for (const [name, provider] of Object.entries(preview.doctor.providers)) {
    output.appendLine(`${name}: ${provider.ready ? 'ready' : 'not ready'} — ${provider.message}`);
    output.appendLine(JSON.stringify(preview.catalog.providers[name].configuration));
  }
  output.show(true);
  const choice = await vscode.window.showInformationMessage('Agent Forge generated a provider setup preview. Review it in Output before opening VS Code MCP settings.', 'Open MCP Settings');
  if (choice === 'Open MCP Settings') await vscode.commands.executeCommand('workbench.action.openSettings', 'mcp');
}

export function openManagedFile(repoPath: string | undefined, item: { fileStatus?: { path: string } }): void {
  if (!repoPath || !item.fileStatus?.path) return;
  const filePath = path.isAbsolute(item.fileStatus.path) ? item.fileStatus.path : path.join(repoPath, item.fileStatus.path);
  void vscode.workspace.openTextDocument(vscode.Uri.file(filePath)).then(document => vscode.window.showTextDocument(document));
}
