import { randomBytes } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import * as path from 'node:path';
import type {
  ArtifactType,
  DeploymentArtifact,
  DeploymentPlan,
  Diagnostic,
} from './types.js';
import { hashBuffer } from './hash.js';
import { loadManifest } from './manifest.js';
import { resolveRepoFilePath, resolveTargetPath } from './paths.js';
import { loadCapabilityCatalog, resolveAgentCapabilities } from './capabilities.js';
import { loadModelPolicy, resolveAgentModel } from './models.js';
import { renderAgent } from './render.js';
import { validateRoster } from './validation.js';
import { diagnostic } from './diagnostics.js';

export interface DeploymentPlanOptions {
  availableTools?: string[];
  availableModels?: string[];
  strictCapabilities?: boolean;
}

async function collectFiles(directory: string): Promise<string[]> {
  const files: string[] = [];
  async function visit(current: string): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(full);
      else files.push(full);
    }
  }
  await visit(directory);
  return files.sort();
}

function artifact(
  id: string,
  type: ArtifactType,
  sourcePath: string,
  targetPath: string,
  content: Buffer,
): DeploymentArtifact {
  return { id, type, sourcePath, targetPath, content, sourceHash: hashBuffer(content) };
}

export async function createDeploymentPlan(
  repoPath: string,
  options: DeploymentPlanOptions = {},
): Promise<DeploymentPlan> {
  const manifest = await loadManifest(repoPath);
  const catalog = await loadCapabilityCatalog(repoPath, manifest.capabilityCatalog);
  const models = await loadModelPolicy(repoPath, manifest.modelProfiles);
  const validation = await validateRoster(repoPath, manifest, catalog);
  const diagnostics: Diagnostic[] = [...validation.diagnostics];
  const artifacts: DeploymentArtifact[] = [];
  const agentTarget = resolveTargetPath(manifest.targets.agents);
  const instructionTarget = resolveTargetPath(manifest.targets.instructions);
  const skillTarget = resolveTargetPath(manifest.targets.skills);
  const hookTarget = resolveTargetPath(manifest.targets.hooks);

  for (const agent of Object.values(manifest.agents)) {
    const sourcePath = resolveRepoFilePath(repoPath, agent.source);
    const runtime = resolveAgentCapabilities(agent, catalog, options.availableTools);
    runtime.model = resolveAgentModel(agent, models, options.availableModels);
    for (const capability of runtime.missingRequiredCapabilities) {
      diagnostics.push(diagnostic('AF004', options.strictCapabilities ? 'error' : 'warning', `Required capability "${capability}" is unavailable`, { agentId: agent.id }));
    }
    for (const capability of runtime.missingOptionalCapabilities) {
      diagnostics.push(diagnostic('AF004', 'warning', `Optional capability "${capability}" is unavailable`, { agentId: agent.id }));
    }
    const rendered = Buffer.from(renderAgent(await readFile(sourcePath, 'utf8'), agent, runtime));
    artifacts.push(artifact(agent.id, 'agent', sourcePath, path.join(agentTarget, path.basename(agent.source)), rendered));
  }

  for (const instruction of manifest.instructions) {
    const sourcePath = resolveRepoFilePath(repoPath, instruction.source);
    const content = await readFile(sourcePath);
    artifacts.push(artifact(instruction.id, 'instruction', sourcePath, path.join(instructionTarget, path.basename(sourcePath)), content));
  }
  for (const hook of manifest.hooks) {
    const sourcePath = resolveRepoFilePath(repoPath, hook.source);
    const content = await readFile(sourcePath);
    artifacts.push(artifact(hook.id, 'hook', sourcePath, path.join(hookTarget, path.basename(sourcePath)), content));
  }
  for (const skill of manifest.skills) {
    const sourceRoot = resolveRepoFilePath(repoPath, skill.source);
    for (const sourcePath of await collectFiles(sourceRoot)) {
      const relative = path.relative(sourceRoot, sourcePath);
      const content = await readFile(sourcePath);
      artifacts.push(artifact(`${skill.id}/${relative.replaceAll('\\', '/')}`, 'skill', sourcePath, path.join(skillTarget, skill.id, relative), content));
    }
  }

  const deploymentId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomBytes(3).toString('hex')}`;
  return { deploymentId, repoPath, createdAt: new Date().toISOString(), artifacts, diagnostics };
}
