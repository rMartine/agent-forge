import * as os from 'node:os';
import * as path from 'node:path';
import { readFile } from 'node:fs/promises';
import type { Command } from 'commander';
import { applyRosterMigrationPlan, createRosterMigrationPlan, hashFile, loadManifest, loadRosterMigrationPlan, resolveStatePath, restoreRosterMigration, saveRosterMigrationPlan } from '@agent-forge/core';
import type { LegacyRosterPackage, RosterMigrationResult } from '@agent-forge/core';
import { printDiagnostics, repoPath } from '../output.js';

function print(result: RosterMigrationResult, asJson: boolean): void {
  if (asJson) console.log(JSON.stringify(result, null, 2));
  else {
    printDiagnostics(result.diagnostics);
    console.log('Roster migration: ' + result.planId + '; ' + (result.success ? 'completed' : 'not completed'));
    console.log('Persistent backups: ' + result.backupDirectory);
    for (const error of result.errors) console.error(error.path + ': ' + error.message);
  }
  if (!result.success) process.exitCode = 1;
}
export function registerMigrateRosters(program: Command): void {
  const migration = program.command('migrate-rosters').description('Explicitly transfer legacy roster ownership and archive reviewed historical Copilot files');
  migration.command('preview')
    .option('--codex-home <path>', 'Codex profile (defaults to CODEX_HOME or USERPROFILE/.codex)')
    .option('--legacy-ledgers <file>', 'JSON array of packageName/statePath objects; defaults to the three known package ledgers')
    .option('--archive-list <file>', 'JSON array of exact absolute historical Copilot file paths; no implicit removal')
    .option('--json', 'Emit a review summary without snapshot contents')
    .action(async options => {
      const manifest = await loadManifest(repoPath(program));
      const statePath = resolveStatePath(manifest.targets.state);
      const profile = process.env.USERPROFILE || process.env.HOME || os.homedir();
      const codexHome = options.codexHome || process.env.CODEX_HOME || path.join(profile, '.codex');
      if (!path.isAbsolute(codexHome)) throw new Error('Codex home must be an absolute path.');
      const defaults = (['research-specialists', 'independent-specialists', 'consulting-specialist'] as LegacyRosterPackage[]).map(packageName => ({ packageName, statePath: path.join(profile, `.agent-forge-${packageName}`, 'state.json') }));
      const legacyLedgers = options.legacyLedgers ? JSON.parse(await readFile(options.legacyLedgers, 'utf8')) : defaults;
      if (!Array.isArray(legacyLedgers) || legacyLedgers.some(item => !item || typeof item !== 'object' || typeof item.statePath !== 'string' || !path.isAbsolute(item.statePath) || !defaults.some(known => known.packageName === item.packageName))) throw new Error('Legacy ledgers must be an array of known packageName and absolute statePath objects.');
      const legacyArchivePaths = options.archiveList ? JSON.parse(await readFile(options.archiveList, 'utf8')) : [];
      if (!Array.isArray(legacyArchivePaths) || legacyArchivePaths.some(item => typeof item !== 'string' || !path.isAbsolute(item))) throw new Error('Archive list must be an array of exact absolute file paths.');
      const plan = await createRosterMigrationPlan(statePath, { codexHome, legacyLedgers, legacyArchivePaths });
      const planPath = await saveRosterMigrationPlan(plan, statePath);
      const summary = {
        planId: plan.planId, fingerprint: plan.fingerprint, planPath, planHash: await hashFile(planPath),
        statePath, codexHome, originalCoreHash: plan.core.sha256,
        importedLedgers: plan.legacyLedgers.map(item => ({ packageName: item.packageName, path: item.path, sha256: item.sha256 })),
        recordedFiles: plan.files.length,
        archives: plan.archives.map(({ contentBase64, ...item }) => item),
        explanation: 'Applying transfers existing ownership into the core ledger without rewriting hooks or owned files. Only the exact listed historical Copilot files are archived after persistent byte-for-byte backup. Original ledgers remain recoverable; legacy installers are disabled by migration markers. OpenCode is not installed.',
      };
      if (options.json) console.log(JSON.stringify(summary, null, 2));
      else { console.log(summary.explanation); console.log('Migration plan: ' + plan.planId); console.log('Saved plan: ' + planPath); console.log('Fingerprint: ' + plan.fingerprint); console.log('Imported ledgers: ' + plan.legacyLedgers.length + '; recorded files: ' + plan.files.length + '; explicit archives: ' + plan.archives.length); for (const item of summary.archives) console.log('[archive] ' + item.path + '; observed SHA-256: ' + item.sha256); }
    });
  migration.command('apply').requiredOption('--plan <id>', 'Saved migration plan ID').requiredOption('--confirm <id>', 'Exact plan ID confirmation').option('--json', 'Emit JSON')
    .action(async options => {
      if (options.plan !== options.confirm) throw new Error('Confirmation must exactly match the saved migration plan ID.');
      const manifest = await loadManifest(repoPath(program)), statePath = resolveStatePath(manifest.targets.state);
      const plan = await loadRosterMigrationPlan(statePath, options.plan);
      print(await applyRosterMigrationPlan(plan, statePath, options.confirm), options.json === true);
    });
  migration.command('restore').requiredOption('--plan <id>', 'Migration to restore, including interrupted applications').requiredOption('--confirm <id>', 'Exact migration plan ID confirmation').option('--json', 'Emit JSON')
    .action(async options => {
      if (options.plan !== options.confirm) throw new Error('Confirmation must exactly match the migration plan ID.');
      const manifest = await loadManifest(repoPath(program)), statePath = resolveStatePath(manifest.targets.state);
      print(await restoreRosterMigration(statePath, options.plan, options.confirm), options.json === true);
    });
}
