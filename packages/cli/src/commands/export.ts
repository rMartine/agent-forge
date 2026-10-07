import type { Command } from 'commander';
import { exportEditions } from '@agent-forge/core';
import { repoPath } from '../output.js';

export function registerExport(program:Command):void {
  program.command('export').description('Generate synchronized Codex, Copilot and OpenCode V2 editions without installing them')
    .option('--target <target>','Artifact edition: codex, vscode, opencode or all','all')
    .requiredOption('--output <path>','New output directory')
    .option('--download-skills','Prepare missing pinned resources')
    .option('--json','Emit complete export receipt')
    .action(async options=>{
      if(!['all','codex','vscode','opencode'].includes(options.target))throw new Error('Invalid artifact edition.');
      const receipt=await exportEditions(repoPath(program),options.output,{target:options.target,downloadSkills:options.downloadSkills});
      console.log(options.json?JSON.stringify(receipt,null,2):`Exported ${receipt.editions.length} synchronized editions to ${receipt.output}; catalog ${receipt.canonicalFingerprint}`);
    });
}
