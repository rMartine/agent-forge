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
import { registerCleanup } from './commands/cleanup.js';
import { registerReconcile } from './commands/reconcile.js';
import { registerGraphify } from './commands/graphify.js';

const program = new Command()
  .name('agent-forge')
  .version('0.2.0')
  .description('Validate and deploy Agent Forge customizations for VS Code Copilot and OpenAI Codex')
  .option('--repo <path>', 'Path to the Agent Forge repository', process.cwd());

registerValidate(program);
registerDoctor(program);
registerPreview(program);
registerDeploy(program);
registerStatus(program);
registerRollback(program);
registerRestore(program);
registerWipe(program);
registerCleanup(program);
registerReconcile(program);
registerSetupMcp(program);
registerGraphify(program);
program.parseAsync().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
