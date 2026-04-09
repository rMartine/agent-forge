import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { WipeResult, FileOperationDetail, OperationError, FileType } from './types.js';
import { loadManifest } from './manifest.js';
import { resolveTargetPath } from './paths.js';

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function wipe(repoPath: string): Promise<WipeResult> {
  const manifest = await loadManifest(repoPath);
  const promptsTarget = resolveTargetPath(manifest.targets.prompts);
  const skillsTarget = resolveTargetPath(manifest.targets.skills);
  const hooksTarget = manifest.targets.hooks ? resolveTargetPath(manifest.targets.hooks) : undefined;

  const details: FileOperationDetail[] = [];
  const errors: OperationError[] = [];
  let deleted = 0;
  let notFound = 0;

  async function wipeSingleFile(
    relativePath: string,
    targetDir: string,
    type: FileType,
  ): Promise<void> {
    const fileName = path.basename(relativePath);
    const targetPath = path.join(targetDir, fileName);

    try {
      if (await fileExists(targetPath)) {
        await fs.unlink(targetPath);
        details.push({ path: relativePath, action: 'deleted', type });
        deleted++;
      } else {
        details.push({ path: relativePath, action: 'not-found', type });
        notFound++;
      }
    } catch (err: unknown) {
      errors.push({ path: relativePath, message: (err as Error).message });
    }
  }

  // Wipe agents
  for (const agent of manifest.agents ?? []) {
    await wipeSingleFile(agent.file, promptsTarget, 'agent');
  }

  // Wipe instructions
  for (const instruction of manifest.instructions ?? []) {
    await wipeSingleFile(instruction.file, promptsTarget, 'instruction');
  }

  // Wipe toolsets
  if (manifest.toolsets) {
    await wipeSingleFile(manifest.toolsets.file, promptsTarget, 'toolset');
  }

  // Wipe skills (recursive directory delete)
  for (const skill of manifest.skills ?? []) {
    const dirName = path.basename(skill.dir.replace(/\/$/, ''));
    const targetDir = path.join(skillsTarget, dirName);

    try {
      if (await fileExists(targetDir)) {
        await fs.rm(targetDir, { recursive: true });
        details.push({ path: skill.dir, action: 'deleted', type: 'skill' });
        deleted++;
      } else {
        details.push({ path: skill.dir, action: 'not-found', type: 'skill' });
        notFound++;
      }
    } catch (err: unknown) {
      errors.push({ path: skill.dir, message: (err as Error).message });
    }
  }

  // Wipe prompts
  for (const prompt of manifest.prompts ?? []) {
    await wipeSingleFile(prompt.file, promptsTarget, 'prompt');
  }

  // Wipe hooks
  if (hooksTarget) {
    for (const hook of manifest.hooks ?? []) {
      await wipeSingleFile(hook.file, hooksTarget, 'hook');
    }
  }

  return {
    success: errors.length === 0,
    summary: { deleted, notFound },
    details,
    errors,
    deleted,
    notFound,
  };
}
