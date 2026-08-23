import type { Command } from 'commander';
import { loadDeploymentState, loadManifest, resolveStatePath, wipe } from '@agent-forge/core';
import { printDiagnostics, repoPath, runtimeTarget } from '../output.js';

export function registerWipe(program: Command): void {
  program.command('wipe').description('Remove only unchanged Agent Forge-managed customizations')
    .requiredOption('--managed-only', 'Acknowledge that only ledger-owned unchanged files are eligible')
    .requiredOption('--confirm <deployment-id>', 'Exact active deployment id')
    .requiredOption('--target <runtime>', 'Runtime target: vscode or codex')
    .action(async options => {
      const repo = repoPath(program);
      const manifest = await loadManifest(repo);
      const state = await loadDeploymentState(resolveStatePath(manifest.targets.state));
      const target = runtimeTarget(options.target);
      if (!state.activeDeployments[target] || options.confirm !== state.activeDeployments[target]) {
        throw new Error('Confirmation must exactly match the active deployment id.');
      }
      const result = await wipe(repo, target);
      printDiagnostics(result.diagnostics);
      console.log(`Removed/restored: ${result.deleted}; preserved: ${result.skipped}`);
      if (!result.success) process.exitCode = 1;
    });
}
