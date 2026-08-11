import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Diagnostic } from './types.js';
import { diagnostic } from './diagnostics.js';
import { loadJsonc } from './manifest.js';
import { resolveRepoFilePath } from './paths.js';

const execFileAsync = promisify(execFile);

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
    const command = provider.detection.command;
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
