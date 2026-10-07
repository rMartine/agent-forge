import { randomUUID } from 'node:crypto';
import { mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';

interface ModelMetadata {
  id: string;
  name: string;
  vendor: string;
  family: string;
  version: string;
  maxInputTokens: number;
  maxTokens?: number;
  maxOutputTokens?: number;
}

interface ToolMetadata {
  name: string;
  description: string;
  tags: string[];
  inputSchema?: object;
}

let currentExport: Promise<string | undefined> | undefined;

/** Metadata only: never requests a chat, invokes a tool or starts an authentication flow. */
async function writeInventory(output: vscode.OutputChannel): Promise<string | undefined> {
  const filePath = path.join(process.env.USERPROFILE ?? os.homedir(), '.agent-forge', 'copilot', 'client-inventory.json');
  const pending: string[] = [];
  let models: ModelMetadata[] = [];
  let tools: ToolMetadata[] = [];
  try {
    const observed = await vscode.lm.selectChatModels({ vendor: 'copilot' });
    models = observed.map(model => {
      const extra = model as vscode.LanguageModelChat & { maxTokens?: number; maxOutputTokens?: number };
      return {
        id: model.id, name: model.name, vendor: model.vendor, family: model.family,
        version: model.version, maxInputTokens: model.maxInputTokens,
        ...(typeof extra.maxTokens === 'number' ? { maxTokens: extra.maxTokens } : {}),
        ...(typeof extra.maxOutputTokens === 'number' ? { maxOutputTokens: extra.maxOutputTokens } : {}),
      };
    }).sort((left, right) => left.id.localeCompare(right.id));
    if (!models.length) pending.push('Copilot exposes no models to this extension in the current window.');
  } catch {
    pending.push('Copilot model metadata could not be enumerated in the current window.');
  }
  try {
    tools = vscode.lm.tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      tags: [...tool.tags],
      // This is the declared schema, never invocation arguments or credentials.
      ...(tool.inputSchema === undefined ? {} : { inputSchema: JSON.parse(JSON.stringify(tool.inputSchema)) as object }),
    })).sort((left, right) => left.name.localeCompare(right.name));
    if (!tools.length) pending.push('No registered tool metadata is available; provider schema discovery remains pending.');
  } catch {
    pending.push('Registered tool metadata could not be enumerated in the current window.');
  }
  const inventory = {
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    vscodeVersion: vscode.version,
    source: 'VS Code Language Model API metadata',
    modelVendorFilter: 'copilot',
    models,
    tools,
    pending,
    limitations: [
      'Models were enumerated without execution. Enumeration does not establish successful inference or reasoning settings.',
      'Tools are registered metadata from vscode.lm.tools; no invocation, MCP authentication or server health check was performed.',
      'The file contains no chat messages, invocation inputs, authentication sessions or local provider configuration.',
    ],
  };
  const temporary = `${filePath}.${randomUUID()}.tmp`;
  try {
    await mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
    await writeFile(temporary, JSON.stringify(inventory, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    await rename(temporary, filePath);
    output.appendLine('[Copilot inventory] ' + filePath);
    output.appendLine('Observed model metadata: ' + models.length + '; registered tool schemas: ' + tools.length + '.');
    for (const message of pending) output.appendLine('Pending: ' + message);
    const message = `Agent Forge: metadata inventory saved to ${filePath}. Models: ${models.length}; tools: ${tools.length}.`;
    if (pending.length) void vscode.window.showWarningMessage(message + ' Some metadata remains pending; see Agent Forge Output.');
    else void vscode.window.showInformationMessage(message);
    return filePath;
  } catch {
    output.appendLine('[Copilot inventory] Unable to save the metadata inventory.');
    void vscode.window.showErrorMessage('Agent Forge: could not save the Copilot metadata inventory.');
    return undefined;
  } finally {
    await unlink(temporary).catch(() => undefined);
  }
}

export function exportCopilotInventory(output: vscode.OutputChannel): Promise<string | undefined> {
  currentExport ??= writeInventory(output).finally(() => { currentExport = undefined; });
  return currentExport;
}

/** One fixed operation; URI data cannot supply a command, output path or tool arguments. */
export function copilotInventoryUriHandler(): vscode.UriHandler {
  return {
    async handleUri(uri: vscode.Uri): Promise<void> {
      if (uri.scheme !== vscode.env.uriScheme || uri.authority !== 'agent-forge.agent-forge'
        || uri.path !== '/copilot-inventory' || uri.query !== '' || uri.fragment !== '') {
        void vscode.window.showWarningMessage('Agent Forge: unsupported URI.');
        return;
      }
      await vscode.commands.executeCommand('agentForge.exportCopilotInventory');
    },
  };
}
