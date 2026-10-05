import * as path from 'node:path';
import type { Command } from 'commander';
import {
  applyManagedReconciliationPlan,
  createManagedReconciliationPlan,
  hashFile,
  loadManagedReconciliationPlan,
  loadManifest,
  resolveStatePath,
  restoreManagedReconciliation,
  saveManagedReconciliationPlan,
} from '@agent-forge/core';
import type { ManagedReconciliationResult } from '@agent-forge/core';
import { printDiagnostics, repoPath, runtimeTarget } from '../output.js';

function printResult(result: ManagedReconciliationResult, json: boolean): void {
  if (json) console.log(JSON.stringify(result, null, 2));
  else {
    printDiagnostics(result.diagnostics);
    console.log('Reconciliation: ' + result.planId + '; ' + (result.success ? 'completed' : 'not applied'));
    if (result.baselineDeploymentId) console.log('Active deployment recording current files: ' + result.baselineDeploymentId);
    console.log('Persistent backups: ' + result.backupDirectory);
    console.log('Original ledger backup: ' + result.previousStateBackupPath);
    for (const [name, count] of Object.entries(result.summary)) console.log(name + ': ' + count);
    for (const error of result.errors) console.error(error.path + ': ' + error.message);
  }
  if (!result.success) process.exitCode = 1;
}

export function registerReconcile(program: Command): void {
  const reconcile = program.command('reconcile')
    .description('Explicitly preserve and reconcile changed or missing files already owned by one runtime');

  reconcile.command('preview').description('Snapshot owned files and save a reviewable reconciliation plan')
    .requiredOption('--target <target>', 'One runtime: codex or vscode')
    .option('--json', 'Emit JSON without file contents')
    .action(async options => {
      const target = runtimeTarget(options.target);
      const manifest = await loadManifest(repoPath(program));
      const statePath = resolveStatePath(manifest.targets.state);
      const plan = await createManagedReconciliationPlan(statePath, target);
      const planPath = await saveManagedReconciliationPlan(plan, statePath);
      const backupDirectory = path.dirname(planPath);
      const preview = {
        planId: plan.planId, planPath, planHash: await hashFile(planPath),
        runtime: plan.runtime, previousDeploymentId: plan.previousDeploymentId,
        previousStateHash: plan.previousStateHash, statePath: plan.statePath,
        backupDirectory, previousStateBackupPath: path.join(backupDirectory, 'state-before.json'),
        explanation: plan.explanation,
        summary: {
          modified: plan.files.filter(file => file.state === 'modified').length,
          missing: plan.files.filter(file => file.state === 'missing').length,
          unchanged: plan.files.filter(file => file.state === 'unchanged').length,
        },
        files: plan.files.map(file => ({
          id: file.artifact.id, runtime: file.artifact.runtime, type: file.artifact.type,
          targetPath: file.artifact.targetPath, state: file.state,
          previousHash: file.artifact.deployedHash, observedHash: file.observedHash,
        })),
      };
      if (options.json) console.log(JSON.stringify(preview, null, 2));
      else {
        console.log(plan.explanation);
        console.log('Reconciliation plan: ' + plan.planId);
        console.log('Saved plan: ' + planPath);
        console.log('Plan SHA-256: ' + preview.planHash);
        console.log('Previous ledger SHA-256: ' + preview.previousStateHash);
        console.log('Changed: ' + preview.summary.modified + '; missing: ' + preview.summary.missing + '; unchanged: ' + preview.summary.unchanged);
        console.log('Persistent backups on apply: ' + backupDirectory);
        for (const file of preview.files) console.log('[' + file.state + '] ' + file.targetPath + '; recorded: ' + file.previousHash + '; observed: ' + (file.observedHash ?? 'absent'));
      }
    });

  reconcile.command('apply').description('Apply the reviewed plan after verifying ledger and file preimages')
    .requiredOption('--target <target>', 'Expected runtime: codex or vscode')
    .requiredOption('--plan <id>', 'Saved reconciliation plan ID')
    .requiredOption('--confirm <id>', 'Exact reconciliation plan ID confirmation')
    .option('--json', 'Emit JSON')
    .action(async options => {
      if (options.plan !== options.confirm) throw new Error('Confirmation must exactly match the saved reconciliation plan id.');
      const target = runtimeTarget(options.target);
      const manifest = await loadManifest(repoPath(program));
      const statePath = resolveStatePath(manifest.targets.state);
      const plan = await loadManagedReconciliationPlan(statePath, options.plan);
      if (plan.runtime !== target) throw new Error('Reconciliation plan runtime does not match --target.');
      printResult(await applyManagedReconciliationPlan(plan, statePath), options.json === true);
    });

  reconcile.command('restore').description('Restore the original ledger for an identified reconciliation when still safe')
    .requiredOption('--target <target>', 'Expected runtime: codex or vscode')
    .requiredOption('--plan <id>', 'Reconciliation plan ID whose original ledger should be restored')
    .option('--json', 'Emit JSON')
    .action(async options => {
      const target = runtimeTarget(options.target);
      const manifest = await loadManifest(repoPath(program));
      const statePath = resolveStatePath(manifest.targets.state);
      const plan = await loadManagedReconciliationPlan(statePath, options.plan);
      if (plan.runtime !== target) throw new Error('Reconciliation plan runtime does not match --target.');
      printResult(await restoreManagedReconciliation(statePath, plan.planId), options.json === true);
    });
}
