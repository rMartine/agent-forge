import type { Command } from 'commander';
import { deploy } from '@agent-forge/core';
import { environmentList, printDiagnostics, repoPath } from '../output.js';

export function registerDeploy(program: Command): void {
  program.command('deploy').description('Validate and atomically deploy to the VS Code user profile')
    .option('--scope <scope>', 'Deployment scope', 'user')
    .option('--profile <profile>', 'Capability profile', 'full')
    .action(async options => {
      if (options.scope !== 'user') throw new Error('Only user scope is supported.');
      if (options.profile !== 'full') throw new Error('Only the full capability profile is currently supported.');
      const result = await deploy(repoPath(program), {
        availableTools: environmentList('AGENT_FORGE_AVAILABLE_TOOLS'),
        availableModels: environmentList('AGENT_FORGE_AVAILABLE_MODELS'),
        strictCapabilities: true,
      });
      printDiagnostics(result.diagnostics);
      console.log(`Deployment: ${result.deploymentId ?? 'not applied'}`);
      console.log(`Deployed: ${result.deployed}; skipped: ${result.skipped}; failed: ${result.failed}`);
      for (const error of result.errors) console.error(`${error.path}: ${error.message}`);
      if (!result.success) process.exitCode = 1;
    });
}
