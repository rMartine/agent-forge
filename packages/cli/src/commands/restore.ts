import type { Command } from 'commander';
import { restore } from '@agent-forge/core';
import { confirm, printDiagnostics, repoPath } from '../output.js';

export function registerRestore(program: Command): void {
  program.command('restore').description('Deprecated alias for rollback')
    .action(async () => {
      console.warn('restore is deprecated; use rollback.');
      if (!await confirm('Roll back the active Agent Forge deployment?')) return;
      const result = await restore(repoPath(program), undefined, 'vscode');
      printDiagnostics(result.diagnostics);
      if (!result.success) process.exitCode = 1;
    });
}
