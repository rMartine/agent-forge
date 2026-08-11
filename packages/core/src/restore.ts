import type { RestoreResult } from './types.js';
import { loadManifest } from './manifest.js';
import { resolveStatePath } from './paths.js';
import { rollbackDeployment } from './transaction.js';

export async function restore(repoPath: string, deploymentId?: string): Promise<RestoreResult> {
  const manifest = await loadManifest(repoPath);
  return rollbackDeployment(resolveStatePath(manifest.targets.state), deploymentId);
}
