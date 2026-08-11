import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import type { DeploymentState } from './types.js';

export function emptyDeploymentState(): DeploymentState {
  return { schemaVersion: 1, deployments: [] };
}

export async function loadDeploymentState(statePath: string): Promise<DeploymentState> {
  try {
    const parsed = JSON.parse(await readFile(statePath, 'utf8')) as DeploymentState;
    if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.deployments)) throw new Error('Unsupported state schema');
    return parsed;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return emptyDeploymentState();
    throw error;
  }
}

export async function saveDeploymentState(statePath: string, state: DeploymentState): Promise<void> {
  await mkdir(path.dirname(statePath), { recursive: true });
  const temporary = `${statePath}.tmp`;
  await writeFile(temporary, JSON.stringify(state, null, 2), 'utf8');
  await rename(temporary, statePath);
}

export function deploymentStoragePath(statePath: string, deploymentId: string): string {
  return path.join(path.dirname(statePath), 'deployments', deploymentId);
}
