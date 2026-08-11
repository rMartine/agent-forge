import type { Command } from 'commander';
import { loadDeploymentState, loadManifest, resolveStatePath, wipe } from '@agent-forge/core';
import { printDiagnostics, repoPath } from '../output.js';

export function registerWipe(program: Command): void {
  program.command('wipe').description('Remove only unchanged Agent Forge-managed customizations')
    .requiredOption('--managed-only', 'Acknowledge that only ledger-owned unchanged files are eligible')
    .requiredOption('--confirm <deployment-id>', 'Exact active deployment id')
    .action(async options => {
      const repo = repoPath(program);
      const manifest = await loadManifest(repo);
      const state = await loadDeploymentState(resolveStatePath(manifest.targets.state));
      if (!state.activeDeploymentId || options.confirm !== state.activeDeploymentId) {
        throw new Error('Confirmation must exactly match the active deployment id.');
      }
      const result = await wipe(repo);
      printDiagnostics(result.diagnostics);
      console.log(`Removed/restored: ${result.deleted}; preserved: ${result.skipped}`);
      if (!result.success) process.exitCode = 1;
    });
}
