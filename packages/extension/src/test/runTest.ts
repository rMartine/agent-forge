import { mkdtemp, rm } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { runTests } from '@vscode/test-electron';

async function main(): Promise<void> {
  const extensionDevelopmentPath = path.resolve(__dirname, '../../..');
  const extensionTestsPath = path.resolve(__dirname, 'suite', 'index');
  const isolatedUserData = await mkdtemp(path.join(os.tmpdir(), 'agent-forge-vscode-test-'));
  const previousUserProfile = process.env.USERPROFILE;
  const previousCodexHome = process.env.CODEX_HOME;
  try {
    process.env.USERPROFILE = isolatedUserData;
    process.env.CODEX_HOME = path.join(isolatedUserData, '.codex');
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
    if (previousUserProfile === undefined) delete process.env.USERPROFILE; else process.env.USERPROFILE = previousUserProfile;
    if (previousCodexHome === undefined) delete process.env.CODEX_HOME; else process.env.CODEX_HOME = previousCodexHome;
    await rm(isolatedUserData, { recursive: true, force: true });
  }
}

void main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
