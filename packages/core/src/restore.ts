import type { RestoreResult, RuntimeTarget } from './types.js';
import { loadManifest } from './manifest.js';
import { resolveStatePath } from './paths.js';
import { rollbackDeployment } from './transaction.js';

export async function restore(repoPath: string, deploymentId?: string, runtime: RuntimeTarget = 'vscode'): Promise<RestoreResult> {
  const manifest = await loadManifest(repoPath);
  return rollbackDeployment(resolveStatePath(manifest.targets.state), runtime, deploymentId);
}

export async function rollback(repoPath: string, runtime: RuntimeTarget, deploymentId?: string): Promise<RestoreResult> {
  return restore(repoPath, deploymentId, runtime);
}
