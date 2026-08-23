import type { Command } from 'commander';
import {
  applyCleanupPlan,
  createCleanupPlan,
  loadCleanupPlan,
  loadManifest,
  resolveStatePath,
  saveCleanupPlan,
} from '@agent-forge/core';
import { printDiagnostics, repoPath, runtimeSelection } from '../output.js';

export function registerCleanup(program: Command): void {
  program.command('cleanup').description('Preview or apply stale ledger-owned customization cleanup')
    .requiredOption('--managed-only', 'Only unchanged ledger-owned files are eligible')
    .option('--target <target>', 'Runtime target', 'all')
    .option('--plan <id>', 'Immutable cleanup plan id')
    .option('--confirm <id>', 'Exact cleanup plan id confirmation')
    .option('--json', 'Emit JSON')
    .action(async options => {
      const repo = repoPath(program);
      const target = runtimeSelection(options.target);
      const manifest = await loadManifest(repo);
      const statePath = resolveStatePath(manifest.targets.state);
      if (!options.plan) {
        if (options.confirm) throw new Error('--confirm requires --plan.');
        const plan = await createCleanupPlan(repo, { target });
        const planPath = await saveCleanupPlan(plan, statePath);
        const result = { ...plan, planPath };
        if (options.json) console.log(JSON.stringify(result, null, 2));
        else {
          printDiagnostics(plan.diagnostics);
          console.log('Cleanup plan: ' + plan.planId);
          console.log('Immutable plan: ' + planPath);
          for (const action of plan.actions) console.log('[' + action.runtime + '] ' + action.targetPath);
        }
        return;
      }
      if (options.plan !== options.confirm) throw new Error('Confirmation must exactly match the immutable cleanup plan id.');
      const plan = await loadCleanupPlan(statePath, options.plan);
      const expected = target === 'all' ? ['vscode', 'codex'] : [target];
      if (plan.targets.slice().sort().join(',') !== expected.slice().sort().join(',')) throw new Error('Cleanup plan targets do not match --target.');
      const result = await applyCleanupPlan(plan, statePath);
      if (options.json) console.log(JSON.stringify(result, null, 2));
      else {
        printDiagnostics(result.diagnostics);
        console.log('Removed: ' + result.deleted + '; preserved: ' + result.skipped);
      }
      if (!result.success) process.exitCode = 1;
    });
}
