import { mkdir, readFile, rename, writeFile, lstat } from 'node:fs/promises';
import * as path from 'node:path';
import { parseDocument } from 'yaml';
import { hashBuffer } from './hash.js';
import { resolveRepoFilePath } from './paths.js';
import type { DeploymentManifestV3 } from './types.js';
import type { RenderedCodexSkillFile } from './skillBundles.js';

export interface ExternalSkillFile { path: string; repositoryPath: string; sha256: string; }
export interface ExternalSkillAdaptation { path: string; find: string; replace: string; reason: string; }
export interface ExternalSkill {
  id: string;
  deploymentName: string;
  directoryUrl: string;
  repositoryUrl: string;
  revision: string;
  sourceDirectory: string;
  license: string;
  licensePath: string;
  files: ExternalSkillFile[];
  agentIds: string[];
  description: string;
  activationCondition?: string;
  adaptation?: string;
  adaptations?: ExternalSkillAdaptation[];
}
export interface ExternalSkillCatalog { version: 1; skills: ExternalSkill[]; }

function safeRelative(value: string): void {
  if (typeof value !== 'string' || !value || path.isAbsolute(value) || /[\\:"<>|?*\u0000-\u001f]/.test(value) || value.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new Error(`Invalid external skill relative path: ${value}`);
  }
}

export async function loadExternalSkillCatalog(repoPath: string, manifest: DeploymentManifestV3): Promise<ExternalSkillCatalog> {
  if (!manifest.codex.externalSkillCatalog) return { version: 1, skills: [] };
  const catalog = JSON.parse(await readFile(resolveRepoFilePath(repoPath, manifest.codex.externalSkillCatalog), 'utf8')) as ExternalSkillCatalog;
  if (catalog.version !== 1 || !Array.isArray(catalog.skills)) throw new Error('Invalid external skill catalog');
  const names = new Set(Object.values(manifest.codex.skillBundles).map(item => item.deploymentName));
  if (manifest.codex.productDevelopment) names.add(manifest.codex.productDevelopment.deploymentName);
  const ids = new Set<string>();
  for (const skill of catalog.skills) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(skill.id) || ids.has(skill.id)) throw new Error('External skill IDs must be valid and unique');
    ids.add(skill.id);
    if (!/^agent-forge-[a-z0-9-]+$/.test(skill.deploymentName) || names.has(skill.deploymentName)) throw new Error(`Duplicate or invalid deployed skill name: ${skill.deploymentName}`);
    names.add(skill.deploymentName);
    if (!/^https:\/\/(?:www\.)?skills\.sh\/[^\s?#]+$/.test(skill.directoryUrl)) throw new Error(`External skill ${skill.id} must originate in skills.sh`);
    if (!/^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(skill.repositoryUrl) || !/^[a-f0-9]{40}$/.test(skill.revision)) throw new Error(`External skill ${skill.id} requires a pinned GitHub commit`);
    if (!skill.license || !skill.description || !Array.isArray(skill.files) || !skill.files.some(file => file.path === 'SKILL.md')) throw new Error(`External skill ${skill.id} requires license, description and SKILL.md`);
    if (skill.activationCondition !== undefined && (typeof skill.activationCondition !== 'string' || !skill.activationCondition.trim() || skill.activationCondition.length > 4000)) throw new Error(`External skill ${skill.id} requires a nonempty activationCondition of at most 4000 characters when provided`);
    safeRelative(skill.sourceDirectory); safeRelative(skill.licensePath);
    if (!skill.files.some(file => file.repositoryPath === skill.licensePath)) throw new Error(`External skill ${skill.id} must include its license`);
    if (!Array.isArray(skill.agentIds) || !skill.agentIds.length || new Set(skill.agentIds).size !== skill.agentIds.length || skill.agentIds.some(id => !manifest.codex.agents[id])) throw new Error(`External skill ${skill.id} has invalid agent assignments`);
    const files = new Set<string>();
    for (const file of skill.files) {
      safeRelative(file.path); safeRelative(file.repositoryPath);
      if (file.path.toLowerCase() === 'source.json') throw new Error(`External skill ${skill.id} collides with reserved SOURCE.json metadata`);
      if (!/^[a-f0-9]{64}$/.test(file.sha256) || files.has(file.path.toLowerCase())) throw new Error(`External skill ${skill.id} has an invalid hash or duplicate file`);
      files.add(file.path.toLowerCase());
    }
    for (const change of skill.adaptations ?? []) {
      if (!skill.files.some(file => file.path === change.path) || !change.find || typeof change.replace !== 'string' || !change.reason) throw new Error(`Invalid adaptation for ${skill.id}`);
    }
  }
  return catalog;
}

export function externalSkillCachePath(repoPath: string, skill: ExternalSkill, file: ExternalSkillFile): string {
  return resolveRepoFilePath(repoPath, `.cache/external-skills/${skill.id}/${skill.revision}/${file.path}`);
}

export async function resolveExternalSkillFiles(repoPath: string, skill: ExternalSkill, downloadMissing = false): Promise<RenderedCodexSkillFile[]> {
  const files: RenderedCodexSkillFile[] = [];
  for (const file of skill.files) {
    const cachePath = externalSkillCachePath(repoPath, skill, file);
    let content: Buffer;
    try {
      if (!(await lstat(cachePath)).isFile()) throw new Error(`External skill cache must contain regular files: ${cachePath}`);
      content = await readFile(cachePath);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT' || !downloadMissing) throw new Error(`Unable to read pinned skill ${skill.id}/${file.path}. Prepare the cache with preview --download-skills. ${(error as Error).message}`);
      const sourceUrl = `${skill.repositoryUrl.replace('https://github.com/', 'https://raw.githubusercontent.com/')}/${skill.revision}/${file.repositoryPath}`;
      const response = await fetch(sourceUrl, { redirect: 'error', signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error(`Skill download failed: ${skill.id}/${file.path} HTTP ${response.status}`);
      content = Buffer.from(await response.arrayBuffer());
      if (content.length > 8 * 1024 * 1024) throw new Error(`External skill file too large: ${file.path}`);
      if (hashBuffer(content) !== file.sha256) throw new Error(`External skill integrity check failed: ${skill.id}/${file.path}`);
      await mkdir(path.dirname(cachePath), { recursive: true });
      const temporary = `${cachePath}.${process.pid}.tmp`;
      await writeFile(temporary, content);
      await rename(temporary, cachePath);
    }
    if (hashBuffer(content) !== file.sha256) throw new Error(`External skill integrity check failed: ${skill.id}/${file.path}`);
    const changes = (skill.adaptations ?? []).filter(change => change.path === file.path);
    if (changes.length) {
      let text = content.toString('utf8');
      for (const change of changes) {
        if (text.split(change.find).length !== 2) throw new Error(`Adaptation must match exactly once: ${skill.id}/${file.path}: ${change.reason}`);
        text = text.replace(change.find, change.replace);
      }
      content = Buffer.from(text);
    }
    if (file.path === 'SKILL.md') {
      const source = content.toString('utf8');
      const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
      if (!match) throw new Error(`Missing skill frontmatter: ${skill.id}`);
      const document = parseDocument(match[1], { uniqueKeys: true });
      if (document.errors.length) throw new Error(`Invalid external skill frontmatter: ${skill.id}`);
      // Only the adapted entry point is discoverable; upstream resources keep their relative layout.
      const body = source.slice(match[0].length);
      const entry = ['---', `name: ${skill.deploymentName}`, `description: ${JSON.stringify(skill.description)}`, '---', '',
        'Use this skill only within an assigned software-product development task. Follow the product requirements, established repository conventions and the authorization already given for that task.',
        skill.adaptation ?? '', '',
        `Source: ${skill.directoryUrl}. Revision: ${skill.revision}. License: ${skill.license}. See SOURCE.json for exact files and adaptations.`, '', body].join('\n');
      content = Buffer.from(entry);
    }
    files.push({ relativePath: file.path, sourcePath: cachePath, content });
  }
  files.push({ relativePath: 'SOURCE.json', sourcePath: skill.directoryUrl, content: Buffer.from(JSON.stringify(skill, null, 2) + '\n') });
  return files;
}
