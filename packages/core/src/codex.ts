import * as os from 'node:os';
import * as path from 'node:path';
import { access } from 'node:fs/promises';
import type { CodexEnvironment } from './types.js';
import { diagnostic } from './diagnostics.js';

async function exists(filePath: string): Promise<boolean> {
  try { await access(filePath); return true; } catch { return false; }
}

export async function discoverCodexEnvironment(options: { env?: NodeJS.ProcessEnv } = {}): Promise<CodexEnvironment> {
  const env = options.env ?? process.env;
  const userProfile = env.USERPROFILE || env.HOME || os.homedir();
  const codexHome = env.CODEX_HOME || path.join(userProfile, '.codex');
  const integrationDetected = await exists(codexHome);
  return {
    supported: integrationDetected,
    userProfile,
    codexHome,
    agentsTarget: path.join(codexHome, 'agents'),
    skillsTarget: path.join(userProfile, '.agents', 'skills'),
    integrationDetected,
    diagnostics: integrationDetected ? [] : [diagnostic('AF010', 'error', 'OpenAI Codex integration was not detected for this user profile')],
  };
}
