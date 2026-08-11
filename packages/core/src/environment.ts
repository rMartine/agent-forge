import { execFile } from 'node:child_process';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { diagnostic } from './diagnostics.js';
import type { DeploymentTargets, VsCodeEnvironment } from './types.js';

const execFileAsync = promisify(execFile);

function list(value: string | undefined): string[] {
  return value ? value.split(',').map(item => item.trim()).filter(Boolean) : [];
}

export function isSupportedVsCodeVersion(version: string): boolean {
  const match = version.match(/^(\d+)\.(\d+)/);
  if (!match) return false;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  return major > 1 || (major === 1 && minor >= 104);
}

export async function discoverVsCodeEnvironment(options: {
  codeCommand?: string;
  env?: NodeJS.ProcessEnv;
} = {}): Promise<VsCodeEnvironment> {
  const env = options.env ?? process.env;
  const userProfile = env.USERPROFILE || env.HOME || os.homedir();
  let version = env.AGENT_FORGE_VSCODE_VERSION;
  if (!version) {
    try {
      const result = await execFileAsync(options.codeCommand ?? 'code', ['--version'], { timeout: 8_000, windowsHide: true, env });
      version = result.stdout.trim().split(/\r?\n/)[0];
    } catch {
      version = undefined;
    }
  }
  const diagnostics = version && isSupportedVsCodeVersion(version)
    ? []
    : [diagnostic('AF010', 'error', version ? `VS Code ${version} is unsupported; 1.104.0 or later is required` : 'VS Code CLI was not detected; version support cannot be validated')];
  const targets: DeploymentTargets = {
    agents: path.join(userProfile, '.copilot', 'agents'),
    skills: path.join(userProfile, '.copilot', 'skills'),
    instructions: path.join(userProfile, '.copilot', 'instructions'),
    hooks: path.join(userProfile, '.copilot', 'hooks'),
    state: path.join(userProfile, '.agent-forge', 'state.json'),
  };
  return {
    supported: diagnostics.length === 0,
    version,
    userProfile,
    availableTools: list(env.AGENT_FORGE_AVAILABLE_TOOLS),
    availableModels: list(env.AGENT_FORGE_AVAILABLE_MODELS),
    targets,
    diagnostics,
  };
}
