import { execFile } from 'node:child_process';
import * as path from 'node:path';
import { promisify } from 'node:util';
import type { Diagnostic, McpSetupPlan, McpSetupResult } from './types.js';
import { diagnostic } from './diagnostics.js';
import { loadJsonc } from './manifest.js';
import { resolveRepoFilePath } from './paths.js';

const execFileAsync = promisify(execFile);

function resolveProviderCommand(command: string): string {
  if (process.platform === 'win32' && command === 'gk' && process.env.LOCALAPPDATA) {
    return path.join(process.env.LOCALAPPDATA, 'GitKrakenCLI', 'gk.exe');
  }
  return command;
}

export interface McpProviderDefinition {
  requiredForFull: boolean;
  detection: { command?: string; args?: string[] };
  configuration: Record<string, unknown>;
  notes?: string;
}

export interface McpProviderCatalog {
  version: 1;
  providers: Record<string, McpProviderDefinition>;
}

export interface McpDoctorResult {
  ready: boolean;
  providers: Record<string, { ready: boolean; message: string }>;
  diagnostics: Diagnostic[];
}

export async function loadMcpProviders(repoPath: string, relativePath: string): Promise<McpProviderCatalog> {
  return loadJsonc<McpProviderCatalog>(resolveRepoFilePath(repoPath, relativePath));
}

export async function doctorMcp(catalog: McpProviderCatalog): Promise<McpDoctorResult> {
  const providers: McpDoctorResult['providers'] = {};
  const diagnostics: Diagnostic[] = [];
  for (const [name, provider] of Object.entries(catalog.providers)) {
    const command = provider.detection.command ? resolveProviderCommand(provider.detection.command) : undefined;
    if (!command) {
      providers[name] = { ready: false, message: 'Manual VS Code/OAuth configuration required' };
      if (provider.requiredForFull) diagnostics.push(diagnostic('AF004', 'warning', `${name} requires manual configuration`));
      continue;
    }
    try {
      await execFileAsync(command, provider.detection.args ?? [], { timeout: 8_000, windowsHide: true });
      providers[name] = { ready: true, message: 'Command detected' };
    } catch {
      providers[name] = { ready: false, message: `Command not ready: ${command}` };
      diagnostics.push(diagnostic('AF004', provider.requiredForFull ? 'error' : 'warning', `${name} provider is not ready`));
    }
  }
  return { ready: !diagnostics.some(item => item.severity === 'error'), providers, diagnostics };
}

export function createMcpSetupPlan(catalog: McpProviderCatalog, providerName?: string): McpSetupPlan {
  const diagnostics: Diagnostic[] = [];
  const selected = providerName
    ? Object.entries(catalog.providers).filter(([name]) => name === providerName)
    : Object.entries(catalog.providers);
  if (providerName && selected.length === 0) {
    diagnostics.push(diagnostic('AF004', 'error', `Unknown MCP provider "${providerName}"`));
  }
  const changes = selected.map(([provider, definition]) => {
    const config = { ...definition.configuration };
    if (typeof config.command === 'string') config.command = resolveProviderCommand(config.command);
    const canAdd = typeof config.command === 'string' || typeof config.url === 'string';
    if (!canAdd) {
      diagnostics.push(diagnostic('AF004', 'warning', `${provider} is supplied by another configured provider and requires manual enablement`));
      return { provider, action: 'manual' as const, message: definition.notes ?? 'Enable through VS Code MCP configuration.' };
    }
    return {
      provider,
      action: 'add' as const,
      cliPayload: { name: provider, ...config },
      message: `Merge ${provider} through the official VS Code --add-mcp interface`,
    };
  });
  return { changes, diagnostics };
}

export async function applyMcpSetupPlan(
  plan: McpSetupPlan,
  approvedProviders: Iterable<string>,
  codeCommand = 'code',
): Promise<McpSetupResult> {
  const approved = new Set(approvedProviders);
  const applied: string[] = [];
  const skipped: string[] = [];
  const diagnostics = [...plan.diagnostics];
  for (const change of plan.changes) {
    if (change.action !== 'add' || !change.cliPayload || !approved.has(change.provider)) {
      skipped.push(change.provider);
      continue;
    }
    try {
      await execFileAsync(codeCommand, ['--add-mcp', JSON.stringify(change.cliPayload)], { timeout: 30_000, windowsHide: true });
      applied.push(change.provider);
    } catch (error: unknown) {
      diagnostics.push(diagnostic('AF004', 'error', `Failed to add ${change.provider} through VS Code: ${(error as Error).message}`));
    }
  }
  return { success: !diagnostics.some(item => item.severity === 'error'), applied, skipped, diagnostics };
}
