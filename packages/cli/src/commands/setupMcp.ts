import type { Command } from 'commander';
import { doctorMcp, loadManifest, loadMcpProviders } from '@agent-forge/core';
import { repoPath } from '../output.js';

export function registerSetupMcp(program: Command): void {
  const mcp = program.command('mcp').description('Inspect MCP provider setup');
  mcp.command('setup').description('Show provider readiness and merge-safe configuration templates')
    .option('--provider <name>', 'Show one provider')
    .option('--json', 'Emit JSON')
    .action(async options => {
      const repo = repoPath(program);
      const manifest = await loadManifest(repo);
      const catalog = await loadMcpProviders(repo, manifest.mcpProviders);
      const doctor = await doctorMcp(catalog);
      const selected = options.provider
        ? { [options.provider]: catalog.providers[options.provider] }
        : catalog.providers;
      const result = { doctor, providers: selected, note: 'Review and merge through VS Code MCP: Open User Configuration. No secret values are stored.' };
      if (options.json) console.log(JSON.stringify(result, null, 2));
      else console.log(JSON.stringify(result, null, 2));
      if (options.provider && !catalog.providers[options.provider]) process.exitCode = 1;
    });
}
