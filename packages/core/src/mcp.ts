import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { applyEdits, modify, parse, type ParseError } from 'jsonc-parser';
import type { Diagnostic, McpSetupPlan, McpSetupResult } from './types.js';
import { diagnostic } from './diagnostics.js';
import { loadJsonc } from './manifest.js';
import { resolveRepoFilePath } from './paths.js';
import { hashBuffer } from './hash.js';

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

/** Override for a named VS Code profile; otherwise use the default desktop profile. */
export function resolveMcpConfigPath(): string {
  if (process.env.AGENT_FORGE_VSCODE_MCP_PATH) return path.resolve(process.env.AGENT_FORGE_VSCODE_MCP_PATH);
  if (process.env.VSCODE_PORTABLE) return path.join(process.env.VSCODE_PORTABLE, 'user-data', 'User', 'mcp.json');
  const root = process.platform === 'win32'
    ? path.join(process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming'), 'Code')
    : process.platform === 'darwin'
      ? path.join(os.homedir(), 'Library', 'Application Support', 'Code')
      : path.join(process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), '.config'), 'Code');
  return path.join(root, 'User', 'mcp.json');
}

function optionalConfig(filePath: string): Buffer | undefined {
  try { return readFileSync(filePath); }
  catch (error: unknown) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined; throw error; }
}

function configHash(content: Buffer | undefined): string | null { return content === undefined ? null : hashBuffer(content); }

function parseMcp(content: Buffer | undefined): Record<string, unknown> {
  if (content === undefined) return {};
  const errors: ParseError[] = [];
  const document: unknown = parse(content.toString('utf8'), errors, { allowTrailingComma: true });
  if (errors.length || !document || typeof document !== 'object' || Array.isArray(document)) throw new Error('Invalid MCP JSONC; existing configuration was preserved.');
  const result = document as Record<string, unknown>;
  if (result.servers !== undefined && (!result.servers || typeof result.servers !== 'object' || Array.isArray(result.servers))) throw new Error('MCP servers must be an object; existing configuration was preserved.');
  return result;
}

function existingProvider(document: Record<string, unknown>, provider: string): boolean {
  return Object.keys((document.servers ?? {}) as Record<string, unknown>).some(name => name.toLowerCase() === provider.toLowerCase());
}

function safeTemplate(value: unknown, key = ''): boolean {
  if (typeof value === 'string') {
    if (/(?:authorization|api.?key|token|password|secret)/i.test(key) && !/^\$\{(?:input|env):[^}]+\}$/.test(value)) return false;
    if (key === 'url') {
      try { const url = new URL(value); if (url.username || url.password || [...url.searchParams.keys()].some(name => /token|key|secret|password/i.test(name))) return false; }
      catch { return false; }
    }
  }
  if (value && typeof value === 'object') return Object.entries(value).every(([childKey, child]) => safeTemplate(child, childKey));
  return true;
}

export function createMcpSetupPlan(catalog: McpProviderCatalog, providerName?: string, configPath = resolveMcpConfigPath()): McpSetupPlan {
  const diagnostics: Diagnostic[] = [];
  const resolvedPath = path.resolve(configPath);
  let before: Buffer | undefined;
  let existing: Record<string, unknown>;
  try { before = optionalConfig(resolvedPath); existing = parseMcp(before); }
  catch { return { changes: [], diagnostics: [diagnostic('AF004', 'error', 'Unable to inspect a valid MCP profile; no changes were planned.', { path: resolvedPath })], configPath: resolvedPath }; }
  const selected = providerName
    ? Object.entries(catalog.providers).filter(([name]) => name === providerName)
    : Object.entries(catalog.providers);
  if (providerName && selected.length === 0) {
    diagnostics.push(diagnostic('AF004', 'error', `Unknown MCP provider "${providerName}"`));
  }
  const changes = selected.map(([provider, definition]) => {
    if (existingProvider(existing, provider)) return { provider, action: 'preserve' as const, message: 'Existing provider configuration will be preserved without reading its credentials into the plan.' };
    const config = { ...definition.configuration };
    if (!safeTemplate(config)) {
      diagnostics.push(diagnostic('AF004', 'error', `Provider ${provider} must use OAuth or secret input/environment references.`));
      return { provider, action: 'manual' as const, message: 'Secret-bearing provider templates are excluded from setup plans.' };
    }
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
      message: `Add ${provider} to the reviewed VS Code MCP profile; preserve all existing providers and inputs`,
    };
  });
  return { changes, diagnostics, configPath: resolvedPath, expectedConfigHash: configHash(before) };
}

interface McpBackupReceipt {
  version: 1;
  configPath: string;
  beforeHash: string | null;
  afterHash: string;
  providers: string[];
}

async function replaceMcp(filePath: string, content: Buffer | undefined, expectedHash: string | null): Promise<void> {
  if (configHash(optionalConfig(filePath)) !== expectedHash) throw new Error('MCP profile changed; create a fresh preview.');
  if (content === undefined) { if (expectedHash !== null) await unlink(filePath); return; }
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.agent-forge-${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, content, { flag: 'wx', mode: 0o600 });
    if (configHash(optionalConfig(filePath)) !== expectedHash) throw new Error('MCP profile changed; create a fresh preview.');
    await rename(temporary, filePath);
  } finally { await unlink(temporary).catch(error => { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }); }
}

