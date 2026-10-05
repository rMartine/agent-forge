import type { Command } from 'commander';
import {
  createDeploymentPlan,
  discoverCodexEnvironment,
  discoverVsCodeEnvironment,
  loadManifest,
  resolveStatePath,
  saveDeploymentPlan,
} from '@agent-forge/core';
import { copilotSelection, printDiagnostics, repoPath, runtimeSelection } from '../output.js';

export function registerPreview(program: Command): void {
  program.command('preview').description('Render and persist an immutable deployment preview')
    .option('--scope <scope>', 'Deployment scope', 'user')
    .option('--profile <profile>', 'Capability profile', 'full')
    .option('--target <target>', 'Runtime target', 'all')
    .option('--rosters <rosters>', 'Copilot roster selection (all four rosters)', 'all')
    .option('--harness <harness>', 'VS Code hook engine: copilot or local', 'copilot')
    .option('--json', 'Emit JSON')
    .option('--download-skills', 'Download missing pinned skill files into the local cache before preview')
    .option('--graphify-plan <id>', 'Include the exact frozen Graphify provisioning plan in this deployment')
    .action(async options => {
      if (options.scope !== 'user') throw new Error('Only user scope is supported.');
      if (options.profile !== 'full') throw new Error('Only the full capability profile is currently supported.');
      const target = runtimeSelection(options.target);
      const copilot = copilotSelection(options);
      const repo = repoPath(program);
      const vscode = target === 'codex' ? undefined : await discoverVsCodeEnvironment();
      const codex = target === 'vscode' ? undefined : await discoverCodexEnvironment();
      const plan = await createDeploymentPlan(repo, {
        target,
        ...copilot,
        availableTools: vscode?.availableTools,
        availableModels: vscode?.availableModels,
        strictCapabilities: target !== 'codex',
        downloadSkills: options.downloadSkills === true,
        codexModelAvailability: codex,
        graphifyProvisionPlanId: options.graphifyPlan,
      });
      plan.diagnostics.push(...(vscode?.diagnostics ?? []), ...(codex?.diagnostics ?? []));
      const manifest = await loadManifest(repo);
      const planPath = await saveDeploymentPlan(plan, resolveStatePath(manifest.targets.state));
      const safePlan = {
        ...plan,
        planPath,
        artifacts: plan.artifacts.map(({ content: _content, ...item }) => item),
      };
      if (options.json) console.log(JSON.stringify(safePlan, null, 2));
      else {
        printDiagnostics(plan.diagnostics);
        console.log('Deployment ' + plan.deploymentId + ': ' + plan.artifacts.length + ' rendered files');
        console.log('Immutable plan: ' + planPath);
        if (target !== 'codex' && manifest.copilotFourRosters) console.log('Copilot: four rosters; hooks=' + copilot.harness + '; original model assignments preserved.');
        for (const item of plan.artifacts) console.log('[' + item.runtime + '/' + item.type + '] ' + item.targetPath);
        for (const item of plan.cleanupActions) console.log('[cleanup/' + item.runtime + '] ' + item.targetPath);
      }
      if (plan.diagnostics.some(item => item.severity === 'error')) process.exitCode = 1;
    });
}
