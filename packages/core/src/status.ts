import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { StatusResult, FileStatus, FileType } from './types.js';
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

async function getFileStatus(
  repoPath: string,
  relativePath: string,
  targetDir: string,
  type: FileType,
): Promise<FileStatus> {
  const fileName = path.basename(relativePath);
  const sourcePath = resolveRepoFilePath(repoPath, relativePath);
  const targetPath = path.join(targetDir, fileName);

  const sourcePresent = await fileExists(sourcePath);
  const targetPresent = await fileExists(targetPath);

  if (!sourcePresent) {
    return { path: relativePath, state: 'missing-from-repo', type };
  }

  if (!targetPresent) {
    return { path: relativePath, state: 'missing-locally', type };
  }

  const sourceHash = await hashFile(sourcePath);
  const targetHash = await hashFile(targetPath);
  return {
    path: relativePath,
    state: sourceHash === targetHash ? 'synced' : 'modified',
    type,
  };
}

async function scanForUntracked(
  targetDir: string,
  managedNames: Set<string>,
  type: FileType,
  patterns: RegExp[],
): Promise<FileStatus[]> {
  const untracked: FileStatus[] = [];

  try {
    const entries = await fs.readdir(targetDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile()) {
        const matches = patterns.some(p => p.test(entry.name));
        if (matches && !managedNames.has(entry.name)) {
          untracked.push({ path: entry.name, state: 'untracked', type });
        }
      }
    }
  } catch {
    // Target directory may not exist yet
  }

  return untracked;
}

export async function status(repoPath: string): Promise<StatusResult> {
  const manifest = await loadManifest(repoPath);
  const promptsTarget = resolveTargetPath(manifest.targets.prompts);
  const skillsTarget = resolveTargetPath(manifest.targets.skills);
  const hooksTarget = manifest.targets.hooks ? resolveTargetPath(manifest.targets.hooks) : undefined;

  const agents: FileStatus[] = [];
  const instructions: FileStatus[] = [];
  const skills: FileStatus[] = [];
  const toolsets: FileStatus[] = [];
  const prompts: FileStatus[] = [];
  const hooks: FileStatus[] = [];

  // --- Managed files --------------------------------------------------

  const managedAgentNames = new Set<string>();
  for (const agent of manifest.agents ?? []) {
    managedAgentNames.add(path.basename(agent.file));
    agents.push(await getFileStatus(repoPath, agent.file, promptsTarget, 'agent'));
  }

  const managedInstructionNames = new Set<string>();
  for (const instruction of manifest.instructions ?? []) {
    managedInstructionNames.add(path.basename(instruction.file));
    instructions.push(
      await getFileStatus(repoPath, instruction.file, promptsTarget, 'instruction'),
    );
  }

  const managedToolsetNames = new Set<string>();
  if (manifest.toolsets) {
    managedToolsetNames.add(path.basename(manifest.toolsets.file));
    toolsets.push(
      await getFileStatus(repoPath, manifest.toolsets.file, promptsTarget, 'toolset'),
    );
  }

  // Skills — compare SKILL.md as a proxy for the whole directory
  const managedSkillDirNames = new Set<string>();
  for (const skill of manifest.skills ?? []) {
    const dirName = path.basename(skill.dir.replace(/\/$/, ''));
    managedSkillDirNames.add(dirName);

    const sourceDir = resolveRepoFilePath(repoPath, skill.dir);
    const targetDir = path.join(skillsTarget, dirName);

    const sourcePresent = await fileExists(sourceDir);
    const targetPresent = await fileExists(targetDir);

    if (!sourcePresent) {
      skills.push({ path: skill.dir, state: 'missing-from-repo', type: 'skill' });
    } else if (!targetPresent) {
      skills.push({ path: skill.dir, state: 'missing-locally', type: 'skill' });
    } else {
      const skillMdSource = path.join(sourceDir, 'SKILL.md');
      const skillMdTarget = path.join(targetDir, 'SKILL.md');

      if ((await fileExists(skillMdSource)) && (await fileExists(skillMdTarget))) {
        const srcHash = await hashFile(skillMdSource);
        const tgtHash = await hashFile(skillMdTarget);
        skills.push({
          path: skill.dir,
          state: srcHash === tgtHash ? 'synced' : 'modified',
          type: 'skill',
        });
      } else {
        skills.push({ path: skill.dir, state: 'modified', type: 'skill' });
      }
    }
  }

  const managedPromptNames = new Set<string>();
  for (const prompt of manifest.prompts ?? []) {
    managedPromptNames.add(path.basename(prompt.file));
    prompts.push(await getFileStatus(repoPath, prompt.file, promptsTarget, 'prompt'));
  }

  const managedHookNames = new Set<string>();
  if (hooksTarget) {
    for (const hook of manifest.hooks ?? []) {
      managedHookNames.add(path.basename(hook.file));
      hooks.push(await getFileStatus(repoPath, hook.file, hooksTarget, 'hook'));
    }
  }

  // --- Untracked detection --------------------------------------------

  const allManagedPromptNames = new Set([
    ...managedAgentNames,
    ...managedInstructionNames,
    ...managedToolsetNames,
    ...managedPromptNames,
  ]);

  agents.push(
    ...(await scanForUntracked(promptsTarget, allManagedPromptNames, 'agent', [/\.agent\.md$/])),
  );
  instructions.push(
    ...(await scanForUntracked(promptsTarget, allManagedPromptNames, 'instruction', [
      /\.instructions\.md$/,
    ])),
  );
  toolsets.push(
    ...(await scanForUntracked(promptsTarget, allManagedPromptNames, 'toolset', [
      /\.toolsets\.jsonc$/,
    ])),
  );
  prompts.push(
    ...(await scanForUntracked(promptsTarget, allManagedPromptNames, 'prompt', [
      /\.prompt\.md$/,
    ])),
  );

  // Scan for untracked hook files
  if (hooksTarget) {
    hooks.push(
      ...(await scanForUntracked(hooksTarget, managedHookNames, 'hook', [/\.json$/])),
    );
  }

  // Scan for untracked skill directories
  try {
    const skillEntries = await fs.readdir(skillsTarget, { withFileTypes: true });
    for (const entry of skillEntries) {
      if (entry.isDirectory() && !managedSkillDirNames.has(entry.name)) {
        const skillMdPath = path.join(skillsTarget, entry.name, 'SKILL.md');
        if (await fileExists(skillMdPath)) {
          skills.push({ path: entry.name, state: 'untracked', type: 'skill' });
        }
      }
    }
  } catch {
    // skills target may not exist
  }

  // --- Overall state --------------------------------------------------

  const allStatuses = [...agents, ...instructions, ...skills, ...toolsets, ...prompts, ...hooks];
  const syncState = allStatuses.every(s => s.state === 'synced') ? 'synced' : 'out-of-sync';

  return { agents, instructions, skills, toolsets, prompts, hooks, syncState };
}
