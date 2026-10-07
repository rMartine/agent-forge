import type { Command } from 'commander';
import { loadCapabilityCatalog, loadManifest, validateRoster, loadRosterCatalog, renderRosterEdition, type ArtifactEdition } from '@agent-forge/core';
import * as path from 'node:path';
import { printDiagnostics, repoPath, runtimeSelection } from '../output.js';

export function registerValidate(program: Command): void {
  program.command('validate').description('Validate the canonical roster and customization files')
    .option('--strict', 'Treat validation errors as blocking', true)
    .option('--target <target>', 'Runtime target', 'vscode')
    .option('--json', 'Emit JSON')
    .action(async options => {
      const target = options.target === 'opencode' ? 'opencode' : runtimeSelection(options.target);
      const repo = repoPath(program);
      const manifest = await loadManifest(repo);
      const catalog = await loadCapabilityCatalog(repo, manifest.capabilityCatalog);
      const result = await validateRoster(repo, manifest, catalog, { target: target === 'opencode' ? 'all' : target });
      if (manifest.schemaVersion === 6) {
        const canonical = await loadRosterCatalog(repo);
        const editions: ArtifactEdition[] = target === 'all' ? ['codex', 'vscode', 'opencode'] : [target];
        for (const edition of editions) {
          const root = path.resolve(repo, '.cache', 'validation', edition);
          const rendered = await renderRosterEdition(canonical, edition, {repoPath:repo, agentRoot:path.join(root,'agents'),skillRoot:path.join(root,'skills'),runtimeRoot:path.join(root,'runtime'),hooksRoot:path.join(root,'hooks'),portable:true});
          result.diagnostics.push(...rendered.diagnostics);
        }
        result.valid = !result.diagnostics.some(item => item.severity === 'error');
      } else if (target === 'opencode') throw new Error('OpenCode requires the canonical v6 roster.');
      if (options.json) console.log(JSON.stringify(result, null, 2));
      else {
        printDiagnostics(result.diagnostics);
        console.log(result.valid ? 'Roster validation passed.' : 'Roster validation failed.');
      }
      if (!result.valid) process.exitCode = 1;
    });
}
