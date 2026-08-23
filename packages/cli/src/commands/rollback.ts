import type { Command } from 'commander';
import { restore } from '@agent-forge/core';
import { confirm, printDiagnostics, repoPath, runtimeTarget } from '../output.js';

export function registerRollback(program: Command): void {
  program.command('rollback').description('Roll back a recorded Agent Forge deployment')
    .option('--deployment <id>', 'Deployment id; defaults to active deployment')
    .requiredOption('--target <runtime>', 'Runtime target: vscode or codex')
    .action(async options => {
      if (!await confirm(`Roll back deployment ${options.deployment ?? 'active'}?`)) return;
      const target = runtimeTarget(options.target);
      const result = await restore(repoPath(program), options.deployment, target);
      printDiagnostics(result.diagnostics);
      console.log(`Restored: ${result.restored}; preserved: ${result.skipped}`);
      if (!result.success) process.exitCode = 1;
    });
}
