import type { Command } from 'commander';
import { getDeploymentStatus } from '@agent-forge/core';
import { printDiagnostics, repoPath, runtimeSelection } from '../output.js';

export function registerStatus(program: Command): void {
  program.command('status').description('Compare managed files with each runtime ownership ledger')
    .option('--target <target>', 'Runtime target', 'all')
    .option('--json', 'Emit JSON')
    .action(async options => {
      const result = await getDeploymentStatus(repoPath(program), { target: runtimeSelection(options.target) });
      if (options.json) console.log(JSON.stringify(result, null, 2));
      else {
        for (const [runtime, current] of Object.entries(result.targets)) {
          if (!current) continue;
          console.log(runtime + ': deployment=' + (current.deploymentId ?? 'none') + '; state=' + current.syncState);
          for (const item of current.files) console.log('[' + item.state + '] ' + item.path);
        }
        printDiagnostics(result.diagnostics);
      }
      if (Object.values(result.targets).some(item => item?.syncState === 'out-of-sync')) process.exitCode = 1;
    });
}
