import type { Command } from 'commander';
import { applyDeploymentPlan, loadDeploymentPlan, loadManifest, resolveStatePath } from '@agent-forge/core';
import { printDiagnostics, repoPath, runtimeSelection } from '../output.js';

export function registerDeploy(program: Command): void {
  program.command('deploy').description('Apply an exact immutable Agent Forge deployment plan')
    .requiredOption('--plan <id>', 'Immutable plan id returned by preview')
    .requiredOption('--confirm <id>', 'Exact plan id confirmation')
    .option('--target <target>', 'Expected runtime target', 'all')
    .action(async options => {
      if (options.plan !== options.confirm) throw new Error('Confirmation must exactly match the immutable plan id.');
      const target = runtimeSelection(options.target);
      const repo = repoPath(program);
      const manifest = await loadManifest(repo);
      const statePath = resolveStatePath(manifest.targets.state);
      const plan = await loadDeploymentPlan(statePath, options.plan);
      const expected = target === 'all' ? ['vscode', 'codex'] : [target];
      if (plan.targets.slice().sort().join(',') !== expected.slice().sort().join(',')) {
        throw new Error('Plan runtime targets do not match --target.');
      }
      const result = await applyDeploymentPlan(plan, statePath);
      printDiagnostics(result.diagnostics);
      console.log('Deployment: ' + (result.deploymentId ?? 'not applied'));
      console.log('Deployed: ' + result.deployed + '; skipped: ' + result.skipped + '; failed: ' + result.failed);
      for (const error of result.errors) console.error(error.path + ': ' + error.message);
      if (!result.success) process.exitCode = 1;
    });
}
