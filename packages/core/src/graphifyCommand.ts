import * as path from 'node:path';
import { graphifyHash, readGraphifyFile } from './graphifyFiles.js';
import { buildGraphifyIndex, getGraphifyStatus, queryGraphify, type GraphifyIndexOptions } from './graphifyIndex.js';
import { applyGraphifyProvisionPlan, createGraphifyProvisionPlan, loadGraphifyProvisionPlan, loadGraphifyRuntime, restoreGraphifyRuntime, verifyGraphifyRuntime } from './graphifyRuntime.js';

export interface GraphifyCommandContext {
  managedRoot: string;
  provisioning?: { lockPath: string; helperDirectory: string };
  expectedRuntimeId?: string;
  expectedRuntimeHash?: string;
  signal?: AbortSignal;
}

export interface InstalledGraphifyDescriptor {
  schemaVersion: 1;
  managedRoot: string;
  runtimeId: string | null;
  runtimeHash?: string;
}

const queryCommands = ['query', 'affected', 'path', 'explain'] as const;
const projectOptions = ['project', 'include', 'exclude', 'timeout-ms', 'json'];
const commandOptions: Record<string, string[]> = {
  'provision-preview': ['python', 'download-missing', 'wheel-cache', 'json'],
  'provision-apply': ['plan', 'confirm', 'json'],
  'provision-rollback': ['plan', 'confirm', 'json'],
  index: [...projectOptions, 'rebuild'], status: projectOptions,
  query: [...projectOptions, 'text', 'budget'], affected: [...projectOptions, 'text', 'depth'],
  path: [...projectOptions, 'text', 'target'], explain: [...projectOptions, 'text'],
};
const flagOptions = new Set(['download-missing', 'rebuild', 'json']);
const repeatedOptions = new Set(['include', 'exclude']);

function parseArguments(args: string[]): { command: string; values: Record<string, string | string[] | boolean> } {
  const [command, ...rest] = args;
  if (!Object.hasOwn(commandOptions, command ?? '')) throw new Error(`Use one of these Graphify commands: ${Object.keys(commandOptions).join(', ')}.`);
  const values: Record<string, string | string[] | boolean> = Object.create(null);
  for (let index = 0; index < rest.length; index++) {
    const raw = rest[index];
    if (!raw.startsWith('--') || !commandOptions[command].includes(raw.slice(2))) throw new Error(`Unsupported Graphify option for ${command}: ${raw}`);
    const name = raw.slice(2);
    if (Object.hasOwn(values, name) && !repeatedOptions.has(name)) throw new Error(`Duplicate Graphify option: ${raw}`);
    if (flagOptions.has(name)) { values[name] = true; continue; }
    const value = rest[++index];
    if (value === undefined || value.startsWith('--') || !value.trim() || value.includes('\0')) throw new Error(`Graphify option ${raw} requires a value.`);
    if (repeatedOptions.has(name)) {
      const entries = values[name] as string[] | undefined;
      if ((entries?.length ?? 0) >= 40) throw new Error(`Graphify option ${raw} allows at most 40 values.`);
      values[name] = [...(entries ?? []), value];
    } else values[name] = value;
  }
  return { command, values };
}

