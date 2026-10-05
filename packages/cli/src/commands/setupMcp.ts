import type { Command } from 'commander';
import { applyMcpSetupPlan, createMcpSetupPlan, doctorMcp, loadManifest, loadMcpProviders, rollbackMcpSetup } from '@agent-forge/core';
import { confirm, printDiagnostics, repoPath } from '../output.js';

export function registerSetupMcp(program: Command): void {
  const mcp = program.command('mcp').description('Inspect MCP provider setup');
  mcp.command('setup').description('Show provider readiness and merge-safe configuration templates')
    .option('--provider <name>', 'Show one provider')
    .option('--config <path>', 'Exact mcp.json for a named VS Code user profile')
    .option('--json', 'Emit JSON')
    .option('--preview-only', 'Do not offer to add providers through VS Code')
    .action(async options => {
      const repo = repoPath(program);
      const manifest = await loadManifest(repo);
      const catalog = await loadMcpProviders(repo, manifest.copilotFourRosters?.mcpProviders ?? manifest.mcpProviders);
      const doctor = await doctorMcp(catalog);
      const plan = createMcpSetupPlan(catalog, options.provider, options.config);
      const result = { doctor, plan, note: 'Only missing providers are added to the reviewed MCP JSONC profile. Existing providers and inputs are preserved. Private rollback backups remain in the user Agent Forge directory.' };
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
      if (applied.backupDirectory) console.log('Private MCP rollback backup: ' + applied.backupDirectory);
      if (!applied.success) process.exitCode = 1;
    });
  mcp.command('rollback').description('Restore an unchanged MCP profile from its private setup backup')
    .requiredOption('--backup <path>', 'Backup directory returned by MCP setup')
    .option('--confirm', 'Apply the rollback without an interactive question')
    .action(async options => {
      if (!options.confirm && !await confirm('Restore the unchanged MCP profile from this private setup backup?')) return;
      const result = await rollbackMcpSetup(options.backup);
      printDiagnostics(result.diagnostics);
      console.log(result.restored ? 'MCP profile restored.' : 'MCP profile was not changed.');
      if (!result.success) process.exitCode = 1;
    });
}
