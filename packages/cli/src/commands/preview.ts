import type { Command } from 'commander';
import { createDeploymentPlan, discoverVsCodeEnvironment } from '@agent-forge/core';
import { printDiagnostics, repoPath } from '../output.js';

export function registerPreview(program: Command): void {
  program.command('preview').description('Render an immutable deployment preview without writing the user profile')
    .option('--scope <scope>', 'Deployment scope', 'user')
    .option('--profile <profile>', 'Capability profile', 'full')
    .option('--json', 'Emit JSON')
    .action(async options => {
      if (options.scope !== 'user') throw new Error('Only user scope is supported.');
      if (options.profile !== 'full') throw new Error('Only the full capability profile is currently supported.');
      const environment = await discoverVsCodeEnvironment();
      if (!environment.supported) {
        printDiagnostics(environment.diagnostics);
        process.exitCode = 1;
        return;
      }
      const plan = await createDeploymentPlan(repoPath(program), {
        availableTools: environment.availableTools,
        availableModels: environment.availableModels,
        strictCapabilities: true,
      });
      const safePlan = { ...plan, artifacts: plan.artifacts.map(({ content: _content, ...item }) => item) };
      if (options.json) console.log(JSON.stringify(safePlan, null, 2));
      else {
        printDiagnostics(plan.diagnostics);
        console.log(`Deployment ${plan.deploymentId}: ${plan.artifacts.length} rendered files`);
        for (const item of plan.artifacts) console.log(`[${item.type}] ${item.targetPath}`);
      }
      if (plan.diagnostics.some(item => item.severity === 'error')) process.exitCode = 1;
    });
}
