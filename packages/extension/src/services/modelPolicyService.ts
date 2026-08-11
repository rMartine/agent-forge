import * as vscode from 'vscode';

export async function discoverAvailableModelIds(): Promise<string[]> {
  const configured = vscode.workspace.getConfiguration('agentForge').get<string[]>('availableModelIds', []);
  try {
    const models = await vscode.lm.selectChatModels();
    return [...new Set([...configured, ...models.flatMap(model => [model.id, model.family, model.name])])].sort();
  } catch {
    return [...new Set(configured)].sort();
  }
}
