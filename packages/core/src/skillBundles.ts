import { readFile, readdir } from 'node:fs/promises';
import * as path from 'node:path';
import type { CodexSkillBundleEntry, DeploymentManifestV3 } from './types.js';
import { resolveRepoFilePath } from './paths.js';

function stripFrontmatter(source: string): string {
  return source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim();
}

export function codexSkillMap(manifest: DeploymentManifestV3): Map<string, string> {
  const result = new Map<string, string>();
  for (const bundle of Object.values(manifest.codex.skillBundles)) {
    for (const skill of bundle.componentSkills) {
      if (result.has(skill)) throw new Error(`Codex skill component ${skill} appears in more than one bundle`);
      result.set(skill, bundle.deploymentName);
    }
  }
  return result;
}

export function rewriteCodexSkillReferences(source: string, mapping: Map<string, string>): string {
  return source.replace(/\$([a-z0-9]+(?:-[a-z0-9]+)*)/g, (match, id: string) => {
    const bundle = mapping.get(id);
    return bundle ? `$${bundle}` : match;
  });
}

function rewriteReferenceLinks(source: string, skillId: string): string {
  return source.replace(/\((?:\.\/)?references\/([^\s)]+)\)/g, (_match, reference: string) => `(${skillId}--${path.basename(reference)})`);
}

export interface RenderedCodexSkillFile {
  relativePath: string;
  sourcePath: string;
  content: Buffer;
}

export async function renderCodexSkillBundle(
  repoPath: string,
  manifest: DeploymentManifestV3,
  bundle: CodexSkillBundleEntry,
): Promise<RenderedCodexSkillFile[]> {
  const skillSources = new Map(manifest.skills.map(item => [item.id, resolveRepoFilePath(repoPath, item.source)]));
  const mapping = codexSkillMap(manifest);
  const files: RenderedCodexSkillFile[] = [];
  const links: string[] = [];

  for (const skillId of bundle.componentSkills) {
    const sourceRoot = skillSources.get(skillId);
    if (!sourceRoot) throw new Error(`Unknown component skill ${skillId}`);
    const entrypoint = path.join(sourceRoot, 'SKILL.md');
    let body = stripFrontmatter(await readFile(entrypoint, 'utf8'));
    body = rewriteCodexSkillReferences(rewriteReferenceLinks(body, skillId), mapping);
    const relativePath = path.join('references', `${skillId}.md`);
    links.push(`- [${skillId}](references/${skillId}.md)`);
    files.push({ relativePath, sourcePath: entrypoint, content: Buffer.from(`# ${skillId}\n\n${body}\n`) });

    const referencesPath = path.join(sourceRoot, 'references');
    try {
      for (const entry of (await readdir(referencesPath, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
        if (!entry.isFile()) continue;
        const sourcePath = path.join(referencesPath, entry.name);
        const targetName = `${skillId}--${entry.name}`;
        let reference = await readFile(sourcePath, 'utf8');
        reference = rewriteCodexSkillReferences(reference, mapping);
        files.push({ relativePath: path.join('references', targetName), sourcePath, content: Buffer.from(reference) });
      }
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }

  const entrypoint = [
    '---',
    `name: ${bundle.deploymentName}`,
    `description: ${bundle.description}`,
    '---',
    '',
    `# ${bundle.deploymentName}`,
    '',
    'Use this bundle when its description matches the task. Read only the workflow or platform references needed for the current request.',
    '',
    'Preserve user approval requirements for cloud, deployment, push, release, downloads, destructive operations, and external mutations.',
    '',
    '## Workflows',
    '',
    ...links,
    '',
  ].join('\n');
  files.unshift({ relativePath: bundle.entrypoint, sourcePath: path.join(repoPath, 'agent-forge.manifest.jsonc'), content: Buffer.from(entrypoint) });
  return files;
}
