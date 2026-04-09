import type { Command } from 'commander';
import { status } from '@agent-forge/core';

export function registerStatus(program: Command): void {
  program
    .command('status')
    .description('Show sync status of roster files')
    .action(async () => {
      const opts = program.opts();
      const repoPath = opts.repo || process.cwd();

      try {
        const result = await status(repoPath);

        console.log(`\nOverall: ${result.syncState}\n`);

        const sections = [
          { label: 'Agents', items: result.agents },
          { label: 'Instructions', items: result.instructions },
          { label: 'Skills', items: result.skills },
          { label: 'Toolsets', items: result.toolsets },
          { label: 'Prompts', items: result.prompts },
          { label: 'Hooks', items: result.hooks },
        ];

        for (const section of sections) {
          if (section.items.length > 0) {
            console.log(`${section.label}:`);
            for (const item of section.items) {
              console.log(`  [${item.state.padEnd(18)}] ${item.path}`);
            }
            console.log('');
          }
        }

        process.exit(result.syncState === 'synced' ? 0 : 1);
      } catch (err: unknown) {
        const e = err as Error & { actionableMessage?: string };
        console.error(`Error: ${e.actionableMessage ?? e.message}`);
        process.exit(1);
      }
    });
}
