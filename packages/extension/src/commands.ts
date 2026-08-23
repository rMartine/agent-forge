import * as path from 'node:path';
import * as vscode from 'vscode';
import type { Diagnostic, RuntimeSelection, RuntimeTarget } from '@agent-forge/core';
import { DeploymentService } from './services/deploymentService';
import { DiagnosticsService } from './services/diagnosticsService';
import { applyMcpSetupPreview, createMcpSetupPreview } from './services/mcpSetupService';

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
  for (const item of diagnostics) output.appendLine(item.severity.toUpperCase() + ' ' + item.code + ': ' + item.message + (item.path ? ' (' + item.path + ')' : ''));
}

async function service(): Promise<DeploymentService | undefined> {
  const repoPath = await resolveRepoPath();
  return repoPath ? new DeploymentService(repoPath) : undefined;
}

function codexIntegrationDiagnostics(target: RuntimeSelection): Diagnostic[] {
  if (target === 'vscode' || vscode.extensions.getExtension('openai.chatgpt')) return [];
  return [{ code: 'AF010', severity: 'error', message: 'The openai.chatgpt Codex IDE extension is not installed or enabled.' }];
}

export async function handleValidate(output: vscode.OutputChannel, diagnostics: DiagnosticsService, target: RuntimeSelection = 'all'): Promise<boolean> {
  const deployment = await service();
  if (!deployment) return false;
  const result = await deployment.validate(target);
  output.appendLine('\n[Validate/' + target + '] ' + new Date().toISOString());
  appendDiagnostics(output, result.diagnostics);
  diagnostics.publish(deployment.repoPath, result.diagnostics);
  vscode.window.showInformationMessage(result.valid ? 'Agent Forge: ' + target + ' roster validation passed.' : 'Agent Forge: roster validation failed. See Problems and Output.');
  return result.valid;
}

export async function handleDoctor(output: vscode.OutputChannel, diagnostics: DiagnosticsService, target: RuntimeSelection = 'all'): Promise<boolean> {
  const deployment = await service();
  if (!deployment) return false;
  const result = await deployment.doctor(target);
  const integrationDiagnostics = codexIntegrationDiagnostics(target);
  const allDiagnostics = [...result.roster.diagnostics, ...(result.mcp?.diagnostics ?? []), ...(result.codex?.diagnostics ?? []), ...result.preview.diagnostics, ...integrationDiagnostics];
  output.appendLine('\n[Doctor/' + target + '] ' + new Date().toISOString());
  appendDiagnostics(output, allDiagnostics);
  for (const [name, provider] of Object.entries(result.mcp?.providers ?? {})) output.appendLine(name + ': ' + (provider.ready ? 'ready' : 'not ready') + ' — ' + provider.message);
  output.appendLine('Resolved tools: ' + result.tools.length + '; models: ' + result.models.length);
  diagnostics.publish(deployment.repoPath, allDiagnostics);
  const ready = result.ready && integrationDiagnostics.length === 0;
  vscode.window.showInformationMessage(ready ? 'Agent Forge: ' + target + ' doctor passed.' : 'Agent Forge: doctor found blocking readiness issues.');
  return ready;
}

export async function handlePreview(output: vscode.OutputChannel, diagnostics: DiagnosticsService, target: RuntimeSelection = 'all'): Promise<void> {
  const deployment = await service();
  if (!deployment) return;
  const integrationDiagnostics = codexIntegrationDiagnostics(target);
  if (integrationDiagnostics.length > 0) {
    appendDiagnostics(output, integrationDiagnostics);
    diagnostics.publish(deployment.repoPath, integrationDiagnostics);
    vscode.window.showErrorMessage('Agent Forge: Codex deployment requires the openai.chatgpt extension.');
    return;
  }
  const plan = await deployment.preview(target, true);
  output.appendLine('\n[Preview/' + target + ' ' + plan.deploymentId + '] ' + plan.artifacts.length + ' rendered files');
  appendDiagnostics(output, plan.diagnostics);
  for (const artifact of plan.artifacts) output.appendLine('[' + artifact.runtime + '/' + artifact.type + '] ' + artifact.targetPath + ' ' + artifact.sourceHash);
  for (const action of plan.cleanupActions) output.appendLine('[cleanup/' + action.runtime + '] ' + action.targetPath);
  diagnostics.publish(deployment.repoPath, plan.diagnostics);
  output.show(true);
}

