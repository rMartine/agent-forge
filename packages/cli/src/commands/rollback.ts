import type { Command } from 'commander';
import { restore } from '@agent-forge/core';
import { confirm, printDiagnostics, repoPath } from '../output.js';

export function registerRollback(program: Command): void {
  program.command('rollback').description('Roll back a recorded Agent Forge deployment')
    .option('--deployment <id>', 'Deployment id; defaults to active deployment')
    .action(async options => {
      if (!await confirm(`Roll back deployment ${options.deployment ?? 'active'}?`)) return;
      const result = await restore(repoPath(program), options.deployment);
      printDiagnostics(result.diagnostics);
      console.log(`Restored: ${result.restored}; preserved: ${result.skipped}`);
      if (!result.success) process.exitCode = 1;
    });
}
