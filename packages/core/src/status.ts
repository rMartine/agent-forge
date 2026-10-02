import { access, readFile } from 'node:fs/promises';
import type { FileStatus, RuntimeSelection, RuntimeStatusResult, RuntimeTarget, StatusResult } from './types.js';
import { diagnostic } from './diagnostics.js';
import { hashFile } from './hash.js';
import { loadManifest } from './manifest.js';
import { resolveStatePath } from './paths.js';
import { loadDeploymentState } from './state.js';
import { sharedHooksAreIntact, sharedHooksOwnershipHash } from './sharedHooks.js';

async function exists(filePath: string): Promise<boolean> {
  try { await access(filePath); return true; } catch { return false; }
}

async function runtimeStatus(repoPath: string, runtime: RuntimeTarget): Promise<StatusResult> {
  const manifest = await loadManifest(repoPath);
  const state = await loadDeploymentState(resolveStatePath(manifest.targets.state));
  const activeId = state.activeDeployments[runtime];
  const active = state.deployments.find(item => item.id === activeId && item.runtime === runtime);
  if (!active) return { runtime, syncState: 'not-deployed', files: [], diagnostics: [] };
  const files: FileStatus[] = [];
  for (const item of active.artifacts) {
    let fileState: FileStatus['state'] = 'missing';
    if (await exists(item.targetPath)) {
      if (item.sharedHooks) {
        fileState = sharedHooksAreIntact(await readFile(item.targetPath), item.sharedHooks)
          && sharedHooksOwnershipHash(item.sharedHooks) === item.deployedHash ? 'synced' : 'modified';
      } else fileState = await hashFile(item.targetPath) === item.deployedHash ? 'synced' : 'modified';
    }
    files.push({ id: item.id, path: item.targetPath, type: item.type, runtime, state: fileState });
  }
  const syncState = files.every(item => item.state === 'synced') ? 'synced' : 'out-of-sync';
  return {
    runtime,
    deploymentId: active.id,
    syncState,
    files,
    diagnostics: syncState === 'synced' ? [] : [diagnostic('AF012', 'warning', 'One or more ' + runtime + ' managed artifacts differ from the deployment ledger')],
  };
}

export function status(repoPath: string, runtime: RuntimeTarget = 'vscode'): Promise<StatusResult> {
  return runtimeStatus(repoPath, runtime);
}

export async function getDeploymentStatus(repoPath: string, options: { target?: RuntimeSelection } = {}): Promise<RuntimeStatusResult> {
  const targets: RuntimeTarget[] = options.target === 'all' ? ['vscode', 'codex'] : [options.target ?? 'vscode'];
  const result: RuntimeStatusResult = { targets: {}, diagnostics: [] };
  for (const runtime of targets) {
    const current = await runtimeStatus(repoPath, runtime);
    result.targets[runtime] = current;
    result.diagnostics.push(...current.diagnostics);
  }
  return result;
}
