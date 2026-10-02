import { randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { access, mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { promisify } from 'node:util';
import type {
  ArtifactType,
  CleanupAction,
  DeploymentArtifact,
  DeploymentPlan,
  Diagnostic,
  RuntimeSelection,
  RuntimeTarget,
} from './types.js';
import { hashBuffer, hashFile } from './hash.js';
import { loadManifest } from './manifest.js';
import { resolveRepoFilePath, resolveStatePath, resolveTargetPath } from './paths.js';
import { loadCapabilityCatalog, resolveAgentCapabilities } from './capabilities.js';
import { loadModelPolicy, resolveAgentModel } from './models.js';
import { renderVsCodeAgent } from './renderVsCode.js';
import { renderCodexAgent } from './renderCodex.js';
import { renderCodexSkillBundle } from './skillBundles.js';
import { validateRoster } from './validation.js';
import { diagnostic } from './diagnostics.js';
import { deploymentPlanPath, loadDeploymentState } from './state.js';
import { loadExternalSkillCatalog, resolveExternalSkillFiles } from './externalSkills.js';
import { renderProductDevelopmentSkill, productDevelopmentHookGroups } from './productDevelopment.js';
import { prepareSharedHooks } from './sharedHooks.js';

const execFileAsync = promisify(execFile);

async function exists(filePath: string): Promise<boolean> {
  try { await access(filePath); return true; } catch { return false; }
}

export interface DeploymentPlanOptions {
  target?: RuntimeSelection;
  availableTools?: string[];
  availableModels?: string[];
  strictCapabilities?: boolean;
  downloadSkills?: boolean;
}

function selectedTargets(target: RuntimeSelection = 'vscode'): RuntimeTarget[] {
  return target === 'all' ? ['vscode', 'codex'] : [target];
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
  runtime: RuntimeTarget,
  id: string,
  type: ArtifactType,
  sourcePath: string,
  targetPath: string,
  content: Buffer,
): DeploymentArtifact {
  return { runtime, id, type, sourcePath, targetPath, content, sourceHash: hashBuffer(content) };
}

async function readNormalizedText(filePath: string): Promise<Buffer> {
  const normalized = (await readFile(filePath, 'utf8')).replace(/\r\n/g, '\n');
  return Buffer.from(normalized.endsWith('\n') ? `${normalized.slice(0, -1)}\r\n` : normalized);
}

async function sourceCommit(repoPath: string): Promise<string | undefined> {
  try {
    const result = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: repoPath, windowsHide: true, timeout: 5_000 });
    return result.stdout.trim();
  } catch { return undefined; }
}

