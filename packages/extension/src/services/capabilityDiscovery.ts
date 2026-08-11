import * as vscode from 'vscode';
import { normalizeVsCodeToolIds } from '@agent-forge/core';

export function discoverAvailableToolIds(): string[] {
  const configured = vscode.workspace.getConfiguration('agentForge').get<string[]>('availableToolIds', []);
  const discovered = vscode.lm.tools.map(tool => tool.name);
  return normalizeVsCodeToolIds([...configured, ...discovered]);
}
