import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { parse, printParseErrorCode } from 'jsonc-parser';
import type { AgentManifestEntry, DeploymentManifestV2, ModelProfile } from './types.js';
import { ManifestNotFoundError, ManifestParseError, ManifestValidationError } from './errors.js';

const MANIFEST_FILENAME = 'agent-forge.manifest.jsonc';
const MODEL_PROFILES = new Set<ModelProfile>(['inherit', 'reasoning', 'coding', 'creative', 'balanced']);

function nonEmpty(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ManifestValidationError(`${field} must be a non-empty string`);
  }
}

function stringArray(value: unknown, field: string): asserts value is string[] {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
    throw new ManifestValidationError(`${field} must be an array of strings`);
  }
}

function validateAgent(id: string, raw: unknown): asserts raw is AgentManifestEntry {
  if (!raw || typeof raw !== 'object') throw new ManifestValidationError(`agents.${id} must be an object`);
  const agent = raw as Record<string, unknown>;
  nonEmpty(agent.id, `agents.${id}.id`);
  if (agent.id !== id) throw new ManifestValidationError(`agents.${id}.id must equal its map key`);
  nonEmpty(agent.source, `agents.${id}.source`);
  if (agent.visibility !== 'entry' && agent.visibility !== 'worker') {
    throw new ManifestValidationError(`agents.${id}.visibility must be entry or worker`);
  }
  nonEmpty(agent.capabilityProfile, `agents.${id}.capabilityProfile`);
  if (!MODEL_PROFILES.has(agent.modelProfile as ModelProfile)) {
    throw new ManifestValidationError(`agents.${id}.modelProfile is invalid`);
  }
  for (const key of ['requiredSkills', 'optionalSkills', 'allowedSubagents', 'handoffs', 'requiredCapabilities', 'optionalCapabilities']) {
    stringArray(agent[key], `agents.${id}.${key}`);
  }
}

export async function loadJsonc<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, 'utf8');
  const errors: import('jsonc-parser').ParseError[] = [];
  const parsed = parse(content, errors, { allowTrailingComma: true });
  if (errors.length > 0) {
    const first = errors[0];
    const line = content.slice(0, first.offset).split('\n').length;
    throw new ManifestParseError(printParseErrorCode(first.error), line);
  }
  return parsed as T;
}

export async function loadManifest(repoPath: string): Promise<DeploymentManifestV2> {
  const manifestPath = path.join(repoPath, MANIFEST_FILENAME);
  try {
    return validateManifest(await loadJsonc<unknown>(manifestPath));
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new ManifestNotFoundError(manifestPath);
    throw error;
  }
}

export function validateManifest(raw: unknown): DeploymentManifestV2 {
  if (!raw || typeof raw !== 'object') throw new ManifestValidationError('Manifest must be an object');
  const manifest = raw as Record<string, unknown>;
  if (manifest.schemaVersion !== 2) throw new ManifestValidationError('schemaVersion must be 2');
  if (manifest.platform !== 'vscode') throw new ManifestValidationError('platform must be vscode');
  if (manifest.scope !== 'user') throw new ManifestValidationError('scope must be user');
  if (!manifest.targets || typeof manifest.targets !== 'object') throw new ManifestValidationError('targets is required');
  const targets = manifest.targets as Record<string, unknown>;
  for (const key of ['agents', 'instructions', 'skills', 'hooks', 'state']) nonEmpty(targets[key], `targets.${key}`);
  for (const key of ['capabilityCatalog', 'modelProfiles', 'mcpProviders']) nonEmpty(manifest[key], key);
  if (!manifest.agents || typeof manifest.agents !== 'object' || Array.isArray(manifest.agents)) {
    throw new ManifestValidationError('agents must be an object keyed by stable agent id');
  }
  const agents = manifest.agents as Record<string, unknown>;
  for (const [id, agent] of Object.entries(agents)) validateAgent(id, agent);
  const ids = new Set(Object.keys(agents));
  for (const [id, rawAgent] of Object.entries(agents)) {
    const agent = rawAgent as AgentManifestEntry;
    for (const target of [...agent.allowedSubagents, ...agent.handoffs]) {
      if (!ids.has(target)) throw new ManifestValidationError(`Agent ${id} references unknown agent ${target}`);
    }
  }
  for (const collection of ['instructions', 'skills', 'hooks'] as const) {
    const value = manifest[collection];
    if (!Array.isArray(value)) throw new ManifestValidationError(`${collection} must be an array`);
    const seen = new Set<string>();
    for (const [index, item] of value.entries()) {
      if (!item || typeof item !== 'object') throw new ManifestValidationError(`${collection}[${index}] must be an object`);
      const entry = item as Record<string, unknown>;
      nonEmpty(entry.id, `${collection}[${index}].id`);
      nonEmpty(entry.source, `${collection}[${index}].source`);
      if (seen.has(entry.id)) throw new ManifestValidationError(`Duplicate ${collection} id ${entry.id}`);
      seen.add(entry.id);
    }
  }
  return raw as DeploymentManifestV2;
}
