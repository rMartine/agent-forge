import * as path from 'node:path';
import type { Command } from 'commander';
import { loadManifest, resolveRepoFilePath, resolveTargetPath, runGraphifyCommand } from '@agent-forge/core';
import { repoPath } from '../output.js';

const collect = (value: string, previous: string[] = []): string[] => [...previous, value];

export function registerGraphify(program: Command): void {
  const graphify = program.command('graphify').description('Provision a reviewed private Graphify runtime or inspect an assigned local software project');
  const run = (operation: string) => async (options: Record<string, unknown>): Promise<void> => {
    const repo = path.resolve(repoPath(program));
    const manifest = await loadManifest(repo);
    const configuration = manifest.codex.graphify;
    if (!configuration) throw new Error('This manifest does not configure Graphify. Review a manifest v5 Graphify configuration before using these commands.');
    const args = [operation];
    for (const [key, value] of Object.entries(options)) {
      if (value === undefined || value === false) continue;
      const name = key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
      if (Array.isArray(value)) { for (const item of value) args.push(`--${name}`, String(item)); }
      else if (value === true) args.push(`--${name}`);
      else args.push(`--${name}`, String(value));
    }
    const cancellation = new AbortController();
    const interrupt = () => cancellation.abort();
    const cancellable = operation !== 'provision-rollback';
    if (cancellable) { process.once('SIGINT', interrupt); process.once('SIGTERM', interrupt); }
    try {
      const result = await runGraphifyCommand(args, {
        managedRoot: path.resolve(resolveTargetPath(configuration.managedRoot)),
        provisioning: { lockPath: resolveRepoFilePath(repo, configuration.lockFile), helperDirectory: path.join(repo, 'scripts', 'graphify') },
        signal: cancellation.signal,
      });
      console.log(JSON.stringify(result, null, 2));
    } finally {
      if (cancellable) { process.removeListener('SIGINT', interrupt); process.removeListener('SIGTERM', interrupt); }
    }
  };

  graphify.command('provision-preview').description('Freeze the private Python runtime, pinned wheels and local helpers into an immutable plan')
    .requiredOption('--python <executable>', 'Reviewed Windows Python executable')
    .option('--download-missing', 'Download missing locked wheel bytes during preview only')
    .option('--wheel-cache <directory>', 'Directory with the reviewed wheel files')
    .option('--json', 'Emit JSON (default)')
    .action(run('provision-preview'));
  for (const operation of ['provision-apply', 'provision-rollback']) {
    graphify.command(operation).description(operation === 'provision-apply' ? 'Install the exact frozen provisioning plan' : 'Restore the runtime active before the specified provisioning plan')
      .requiredOption('--plan <id>', 'Immutable plan identifier')
      .requiredOption('--confirm <id>', 'Exact matching plan identifier')
      .option('--json', 'Emit JSON (default)')
      .action(run(operation));
  }
  for (const operation of ['index', 'status', 'query', 'affected', 'path', 'explain']) {
    const command = graphify.command(operation).description(`Run Graphify ${operation} for the specified local project`)
      .requiredOption('--project <directory>', 'Absolute directory of the assigned software project')
      .option('--include <pattern>', 'Relative glob to include; repeat for several patterns', collect)
      .option('--exclude <pattern>', 'Relative glob to exclude; repeat for several patterns', collect)
      .option('--timeout-ms <milliseconds>', 'Bounded child-process timeout, 1 through 300000')
      .option('--json', 'Emit JSON (default)');
    if (operation === 'index') command.option('--rebuild', 'Build a new generation even if the current index is fresh');
    if (!['index', 'status'].includes(operation)) command.requiredOption('--text <text>', 'Question, relative path or source symbol for this operation');
    if (operation === 'query') command.option('--budget <tokens>', 'Maximum query context budget, 1 through 8000');
    if (operation === 'affected') command.option('--depth <levels>', 'Maximum dependency traversal depth, 1 through 8');
    if (operation === 'path') command.requiredOption('--target <symbol>', 'Destination symbol for the directed path');
    command.action(run(operation));
  }
}