function required(values: Record<string, unknown>, name: string): string {
  const value = values[name];
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Graphify requires --${name}.`);
  return value;
}

function numberOption(values: Record<string, unknown>, name: string, minimum: number, maximum: number): number | undefined {
  if (values[name] === undefined) return undefined;
  const value = required(values, name);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < minimum || Number(value) > maximum) throw new Error(`Graphify --${name} must be an integer from ${minimum} to ${maximum}.`);
  return Number(value);
}

function checkCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) throw new Error('Graphify operation cancelled');
}

function requireConfirmation(values: Record<string, unknown>): string {
  const plan = required(values, 'plan');
  if (!/^[a-f0-9]{64}$/.test(plan)) throw new Error('Graphify --plan must be the identifier returned by provision-preview.');
  if (required(values, 'confirm') !== plan) throw new Error('Graphify confirmation must exactly match the immutable plan identifier.');
  return plan;
}

/** Shared dispatch for the repository CLI and the dependency-free installed client. */
export async function runGraphifyCommand(args: string[], context: GraphifyCommandContext): Promise<unknown> {
  const { command, values } = parseArguments(args);
  if (typeof context.managedRoot !== 'string' || !path.isAbsolute(context.managedRoot) || /[\u0000-\u001f]/.test(context.managedRoot)) throw new Error('Graphify managedRoot must be an absolute path.');
  const managedRoot = path.resolve(context.managedRoot);
  checkCancelled(context.signal);
  if (command.startsWith('provision-')) {
    if (!context.provisioning) throw new Error('Provisioning requires the Agent Forge repository CLI and a reviewed dependency lock. The installed product client cannot provision or replace its runtime.');
    if (command === 'provision-preview') {
      const plan = await createGraphifyProvisionPlan({
        managedRoot, pythonPath: path.resolve(required(values, 'python')), lockPath: context.provisioning.lockPath,
        helperDirectory: context.provisioning.helperDirectory, downloadMissing: values['download-missing'] === true,
        signal: context.signal,
        ...(values['wheel-cache'] ? { wheelCachePath: path.resolve(required(values, 'wheel-cache')) } : {}),
      });
      checkCancelled(context.signal);
      return { status: 'prepared', planId: plan.planId, managedRoot, planPath: path.join(managedRoot, 'plans', plan.planId, 'plan.json'), pythonVersion: plan.python.version, graphifyVersion: plan.lock.graphifyVersion, pythonFileCount: plan.python.files.length, wheelCount: plan.lock.wheels.length };
    }
    const planId = requireConfirmation(values);
    if (command === 'provision-rollback') {
      await restoreGraphifyRuntime(managedRoot, planId);
      return { status: 'restored', planId, managedRoot };
    }
    const runtime = await applyGraphifyProvisionPlan(await loadGraphifyProvisionPlan(managedRoot, planId), { signal: context.signal });
    return { status: 'installed', runtimeId: runtime.runtimeId, managedRoot, runtimePath: runtime.runtimePath, pythonVersion: runtime.pythonVersion, graphifyVersion: runtime.graphifyVersion };
  }

  const repositoryPath = required(values, 'project');
  if (!path.isAbsolute(repositoryPath)) throw new Error('Graphify --project must identify an absolute project directory.');
  const timeoutMs = numberOption(values, 'timeout-ms', 1, 300_000);
  const budget = numberOption(values, 'budget', 1, 8000);
  const depth = numberOption(values, 'depth', 1, 8);
  const text = queryCommands.includes(command as typeof queryCommands[number]) ? required(values, 'text') : undefined;
  const target = command === 'path' ? required(values, 'target') : undefined;
  const runtime = await loadGraphifyRuntime(managedRoot);
  if (context.expectedRuntimeId !== undefined && runtime.runtimeId !== context.expectedRuntimeId) throw new Error('The installed Graphify runtime differs from this skill descriptor. Prepare and apply a new Agent Forge plan before using it.');
  if (context.expectedRuntimeHash !== undefined && graphifyHash(await readGraphifyFile(path.join(managedRoot, 'runtime.json'))) !== context.expectedRuntimeHash) throw new Error('The installed Graphify runtime receipt differs from this skill descriptor.');
  // Status also verifies the frozen runtime; index and query verify again at their
  // own execution boundary so direct API callers receive the same protection.
  if (command === 'status') await verifyGraphifyRuntime(runtime, { signal: context.signal });
  checkCancelled(context.signal);
  const options: GraphifyIndexOptions = {
    runtime, repositoryPath, signal: context.signal,
    ...(values.include ? { include: values.include as string[] } : {}),
    ...(values.exclude ? { exclude: values.exclude as string[] } : {}),
    ...(timeoutMs === undefined ? {} : { timeoutMs }),
  };
  if (command === 'status') {
    const result = await getGraphifyStatus(options);
    checkCancelled(context.signal);
    return result;
  }
  if (command === 'index') return { status: 'fresh', metadata: await buildGraphifyIndex({ ...options, rebuild: values.rebuild === true }) };
  return queryGraphify({ ...options, operation: command as typeof queryCommands[number], text: text!, ...(target === undefined ? {} : { target }), ...(budget === undefined ? {} : { budget }), ...(depth === undefined ? {} : { depth }) });
}

export async function runInstalledGraphifyCommand(args: string[], descriptorPath: string, signal?: AbortSignal): Promise<unknown> {
  const bytes = await readGraphifyFile(descriptorPath);
  if (bytes.length > 64 * 1024) throw new Error('Installed Graphify descriptor exceeds its size limit.');
  const descriptor = JSON.parse(bytes.toString('utf8')) as InstalledGraphifyDescriptor;
  if (!descriptor || descriptor.schemaVersion !== 1 || typeof descriptor.managedRoot !== 'string' || !path.isAbsolute(descriptor.managedRoot) || (descriptor.runtimeId !== null && (typeof descriptor.runtimeId !== 'string' || !/^[a-f0-9]{64}$/.test(descriptor.runtimeId))) || (descriptor.runtimeHash !== undefined && (typeof descriptor.runtimeHash !== 'string' || !/^[a-f0-9]{64}$/.test(descriptor.runtimeHash))) || Object.keys(descriptor).some(key => !['schemaVersion', 'managedRoot', 'runtimeId', 'runtimeHash'].includes(key))) throw new Error('Invalid installed Graphify descriptor.');
  if (descriptor.runtimeId === null) throw new Error('No reviewed Graphify runtime was installed for this skill. Prepare and apply an Agent Forge plan with Graphify before using the index; direct repository inspection remains available.');
  return runGraphifyCommand(args, { managedRoot: descriptor.managedRoot, expectedRuntimeId: descriptor.runtimeId, expectedRuntimeHash: descriptor.runtimeHash, signal });
}
