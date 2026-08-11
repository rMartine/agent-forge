import type { Command } from 'commander';
import { createDeploymentPlan, discoverVsCodeEnvironment, doctorMcp, loadCapabilityCatalog, loadManifest, loadMcpProviders, validateRoster } from '@agent-forge/core';
import { printDiagnostics, repoPath } from '../output.js';

export function registerDoctor(program: Command): void {
  program.command('doctor').description('Check roster structure and MCP provider readiness')
    .option('--profile <profile>', 'Readiness profile', 'full')
    .option('--json', 'Emit JSON')
    .action(async options => {
      if (options.profile !== 'full') throw new Error('Only the full readiness profile is currently supported.');
      const repo = repoPath(program);
      const manifest = await loadManifest(repo);
      const roster = await validateRoster(repo, manifest, await loadCapabilityCatalog(repo, manifest.capabilityCatalog));
      const mcp = await doctorMcp(await loadMcpProviders(repo, manifest.mcpProviders));
      const environment = await discoverVsCodeEnvironment();
      const preview = await createDeploymentPlan(repo, { availableTools: environment.availableTools, availableModels: environment.availableModels, strictCapabilities: true });
      const result = { ready: roster.valid && mcp.ready && environment.supported && !preview.diagnostics.some(item => item.severity === 'error'), roster, mcp, environment, previewDiagnostics: preview.diagnostics };
      if (options.json) console.log(JSON.stringify(result, null, 2));
      else {
        printDiagnostics([...roster.diagnostics, ...mcp.diagnostics, ...environment.diagnostics, ...preview.diagnostics]);
        for (const [name, provider] of Object.entries(mcp.providers)) console.log(`${name}: ${provider.ready ? 'ready' : 'not ready'} — ${provider.message}`);
      }
      if (!result.ready) process.exitCode = 1;
    });
}
