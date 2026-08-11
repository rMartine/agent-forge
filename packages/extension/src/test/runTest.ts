import { mkdtemp, rm } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { runTests } from '@vscode/test-electron';

async function main(): Promise<void> {
  const extensionDevelopmentPath = path.resolve(__dirname, '../../..');
  const extensionTestsPath = path.resolve(__dirname, 'suite', 'index');
  const isolatedUserData = await mkdtemp(path.join(os.tmpdir(), 'agent-forge-vscode-test-'));
  try {
    await runTests({
      version: '1.104.0',
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        '--disable-extensions',
        '--disable-workspace-trust',
        '--user-data-dir', isolatedUserData,
        path.resolve(extensionDevelopmentPath, '..', '..'),
      ],
    });
  } finally {
    await rm(isolatedUserData, { recursive: true, force: true });
  }
}

void main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
