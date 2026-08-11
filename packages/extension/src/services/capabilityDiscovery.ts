import * as vscode from 'vscode';

export function discoverAvailableToolIds(): string[] {
  const configured = vscode.workspace.getConfiguration('agentForge').get<string[]>('availableToolIds', []);
  const discovered = vscode.lm.tools.map(tool => tool.name);
  return [...new Set([...configured, ...discovered])].sort();
}
