import { access } from 'node:fs/promises';
import type { FileStatus, StatusResult } from './types.js';
import { diagnostic } from './diagnostics.js';
import { hashFile } from './hash.js';
import { loadManifest } from './manifest.js';
import { resolveStatePath } from './paths.js';
import { loadDeploymentState } from './state.js';

async function exists(filePath: string): Promise<boolean> {
  try { await access(filePath); return true; } catch { return false; }
}

export async function status(repoPath: string): Promise<StatusResult> {
  const manifest = await loadManifest(repoPath);
  const statePath = resolveStatePath(manifest.targets.state);
  const state = await loadDeploymentState(statePath);
  const active = state.deployments.find(item => item.id === state.activeDeploymentId);
  if (!active) return { syncState: 'not-deployed', files: [], diagnostics: [] };
  const files: FileStatus[] = [];
  for (const item of active.artifacts) {
    let fileState: FileStatus['state'] = 'missing';
    if (await exists(item.targetPath)) fileState = await hashFile(item.targetPath) === item.deployedHash ? 'synced' : 'modified';
    files.push({ id: item.id, path: item.targetPath, type: item.type, state: fileState });
  }
  const syncState = files.every(item => item.state === 'synced') ? 'synced' : 'out-of-sync';
  return {
    deploymentId: active.id,
    syncState,
    files,
    diagnostics: syncState === 'synced' ? [] : [diagnostic('AF012', 'warning', 'One or more managed artifacts differ from the deployment ledger')],
  };
}
