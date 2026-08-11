#!/usr/bin/env node
import { Command } from 'commander';
import { registerDeploy } from './commands/deploy.js';
import { registerRestore } from './commands/restore.js';
import { registerRollback } from './commands/rollback.js';
import { registerWipe } from './commands/wipe.js';
import { registerStatus } from './commands/status.js';
import { registerValidate } from './commands/validate.js';
import { registerDoctor } from './commands/doctor.js';
import { registerPreview } from './commands/preview.js';
import { registerSetupMcp } from './commands/setupMcp.js';

const program = new Command()
  .name('agent-forge')
  .version('0.2.0')
  .description('Validate and deploy the Agent Forge VS Code custom-agent roster')
  .option('--repo <path>', 'Path to the Agent Forge repository', process.cwd());

registerValidate(program);
registerDoctor(program);
registerPreview(program);
registerDeploy(program);
registerStatus(program);
registerRollback(program);
registerRestore(program);
registerWipe(program);
registerSetupMcp(program);
program.parseAsync().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
