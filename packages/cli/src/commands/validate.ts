import type { Command } from 'commander';
import { loadCapabilityCatalog, loadManifest, validateRoster } from '@agent-forge/core';
import { printDiagnostics, repoPath } from '../output.js';

export function registerValidate(program: Command): void {
  program.command('validate').description('Validate the canonical roster and customization files')
    .option('--strict', 'Treat validation errors as blocking', true)
    .option('--target <target>', 'Runtime target', 'vscode')
    .option('--json', 'Emit JSON')
    .action(async options => {
      if (options.target !== 'vscode') throw new Error('Only the vscode target is supported.');
      const repo = repoPath(program);
      const manifest = await loadManifest(repo);
      const catalog = await loadCapabilityCatalog(repo, manifest.capabilityCatalog);
      const result = await validateRoster(repo, manifest, catalog);
      if (options.json) console.log(JSON.stringify(result, null, 2));
      else {
        printDiagnostics(result.diagnostics);
        console.log(result.valid ? 'Roster validation passed.' : 'Roster validation failed.');
      }
      if (!result.valid) process.exitCode = 1;
    });
}
