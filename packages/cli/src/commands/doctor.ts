import type { Command } from 'commander';
import { createDeploymentPlan, discoverCodexEnvironment, discoverVsCodeEnvironment, doctorMcp, loadCapabilityCatalog, loadManifest, loadMcpProviders, validateRoster } from '@agent-forge/core';
import { copilotSelection, printDiagnostics, repoPath, runtimeSelection } from '../output.js';

export function registerDoctor(program: Command): void {
  program.command('doctor').description('Check roster structure and MCP provider readiness')
    .option('--profile <profile>', 'Readiness profile', 'full')
    .option('--target <target>', 'Runtime target', 'all')
    .option('--rosters <rosters>', 'Copilot roster selection', 'all')
    .option('--harness <harness>', 'VS Code hook engine: copilot or local', 'copilot')
    .option('--json', 'Emit JSON')
    .action(async options => {
      if (options.profile !== 'full') throw new Error('Only the full readiness profile is currently supported.');
      const repo = repoPath(program);
      const target = runtimeSelection(options.target);
      const copilot = copilotSelection(options);
      const manifest = await loadManifest(repo);
      const roster = await validateRoster(repo, manifest, await loadCapabilityCatalog(repo, manifest.capabilityCatalog), { target });
      const vscode = target === 'codex' ? undefined : await discoverVsCodeEnvironment();
      const codex = target === 'vscode' ? undefined : await discoverCodexEnvironment();
      const fourRosters = Boolean(manifest.copilotFourRosters);
      const mcp = target === 'codex' ? undefined : await doctorMcp(await loadMcpProviders(repo, manifest.copilotFourRosters?.mcpProviders ?? manifest.mcpProviders));
      const preview = await createDeploymentPlan(repo, { target, ...copilot, availableTools: vscode?.availableTools, availableModels: vscode?.availableModels, codexModelAvailability: codex, strictCapabilities: target !== 'codex' });
      const environmentReady = (vscode?.supported ?? true) && (codex?.supported ?? true);
      const result = { ready: roster.valid && (fourRosters || (mcp?.ready ?? true)) && environmentReady && !preview.diagnostics.some(item => item.severity === 'error'), roster, mcp, environments: { vscode, codex }, previewDiagnostics: preview.diagnostics };
      if (options.json) console.log(JSON.stringify(result, null, 2));
      else {
        printDiagnostics([...roster.diagnostics, ...(mcp?.diagnostics ?? []), ...(vscode?.diagnostics ?? []), ...(codex?.diagnostics ?? []), ...preview.diagnostics]);
        for (const [name, provider] of Object.entries(mcp?.providers ?? {})) console.log(name + ': ' + (provider.ready ? 'ready' : 'not ready') + ' — ' + provider.message);
      }
      if (!result.ready) process.exitCode = 1;
    });
}