export async function handleDeploy(output: vscode.OutputChannel, diagnostics: DiagnosticsService, target: RuntimeSelection = 'all'): Promise<void> {
  const deployment = await service();
  if (!deployment) return;
  const integrationDiagnostics = codexIntegrationDiagnostics(target);
  if (integrationDiagnostics.length > 0) {
    appendDiagnostics(output, integrationDiagnostics);
    diagnostics.publish(deployment.repoPath, integrationDiagnostics);
    vscode.window.showErrorMessage('Agent Forge: Codex deployment requires the openai.chatgpt extension.');
    return;
  }
  const plan = await deployment.preview(target, true);
  diagnostics.publish(deployment.repoPath, plan.diagnostics);
  if (plan.diagnostics.some(item => item.severity === 'error')) {
    appendDiagnostics(output, plan.diagnostics);
    vscode.window.showErrorMessage('Agent Forge: deployment blocked by validation, collision, or capability diagnostics.');
    return;
  }
  const typed = await vscode.window.showInputBox({
    prompt: 'Type ' + plan.deploymentId + ' to apply this exact immutable ' + target + ' plan',
    ignoreFocusOut: true,
  });
  if (typed !== plan.deploymentId) {
    vscode.window.showWarningMessage('Agent Forge: deployment cancelled; plan id did not match.');
    return;
  }
  const result = await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Agent Forge: deploying ' + target }, () => deployment.deploy(plan));
  output.appendLine('\n[Deploy ' + (result.deploymentId ?? 'blocked') + '] deployed=' + result.deployed + ' skipped=' + result.skipped + ' failed=' + result.failed);
  appendDiagnostics(output, result.diagnostics);
  diagnostics.publish(deployment.repoPath, result.diagnostics);
  vscode.window.showInformationMessage(result.success ? 'Agent Forge: deployment ' + result.deploymentId + ' complete.' : 'Agent Forge: deployment blocked or rolled back.');
}

export async function handleStatus(output: vscode.OutputChannel, target: RuntimeSelection = 'all'): Promise<void> {
  const deployment = await service();
  if (!deployment) return;
  const result = await deployment.status(target);
  output.appendLine('\n[Status/' + target + ']');
  for (const [runtime, current] of Object.entries(result.targets)) {
    if (!current) continue;
    output.appendLine(runtime + ': ' + (current.deploymentId ?? 'not deployed') + ' — ' + current.syncState);
    for (const file of current.files) output.appendLine(file.state + ': ' + file.path);
  }
  output.show(true);
}

export async function handleRollback(output: vscode.OutputChannel, diagnostics: DiagnosticsService, runtime: RuntimeTarget): Promise<void> {
  const deployment = await service();
  if (!deployment) return;
  const status = await deployment.status(runtime);
  const current = status.targets[runtime];
  if (!current?.deploymentId) { vscode.window.showInformationMessage('Agent Forge: no active ' + runtime + ' deployment to roll back.'); return; }
  const typed = await vscode.window.showInputBox({ prompt: 'Type ' + current.deploymentId + ' to roll back the ' + runtime + ' deployment', ignoreFocusOut: true });
  if (typed !== current.deploymentId) return;
  const result = await deployment.rollback(runtime, current.deploymentId);
  appendDiagnostics(output, result.diagnostics);
  diagnostics.publish(deployment.repoPath, result.diagnostics);
  vscode.window.showInformationMessage('Agent Forge: restored ' + result.restored + '; preserved ' + result.skipped + '.');
}

