import type { RuntimeTarget, WipeResult } from './types.js';
import { loadManifest } from './manifest.js';
import { resolveStatePath } from './paths.js';
import { removeManagedDeployment } from './transaction.js';

export async function wipe(repoPath: string, runtime: RuntimeTarget = 'vscode'): Promise<WipeResult> {
  const manifest = await loadManifest(repoPath);
  return removeManagedDeployment(resolveStatePath(manifest.targets.state), runtime);
}
