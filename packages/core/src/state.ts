import { constants } from 'node:fs';
import { copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import type { DeploymentState, DeploymentStateV2, RuntimeDeploymentRecord } from './types.js';

interface DeploymentStateV1 {
  schemaVersion: 1;
  activeDeploymentId?: string;
  deployments: Array<Omit<RuntimeDeploymentRecord, 'runtime' | 'artifacts'> & {
    artifacts: Array<Omit<RuntimeDeploymentRecord['artifacts'][number], 'runtime'>>;
  }>;
}

const pendingMigrationBackups = new Set<string>();

export function emptyDeploymentState(): DeploymentStateV2 {
  return { schemaVersion: 2, activeDeployments: {}, deployments: [] };
}

function migrateV1(statePath: string, legacy: DeploymentStateV1): DeploymentStateV2 {
  const unsafe = legacy.deployments.flatMap(record => record.artifacts).find(item => {
    const normalized = path.resolve(item.targetPath).toLowerCase();
    return !normalized.includes(`${path.sep}.copilot${path.sep}`);
  });
  if (unsafe) throw new Error(`AF012: cannot infer runtime for legacy managed path ${unsafe.targetPath}`);
  pendingMigrationBackups.add(path.resolve(statePath));
  return {
    schemaVersion: 2,
    activeDeployments: legacy.activeDeploymentId ? { vscode: legacy.activeDeploymentId } : {},
    deployments: legacy.deployments.map(record => ({
      ...record,
      runtime: 'vscode',
      artifacts: record.artifacts.map(artifact => ({ ...artifact, runtime: 'vscode' })),
    })),
  };
}

export async function loadDeploymentState(statePath: string): Promise<DeploymentState> {
  try {
    const parsed = JSON.parse(await readFile(statePath, 'utf8')) as DeploymentState | DeploymentStateV1;
    if (parsed.schemaVersion === 1) return migrateV1(statePath, parsed as DeploymentStateV1);
    if (parsed.schemaVersion !== 2 || !Array.isArray(parsed.deployments) || typeof parsed.activeDeployments !== 'object') {
      throw new Error('AF012: unsupported deployment state schema');
    }
    return parsed;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return emptyDeploymentState();
    throw error;
  }
}

export async function saveDeploymentState(statePath: string, state: DeploymentState): Promise<void> {
  await mkdir(path.dirname(statePath), { recursive: true });
  const resolved = path.resolve(statePath);
  if (pendingMigrationBackups.has(resolved)) {
    try { await copyFile(statePath, path.join(path.dirname(statePath), 'state.v1.backup.json'), constants.COPYFILE_EXCL); }
    catch (error: unknown) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
  }
  const temporary = `${statePath}.tmp`;
  await writeFile(temporary, JSON.stringify(state, null, 2), 'utf8');
  await rename(temporary, statePath);
  pendingMigrationBackups.delete(resolved);
}

export function deploymentStoragePath(statePath: string, deploymentId: string): string {
  return path.join(path.dirname(statePath), 'deployments', deploymentId);
}

export function deploymentPlanPath(statePath: string, planId: string): string {
  return path.join(path.dirname(statePath), 'plans', `${planId}.json`);
}
