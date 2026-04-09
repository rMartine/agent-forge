import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { DeployResult, FileOperationDetail, OperationError, FileType } from './types.js';
import { loadManifest } from './manifest.js';
import { resolveTargetPath, resolveRepoFilePath } from './paths.js';
import { hashFile } from './hash.js';

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function copyDirRecursive(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirRecursive(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

export async function deploy(repoPath: string): Promise<DeployResult> {
  const manifest = await loadManifest(repoPath);
  const promptsTarget = resolveTargetPath(manifest.targets.prompts);
  const skillsTarget = resolveTargetPath(manifest.targets.skills);
  const hooksTarget = manifest.targets.hooks ? resolveTargetPath(manifest.targets.hooks) : undefined;

  const details: FileOperationDetail[] = [];
  const errors: OperationError[] = [];
  let deployed = 0;
  let skipped = 0;
  let failed = 0;

  async function deploySingleFile(
    relativePath: string,
    targetDir: string,
    type: FileType,
  ): Promise<void> {
    const fileName = path.basename(relativePath);
    const sourcePath = resolveRepoFilePath(repoPath, relativePath);
    const targetPath = path.join(targetDir, fileName);

    try {
      if (!(await fileExists(sourcePath))) {
        errors.push({ path: relativePath, message: 'Source file not found in repo' });
        failed++;
        return;
      }

      if (await fileExists(targetPath)) {
        const sourceHash = await hashFile(sourcePath);
        const targetHash = await hashFile(targetPath);
        if (sourceHash === targetHash) {
          details.push({ path: relativePath, action: 'skipped', type });
          skipped++;
          return;
        }
      }

      await fs.mkdir(targetDir, { recursive: true });
      await fs.copyFile(sourcePath, targetPath);
      details.push({ path: relativePath, action: 'deployed', type });
      deployed++;
    } catch (err: unknown) {
      errors.push({ path: relativePath, message: (err as Error).message });
      failed++;
    }
  }

  // Agents
  for (const agent of manifest.agents ?? []) {
    await deploySingleFile(agent.file, promptsTarget, 'agent');
  }

  // Instructions
  for (const instruction of manifest.instructions ?? []) {
    await deploySingleFile(instruction.file, promptsTarget, 'instruction');
  }

  // Toolsets
  if (manifest.toolsets) {
    await deploySingleFile(manifest.toolsets.file, promptsTarget, 'toolset');
  }

  // Skills (recursive directory copy)
  for (const skill of manifest.skills ?? []) {
    const dirName = path.basename(skill.dir.replace(/\/$/, ''));
    const sourceDir = resolveRepoFilePath(repoPath, skill.dir);
    const targetDir = path.join(skillsTarget, dirName);

    try {
      if (!(await fileExists(sourceDir))) {
        errors.push({ path: skill.dir, message: 'Source directory not found in repo' });
        failed++;
        continue;
      }

      await copyDirRecursive(sourceDir, targetDir);
      details.push({ path: skill.dir, action: 'deployed', type: 'skill' });
      deployed++;
    } catch (err: unknown) {
      errors.push({ path: skill.dir, message: (err as Error).message });
      failed++;
    }
  }

  // Prompts
  for (const prompt of manifest.prompts ?? []) {
    await deploySingleFile(prompt.file, promptsTarget, 'prompt');
  }

  // Hooks
  if (hooksTarget) {
    for (const hook of manifest.hooks ?? []) {
      await deploySingleFile(hook.file, hooksTarget, 'hook');
    }
  }

  return {
    success: failed === 0,
    summary: { deployed, skipped, failed },
    details,
    errors,
    deployed,
    skipped,
    failed,
  };
}
