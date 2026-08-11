import type { Command } from 'commander';
import { status } from '@agent-forge/core';
import { printDiagnostics, repoPath } from '../output.js';

export function registerStatus(program: Command): void {
  program.command('status').description('Compare managed files with the ownership ledger')
    .option('--json', 'Emit JSON')
    .action(async options => {
      const result = await status(repoPath(program));
      if (options.json) console.log(JSON.stringify(result, null, 2));
      else {
        console.log(`Deployment: ${result.deploymentId ?? 'none'}; state: ${result.syncState}`);
        for (const item of result.files) console.log(`[${item.state}] ${item.path}`);
        printDiagnostics(result.diagnostics);
      }
      if (result.syncState === 'out-of-sync') process.exitCode = 1;
    });
}
