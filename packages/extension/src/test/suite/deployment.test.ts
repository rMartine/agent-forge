import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { DeploymentService } from '../../services/deploymentService';
import { loadManifest, loadExternalSkillCatalog } from '@agent-forge/core';

export async function runDeploymentTests(): Promise<void> {
  const extensionPath = vscode.extensions.getExtension('agent-forge.agent-forge')!.extensionPath;
  const repo = path.resolve(extensionPath, '..', '..');
  const source = path.join(repo, 'agents', 'graphic-designer.agent.md');
  const before = await readFile(source, 'utf8');
  const plan = await new DeploymentService(repo).preview('codex', true);
  const after = await readFile(source, 'utf8');
  assert.equal(before, after, 'Preview must not rewrite source agents');
  const manifest = await loadManifest(repo);
  const catalog = await loadExternalSkillCatalog(repo, manifest);
  assert.equal(plan.artifacts.filter(item => item.type === 'agent').length, Object.keys(manifest.codex.agents).length);
  assert.equal(plan.artifacts.filter(item => item.type === 'skill' && path.basename(item.targetPath) === 'SKILL.md').length,
    Object.keys(manifest.codex.skillBundles).length + catalog.skills.length + (manifest.codex.productDevelopment ? 1 : 0));
  assert.equal(plan.artifacts.some(item => item.type === 'hook' && item.sharedHooks), true);
  assert.equal(plan.diagnostics.some(item => item.severity === 'error'), false);
}
