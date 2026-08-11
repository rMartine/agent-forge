import type { Command } from 'commander';
import { applyMcpSetupPlan, createMcpSetupPlan, doctorMcp, loadManifest, loadMcpProviders } from '@agent-forge/core';
import { confirm, printDiagnostics, repoPath } from '../output.js';

export function registerSetupMcp(program: Command): void {
  const mcp = program.command('mcp').description('Inspect MCP provider setup');
  mcp.command('setup').description('Show provider readiness and merge-safe configuration templates')
    .option('--provider <name>', 'Show one provider')
    .option('--json', 'Emit JSON')
    .option('--preview-only', 'Do not offer to add providers through VS Code')
    .action(async options => {
      const repo = repoPath(program);
      const manifest = await loadManifest(repo);
      const catalog = await loadMcpProviders(repo, manifest.mcpProviders);
      const doctor = await doctorMcp(catalog);
      const plan = createMcpSetupPlan(catalog, options.provider);
      const result = { doctor, plan, note: 'Changes use the official VS Code --add-mcp merge interface. Secret values are never stored.' };
      console.log(JSON.stringify(result, null, 2));
      if (options.json || options.previewOnly || plan.diagnostics.some(item => item.severity === 'error')) {
        if (plan.diagnostics.some(item => item.severity === 'error')) process.exitCode = 1;
        return;
      }
      const approved: string[] = [];
      for (const change of plan.changes.filter(item => item.action === 'add')) {
        if (await confirm(`${change.message}. Approve provider ${change.provider}?`)) approved.push(change.provider);
      }
      const applied = await applyMcpSetupPlan(plan, approved);
      printDiagnostics(applied.diagnostics);
      console.log(`Applied: ${applied.applied.join(', ') || 'none'}; skipped: ${applied.skipped.join(', ') || 'none'}`);
      if (!applied.success) process.exitCode = 1;
    });
}