export async function createDeploymentPlan(
  repoPath: string,
  options: DeploymentPlanOptions = {},
): Promise<DeploymentPlan> {
  const manifest = await loadManifest(repoPath);
  const targets = selectedTargets(options.target);
  const catalog = await loadCapabilityCatalog(repoPath, manifest.capabilityCatalog);
  const models = await loadModelPolicy(repoPath, manifest.modelProfiles);
  const validation = await validateRoster(repoPath, manifest, catalog, { target: options.target ?? 'vscode' });
  const diagnostics: Diagnostic[] = [...validation.diagnostics];
  const artifacts: DeploymentArtifact[] = [];
  const statePath = resolveStatePath(manifest.targets.state);
  const state = await loadDeploymentState(statePath);

  if (targets.includes('vscode')) {
    const agentTarget = resolveTargetPath(manifest.targets.vscode.agents);
    const instructionTarget = resolveTargetPath(manifest.targets.vscode.instructions);
    const skillTarget = resolveTargetPath(manifest.targets.vscode.skills);
    const hookTarget = resolveTargetPath(manifest.targets.vscode.hooks);

    for (const agent of Object.values(manifest.agents)) {
      const sourcePath = resolveRepoFilePath(repoPath, agent.source);
      const runtime = resolveAgentCapabilities(agent, catalog, options.availableTools);
      runtime.model = resolveAgentModel(agent, models, options.availableModels);
      if ((models.profiles[agent.modelProfile] ?? []).length > 0 && !runtime.model) {
        diagnostics.push(diagnostic('AF011', 'warning', `Configured ${agent.modelProfile} models are unavailable; deployment will inherit the current model`, { agentId: agent.id }));
      }
      for (const capability of runtime.missingRequiredCapabilities) {
        diagnostics.push(diagnostic('AF004', options.strictCapabilities ? 'error' : 'warning', `Required capability "${capability}" is unavailable`, { agentId: agent.id }));
      }
      for (const capability of runtime.missingOptionalCapabilities) {
        diagnostics.push(diagnostic('AF004', 'warning', `Optional capability "${capability}" is unavailable`, { agentId: agent.id }));
      }
      const rendered = Buffer.from(renderVsCodeAgent(await readFile(sourcePath, 'utf8'), agent, runtime));
      artifacts.push(artifact('vscode', agent.id, 'agent', sourcePath, path.join(agentTarget, path.basename(agent.source)), rendered));
    }

    for (const instruction of manifest.instructions) {
      const sourcePath = resolveRepoFilePath(repoPath, instruction.source);
      artifacts.push(artifact('vscode', instruction.id, 'instruction', sourcePath, path.join(instructionTarget, path.basename(sourcePath)), await readNormalizedText(sourcePath)));
    }
    for (const hook of manifest.hooks) {
      const sourcePath = resolveRepoFilePath(repoPath, hook.source);
      artifacts.push(artifact('vscode', hook.id, 'hook', sourcePath, path.join(hookTarget, path.basename(sourcePath)), await readNormalizedText(sourcePath)));
    }
    for (const skill of manifest.skills) {
      const sourceRoot = resolveRepoFilePath(repoPath, skill.source);
      for (const sourcePath of await collectFiles(sourceRoot)) {
        const relative = path.relative(sourceRoot, sourcePath);
        artifacts.push(artifact('vscode', `${skill.id}/${relative.replaceAll('\\', '/')}`, 'skill', sourcePath, path.join(skillTarget, skill.id, relative), await readNormalizedText(sourcePath)));
      }
    }
  }

  if (targets.includes('codex')) {
    const agentTarget = resolveTargetPath(manifest.targets.codex.agents);
    const skillTarget = resolveTargetPath(manifest.targets.codex.skills);
    const externalSkills = await loadExternalSkillCatalog(repoPath, manifest);
    for (const agent of Object.values(manifest.codex.agents)) {
      const source = manifest.agents[agent.sourceAgent];
      const sourcePath = resolveRepoFilePath(repoPath, source.source);
      const skillNames = externalSkills.skills.filter(skill => skill.agentIds.includes(agent.id)).map(skill => skill.deploymentName);
      const rendered = Buffer.from(renderCodexAgent(await readFile(sourcePath, 'utf8'), agent, manifest, skillNames));
      artifacts.push(artifact('codex', agent.id, 'agent', sourcePath, path.join(agentTarget, `${agent.id}.toml`), rendered));
    }
    for (const bundle of Object.values(manifest.codex.skillBundles)) {
      for (const rendered of await renderCodexSkillBundle(repoPath, manifest, bundle)) {
        artifacts.push(artifact('codex', `${bundle.id}/${rendered.relativePath.replaceAll('\\', '/')}`, 'skill', rendered.sourcePath, path.join(skillTarget, bundle.deploymentName, rendered.relativePath), rendered.content));
      }
    }
    for (const skill of externalSkills.skills) {
      for (const rendered of await resolveExternalSkillFiles(repoPath, skill, options.downloadSkills)) {
        artifacts.push(artifact('codex', `${skill.deploymentName}/${rendered.relativePath.replaceAll('\\', '/')}`, 'skill', rendered.sourcePath, path.join(skillTarget, skill.deploymentName, rendered.relativePath), rendered.content));
      }
    }
    const product = manifest.codex.productDevelopment;
    if (product) {
      for (const rendered of await renderProductDevelopmentSkill(repoPath, manifest, externalSkills)) {
        artifacts.push(artifact('codex', `${product.deploymentName}/${rendered.relativePath.replaceAll('\\', '/')}`, 'skill', rendered.sourcePath, path.join(skillTarget, product.deploymentName, rendered.relativePath), rendered.content));
      }
      const hookTarget = resolveTargetPath(product.hooksTarget);
      const active = state.deployments.find(item => item.id === state.activeDeployments.codex && item.runtime === 'codex');
      const previous = active?.artifacts.find(item => path.resolve(item.targetPath).toLowerCase() === path.resolve(hookTarget).toLowerCase());
      try {
        const before = await exists(hookTarget) ? await readFile(hookTarget) : undefined;
        const prepared = prepareSharedHooks(before, productDevelopmentHookGroups(manifest, skillTarget), previous?.sharedHooks);
        artifacts.push({ ...artifact('codex', 'agent-forge-product-hooks', 'hook', resolveRepoFilePath(repoPath, product.hooksSource), hookTarget, prepared.content), sharedHooks: prepared.sharedHooks });
      } catch (error: unknown) {
        diagnostics.push(diagnostic('AF012', 'error', `Cannot safely prepare shared hooks: ${(error as Error).message}`, { path: hookTarget }));
      }
    }
  }

  const managedPaths = new Map<string, string>();
  for (const runtime of targets) {
    const activeId = state.activeDeployments[runtime];
    const active = state.deployments.find(item => item.id === activeId && item.runtime === runtime);
    for (const item of active?.artifacts ?? []) managedPaths.set(path.resolve(item.targetPath).toLowerCase(), item.deployedHash);
  }
  for (const item of artifacts) {
    if (item.sharedHooks) continue;
    if (!(await exists(item.targetPath))) continue;
    const expected = managedPaths.get(path.resolve(item.targetPath).toLowerCase());
    if (!expected) diagnostics.push(diagnostic('AF009', 'error', 'Target collides with an unmanaged customization', { path: item.targetPath }));
    else if (await hashFile(item.targetPath) !== expected) diagnostics.push(diagnostic('AF012', 'error', 'Managed target was modified after deployment', { path: item.targetPath }));
  }
  const plannedPaths = new Set(artifacts.map(item => path.resolve(item.targetPath).toLowerCase()));
  const cleanupActions: CleanupAction[] = [];
  for (const runtime of targets) {
    const activeId = state.activeDeployments[runtime];
    const active = state.deployments.find(item => item.id === activeId && item.runtime === runtime);
    for (const item of active?.artifacts ?? []) {
      if (!plannedPaths.has(path.resolve(item.targetPath).toLowerCase())) {
        cleanupActions.push({ runtime, targetPath: item.targetPath, expectedHash: item.deployedHash, type: item.type, reason: 'stale-managed', ...(item.sharedHooks ? { sharedHooks: item.sharedHooks } : {}) });
      }
    }
  }

  const deploymentId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomBytes(3).toString('hex')}`;
  return {
    deploymentId,
    repoPath,
    createdAt: new Date().toISOString(),
    targets,
    sourceCommit: await sourceCommit(repoPath),
    artifacts,
    cleanupActions,
    diagnostics,
  };
}

interface SerializedPlan extends Omit<DeploymentPlan, 'artifacts'> {
  artifacts: Array<Omit<DeploymentArtifact, 'content'> & { contentBase64?: string }>;
}

export async function saveDeploymentPlan(plan: DeploymentPlan, statePath: string): Promise<string> {
  const filePath = deploymentPlanPath(statePath, plan.deploymentId);
  const serialized: SerializedPlan = {
    ...plan,
    artifacts: plan.artifacts.map(({ content, ...item }) => ({ ...item, contentBase64: content?.toString('base64') })),
  };
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp`;
  await writeFile(temporary, JSON.stringify(serialized, null, 2), 'utf8');
  await rename(temporary, filePath);
  return filePath;
}

export async function loadDeploymentPlan(statePath: string, planId: string): Promise<DeploymentPlan> {
  const serialized = JSON.parse(await readFile(deploymentPlanPath(statePath, planId), 'utf8')) as SerializedPlan;
  if (serialized.deploymentId !== planId) throw new Error('AF012: immutable deployment plan ID mismatch');
  return {
    ...serialized,
    artifacts: serialized.artifacts.map(({ contentBase64, ...item }) => ({ ...item, content: contentBase64 !== undefined ? Buffer.from(contentBase64, 'base64') : undefined })),
  };
}