export async function handleCleanup(output: vscode.OutputChannel, diagnostics: DiagnosticsService, target: RuntimeSelection = 'all'): Promise<void> {
  const deployment = await service();
  if (!deployment) return;
  const plan = await deployment.cleanupPreview(target);
  appendDiagnostics(output, plan.diagnostics);
  output.appendLine('\n[Cleanup Preview/' + target + ' ' + plan.planId + '] actions=' + plan.actions.length);
  for (const action of plan.actions) output.appendLine('[' + action.runtime + '] ' + action.targetPath);
  diagnostics.publish(deployment.repoPath, plan.diagnostics);
  if (plan.diagnostics.some(item => item.severity === 'error')) { vscode.window.showErrorMessage('Agent Forge: cleanup blocked by diagnostics.'); return; }
  if (plan.actions.length === 0) { vscode.window.showInformationMessage('Agent Forge: no stale managed files require cleanup.'); return; }
  const typed = await vscode.window.showInputBox({ prompt: 'Type ' + plan.planId + ' to apply this exact managed-only cleanup plan', ignoreFocusOut: true });
  if (typed !== plan.planId) return;
  const result = await deployment.cleanup(plan);
  appendDiagnostics(output, result.diagnostics);
  vscode.window.showInformationMessage('Agent Forge: removed ' + result.deleted + '; preserved ' + result.skipped + '.');
}

export async function handleWipe(output: vscode.OutputChannel, diagnostics: DiagnosticsService, runtime: RuntimeTarget): Promise<void> {
  const deployment = await service();
  if (!deployment) return;
  const status = await deployment.status(runtime);
  const current = status.targets[runtime];
  if (!current?.deploymentId) { vscode.window.showInformationMessage('Agent Forge: no active ' + runtime + ' deployment to remove.'); return; }
  const typed = await vscode.window.showInputBox({ prompt: 'Type ' + current.deploymentId + ' to remove only unchanged ' + runtime + ' managed files', ignoreFocusOut: true });
  if (typed !== current.deploymentId) return;
  const result = await deployment.wipe(runtime);
  appendDiagnostics(output, result.diagnostics);
  diagnostics.publish(deployment.repoPath, result.diagnostics);
  vscode.window.showInformationMessage('Agent Forge: removed/restored ' + result.deleted + '; preserved ' + result.skipped + '.');
}

export async function handleSetupMcp(output: vscode.OutputChannel): Promise<void> {
  const repoPath = await resolveRepoPath();
  if (!repoPath) return;
  const preview = await createMcpSetupPreview(repoPath);
  output.appendLine('\n[MCP Setup Preview/VS Code] ' + new Date().toISOString());
  for (const [name, provider] of Object.entries(preview.doctor.providers)) {
    output.appendLine(name + ': ' + (provider.ready ? 'ready' : 'not ready') + ' — ' + provider.message);
    output.appendLine(JSON.stringify(preview.catalog.providers[name].configuration));
  }
  output.show(true);
  const addable = preview.plan.changes.filter(change => change.action === 'add').map(change => change.provider);
  const choice = await vscode.window.showWarningMessage(
    'Review the MCP preview in Output. Add these providers to the VS Code user profile: ' + addable.join(', ') + '?',
    { modal: true },
    'Apply MCP Setup',
    'Open MCP Settings',
  );
  if (choice === 'Open MCP Settings') {
    await vscode.commands.executeCommand('workbench.action.openSettings', 'mcp');
  } else if (choice === 'Apply MCP Setup') {
    const result = await applyMcpSetupPreview(preview, addable);
    appendDiagnostics(output, result.diagnostics);
    vscode.window.showInformationMessage(result.success
      ? 'Agent Forge: added ' + (result.applied.join(', ') || 'no') + ' MCP providers. Review trust and OAuth prompts in VS Code.'
      : 'Agent Forge: MCP setup failed. See Output.');
  }
}

export function openManagedFile(repoPath: string | undefined, item: { fileStatus?: { path: string } }): void {
  if (!repoPath || !item.fileStatus?.path) return;
  const filePath = path.isAbsolute(item.fileStatus.path) ? item.fileStatus.path : path.join(repoPath, item.fileStatus.path);
  void vscode.workspace.openTextDocument(vscode.Uri.file(filePath)).then(document => vscode.window.showTextDocument(document));
}