export async function applyMcpSetupPlan(
  plan: McpSetupPlan,
  approvedProviders: Iterable<string>,
  _codeCommand = 'code',
): Promise<McpSetupResult> {
  const approved = new Set(approvedProviders);
  const applied: string[] = [];
  const skipped: string[] = [];
  const diagnostics = [...plan.diagnostics];
  let backupDirectory: string | undefined;
  let before: Buffer | undefined;
  let receipt: McpBackupReceipt | undefined;
  let written = false;
  try {
    if (diagnostics.some(item => item.severity === 'error')) return { success: false, applied, skipped: plan.changes.map(change => change.provider), diagnostics };
    if (!plan.configPath || plan.expectedConfigHash === undefined) throw new Error('MCP setup requires a fresh profile-aware preview.');
    before = optionalConfig(plan.configPath);
    if (configHash(before) !== plan.expectedConfigHash) throw new Error('MCP profile changed after preview; all changes were preserved.');
    const existing = parseMcp(before);
    let text = before?.toString('utf8') ?? '{}\n';
    const selected: string[] = [];
    for (const change of plan.changes) {
      if (change.action !== 'add' || !change.cliPayload || !approved.has(change.provider) || existingProvider(existing, change.provider)) {
        skipped.push(change.provider);
        continue;
      }
      const { name: _name, ...config } = change.cliPayload;
      if (!safeTemplate(config)) throw new Error('Provider templates must use OAuth or secret references.');
      text = applyEdits(text, modify(text, ['servers', change.provider], config, { formattingOptions: { insertSpaces: true, tabSize: 2, eol: text.includes('\r\n') ? '\r\n' : '\n' } }));
      selected.push(change.provider);
    }
    if (!selected.length) return { success: true, applied, skipped, diagnostics };
    const after = Buffer.from(text);
    parseMcp(after);
    backupDirectory = path.join(process.env.USERPROFILE ?? os.homedir(), '.agent-forge', 'copilot', 'mcp-backups', randomUUID());
    await mkdir(backupDirectory, { recursive: true, mode: 0o700 });
    if (before !== undefined) await writeFile(path.join(backupDirectory, 'profile.before.bak'), before, { flag: 'wx', mode: 0o600 });
    receipt = { version: 1, configPath: path.resolve(plan.configPath), beforeHash: configHash(before), afterHash: hashBuffer(after), providers: selected };
    await writeFile(path.join(backupDirectory, 'receipt.json'), JSON.stringify(receipt, null, 2), { flag: 'wx', mode: 0o600 });
    await replaceMcp(plan.configPath, after, plan.expectedConfigHash);
    written = true;
    if (configHash(optionalConfig(plan.configPath)) !== receipt.afterHash) throw new Error('MCP profile changed during setup; manual review is required.');
    applied.push(...selected);
  } catch {
    if (written && receipt) {
      try {
        if (configHash(optionalConfig(receipt.configPath)) === receipt.afterHash) await replaceMcp(receipt.configPath, before, receipt.afterHash);
      } catch { diagnostics.push(diagnostic('AF004', 'warning', 'MCP automatic recovery was blocked by a concurrent change. Use the private backup for review.')); }
    }
    // Avoid exception text: filesystem and subprocess errors can include credentials.
    diagnostics.push(diagnostic('AF004', 'error', 'MCP setup could not safely apply the reviewed profile. Create a fresh preview; existing or concurrent changes are preserved.'));
  }
  return { success: !diagnostics.some(item => item.severity === 'error'), applied, skipped, diagnostics, backupDirectory };
}

/** Restores only an unchanged profile written by this MCP operation. */
export async function rollbackMcpSetup(backupDirectory: string): Promise<{ success: boolean; restored: boolean; diagnostics: Diagnostic[] }> {
  try {
    const receipt = JSON.parse(await readFile(path.join(backupDirectory, 'receipt.json'), 'utf8')) as McpBackupReceipt;
    if (receipt.version !== 1 || !path.isAbsolute(receipt.configPath) || typeof receipt.afterHash !== 'string') throw new Error('Invalid backup receipt.');
    const before = receipt.beforeHash === null ? undefined : await readFile(path.join(backupDirectory, 'profile.before.bak'));
    if (configHash(before) !== receipt.beforeHash) throw new Error('Backup hash mismatch.');
    const current = configHash(optionalConfig(receipt.configPath));
    if (current === receipt.beforeHash) return { success: true, restored: false, diagnostics: [] };
    if (current !== receipt.afterHash) return { success: false, restored: false, diagnostics: [diagnostic('AF004', 'warning', 'MCP profile changed after setup; rollback preserved it.', { path: receipt.configPath })] };
    await replaceMcp(receipt.configPath, before, receipt.afterHash);
    return { success: true, restored: true, diagnostics: [] };
  } catch {
    return { success: false, restored: false, diagnostics: [diagnostic('AF004', 'error', 'MCP rollback could not validate the private backup or profile; no replacement was authorized.')] };
  }
}
