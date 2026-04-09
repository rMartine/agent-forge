import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import simpleGit from 'simple-git';
import type { RestoreResult, FileOperationDetail, OperationError, FileType } from './types.js';
import { loadManifest } from './manifest.js';
import { resolveTargetPath } from './paths.js';
import { hashBuffer, hashFile } from './hash.js';
import { GitOperationError } from './errors.js';

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function restore(repoPath: string): Promise<RestoreResult> {
  const manifest = await loadManifest(repoPath);
  const promptsTarget = resolveTargetPath(manifest.targets.prompts);
  const skillsTarget = resolveTargetPath(manifest.targets.skills);
  const hooksTarget = manifest.targets.hooks ? resolveTargetPath(manifest.targets.hooks) : undefined;
  const git = simpleGit(repoPath);

  // Verify repo has commits
  try {
    await git.log({ maxCount: 1 });
  } catch {
    throw new GitOperationError('Repository has no commits');
  }

  const details: FileOperationDetail[] = [];
  const errors: OperationError[] = [];
  let restored = 0;
  let recreated = 0;
  let alreadyMatching = 0;

  async function restoreSingleFile(
    relativePath: string,
    targetDir: string,
    type: FileType,
  ): Promise<void> {
    const fileName = path.basename(relativePath);
    const targetPath = path.join(targetDir, fileName);

    try {
      // Retrieve the committed version via git show
      const committed = await git.show([`HEAD:${relativePath}`]);
      const committedBuffer = Buffer.from(committed);
      const committedHash = hashBuffer(committedBuffer);

      const targetPresent = await fileExists(targetPath);

      if (targetPresent) {
        const targetHash = await hashFile(targetPath);
        if (committedHash === targetHash) {
          details.push({ path: relativePath, action: 'already-matching', type });
          alreadyMatching++;
          return;
        }
      }

      await fs.mkdir(targetDir, { recursive: true });
      await fs.writeFile(targetPath, committedBuffer);

      if (targetPresent) {
        details.push({ path: relativePath, action: 'restored', type });
        restored++;
      } else {
        details.push({ path: relativePath, action: 'recreated', type });
        recreated++;
      }
    } catch (err: unknown) {
      errors.push({ path: relativePath, message: (err as Error).message });
    }
  }

  // Restore agents
  for (const agent of manifest.agents ?? []) {
    await restoreSingleFile(agent.file, promptsTarget, 'agent');
  }

  // Restore instructions
  for (const instruction of manifest.instructions ?? []) {
    await restoreSingleFile(instruction.file, promptsTarget, 'instruction');
  }

  // Restore toolsets
  if (manifest.toolsets) {
    await restoreSingleFile(manifest.toolsets.file, promptsTarget, 'toolset');
  }

  // Restore skills — enumerate files in the skill directory from Git
  for (const skill of manifest.skills ?? []) {
    const dirName = path.basename(skill.dir.replace(/\/$/, ''));
    const targetDir = path.join(skillsTarget, dirName);

    try {
      const lsOutput = await git.raw(['ls-tree', '-r', '--name-only', 'HEAD', skill.dir]);
      const files = lsOutput.trim().split('\n').filter(f => f.length > 0);

      for (const file of files) {
        const committed = await git.show([`HEAD:${file}`]);
        const committedBuffer = Buffer.from(committed);

        const relativeToSkill = path.relative(skill.dir.replace(/\/$/, ''), file);
        const targetPath = path.join(targetDir, relativeToSkill);

        await fs.mkdir(path.dirname(targetPath), { recursive: true });

        if (await fileExists(targetPath)) {
          const targetHash = await hashFile(targetPath);
          const committedHash = hashBuffer(committedBuffer);
          if (committedHash === targetHash) {
            continue;
          }
        }

        await fs.writeFile(targetPath, committedBuffer);
      }

      details.push({ path: skill.dir, action: 'restored', type: 'skill' });
      restored++;
    } catch (err: unknown) {
      errors.push({ path: skill.dir, message: (err as Error).message });
    }
  }

  // Restore prompts
  for (const prompt of manifest.prompts ?? []) {
    await restoreSingleFile(prompt.file, promptsTarget, 'prompt');
  }

  // Restore hooks
  if (hooksTarget) {
    for (const hook of manifest.hooks ?? []) {
      await restoreSingleFile(hook.file, hooksTarget, 'hook');
    }
  }

  return {
    success: errors.length === 0,
    summary: { restored, recreated, alreadyMatching },
    details,
    errors,
    restored,
    recreated,
    alreadyMatching,
  };
}
