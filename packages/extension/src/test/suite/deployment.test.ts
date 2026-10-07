import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { DeploymentService } from '../../services/deploymentService';
import { loadRosterCatalog } from '@agent-forge/core';

export async function runDeploymentTests(): Promise<void> {
  const extensionPath = vscode.extensions.getExtension('agent-forge.agent-forge')!.extensionPath;
  const repo = path.resolve(extensionPath, '..', '..');
  const source = path.join(repo, 'rosters', 'development', 'principal-engineer.md');
  const before = await readFile(source, 'utf8');
  const plan = await new DeploymentService(repo).preview('codex', true);
  const after = await readFile(source, 'utf8');
  assert.equal(before, after, 'Preview must not rewrite source agents');
  const catalog = await loadRosterCatalog(repo);
  assert.equal(plan.artifacts.filter(item => item.type === 'agent').length, catalog.agents.length);
  assert.equal(plan.artifacts.filter(item => item.type === 'skill' && path.basename(item.targetPath) === 'SKILL.md').length,
    new Set(catalog.resources.filter(item=>item.kind==='skill').map(item=>item.relativePath.split('/')[0])).size);
  assert.equal(plan.artifacts.some(item => item.type === 'hook' && item.sharedHooks), true);
  assert.equal(plan.diagnostics.some(item => item.severity === 'error'), false);
}
