import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { parse, printParseErrorCode } from 'jsonc-parser';
import type {
  AgentManifestEntry,
  CodexAgentManifestEntry,
  CodexSkillBundleEntry,
  DeploymentManifestV3,
  ModelProfile,
} from './types.js';
import { ManifestNotFoundError, ManifestParseError, ManifestValidationError } from './errors.js';

const MANIFEST_FILENAME = 'agent-forge.manifest.jsonc';
const MODEL_PROFILES = new Set<ModelProfile>(['inherit', 'reasoning', 'coding', 'creative', 'balanced']);

function nonEmpty(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new ManifestValidationError(`${field} must be a non-empty string`);
}

function stringArray(value: unknown, field: string): asserts value is string[] {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string' || item.length === 0)) {
    throw new ManifestValidationError(`${field} must be an array of non-empty strings`);
  }
  if (new Set(value).size !== value.length) throw new ManifestValidationError(`${field} must contain unique values`);
}

function validateAgent(id: string, raw: unknown): asserts raw is AgentManifestEntry {
  if (!raw || typeof raw !== 'object') throw new ManifestValidationError(`agents.${id} must be an object`);
  const agent = raw as Record<string, unknown>;
  nonEmpty(agent.id, `agents.${id}.id`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new ManifestValidationError(`Invalid agent identifier ${id}`);
  if (agent.id !== id) throw new ManifestValidationError(`agents.${id}.id must equal its map key`);
  nonEmpty(agent.source, `agents.${id}.source`);
  if (agent.visibility !== 'entry' && agent.visibility !== 'worker') throw new ManifestValidationError(`agents.${id}.visibility must be entry or worker`);
  nonEmpty(agent.capabilityProfile, `agents.${id}.capabilityProfile`);
  if (!MODEL_PROFILES.has(agent.modelProfile as ModelProfile)) throw new ManifestValidationError(`agents.${id}.modelProfile is invalid`);
  for (const key of ['requiredSkills', 'optionalSkills', 'allowedSubagents', 'handoffs', 'requiredCapabilities', 'optionalCapabilities']) {
    stringArray(agent[key], `agents.${id}.${key}`);
  }
}

function validateCodexAgent(id: string, raw: unknown, manifest: Record<string, unknown>, bundleIds: Set<string>): asserts raw is CodexAgentManifestEntry {
  if (!raw || typeof raw !== 'object') throw new ManifestValidationError(`codex.agents.${id} must be an object`);
  const agent = raw as Record<string, unknown>;
  nonEmpty(agent.id, `codex.agents.${id}.id`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new ManifestValidationError(`Invalid Codex agent identifier ${id}`);
  if (agent.id !== id) throw new ManifestValidationError(`codex.agents.${id}.id must equal its map key`);
  nonEmpty(agent.sourceAgent, `codex.agents.${id}.sourceAgent`);
  if (agent.displayName !== undefined) nonEmpty(agent.displayName, `codex.agents.${id}.displayName`);
  if (!(agent.sourceAgent in manifest)) throw new ManifestValidationError(`codex.agents.${id}.sourceAgent is unknown`);
  if (agent.sandboxMode !== 'read-only' && agent.sandboxMode !== 'workspace-write') throw new ManifestValidationError(`codex.agents.${id}.sandboxMode is invalid`);
  if (agent.modelProfile !== 'inherit') throw new ManifestValidationError(`codex.agents.${id}.modelProfile must be inherit`);
  stringArray(agent.requiredSkillBundles, `codex.agents.${id}.requiredSkillBundles`);
  for (const bundle of agent.requiredSkillBundles) if (!bundleIds.has(bundle)) throw new ManifestValidationError(`codex.agents.${id} references unknown bundle ${bundle}`);
  if (typeof agent.instructionOverlay !== 'string') throw new ManifestValidationError(`codex.agents.${id}.instructionOverlay must be a string`);
  stringArray(agent.requiredCapabilities, `codex.agents.${id}.requiredCapabilities`);
  stringArray(agent.optionalCapabilities, `codex.agents.${id}.optionalCapabilities`);
  if (agent.completionEvidence !== undefined) stringArray(agent.completionEvidence, `codex.agents.${id}.completionEvidence`);
}

function validateBundle(id: string, raw: unknown, skillIds: Set<string>): asserts raw is CodexSkillBundleEntry {
  if (!raw || typeof raw !== 'object') throw new ManifestValidationError(`codex.skillBundles.${id} must be an object`);
  const bundle = raw as Record<string, unknown>;
  nonEmpty(bundle.id, `codex.skillBundles.${id}.id`);
  if (bundle.id !== id) throw new ManifestValidationError(`codex.skillBundles.${id}.id must equal its map key`);
  nonEmpty(bundle.deploymentName, `codex.skillBundles.${id}.deploymentName`);
  if (!String(bundle.deploymentName).startsWith('agent-forge-')) throw new ManifestValidationError(`codex.skillBundles.${id}.deploymentName must be prefixed agent-forge-`);
  if (bundle.entrypoint !== 'SKILL.md') throw new ManifestValidationError(`codex.skillBundles.${id}.entrypoint must be SKILL.md`);
  nonEmpty(bundle.description, `codex.skillBundles.${id}.description`);
  stringArray(bundle.componentSkills, `codex.skillBundles.${id}.componentSkills`);
  for (const skill of bundle.componentSkills) if (!skillIds.has(skill)) throw new ManifestValidationError(`codex.skillBundles.${id} references unknown component skill ${skill}`);
  stringArray(bundle.flattenedReferences, `codex.skillBundles.${id}.flattenedReferences`);
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

export async function loadManifest(repoPath: string): Promise<DeploymentManifestV3> {
  const manifestPath = path.join(repoPath, MANIFEST_FILENAME);
  try {
    return validateManifest(await loadJsonc<unknown>(manifestPath));
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new ManifestNotFoundError(manifestPath);
    throw error;
  }
}

export function validateManifest(raw: unknown): DeploymentManifestV3 {
  if (!raw || typeof raw !== 'object') throw new ManifestValidationError('Manifest must be an object');
  const manifest = raw as Record<string, unknown>;
  if (manifest.schemaVersion !== 3 && manifest.schemaVersion !== 4) throw new ManifestValidationError('schemaVersion must be 3 or 4; manifest v2 is no longer deployable');
  if (!Array.isArray(manifest.platforms) || manifest.platforms.join(',') !== 'vscode,codex') throw new ManifestValidationError('platforms must be ["vscode", "codex"]');
  if (manifest.scope !== 'user') throw new ManifestValidationError('scope must be user');
  if (!manifest.targets || typeof manifest.targets !== 'object') throw new ManifestValidationError('targets is required');
  const targets = manifest.targets as Record<string, unknown>;
  if (!targets.vscode || typeof targets.vscode !== 'object') throw new ManifestValidationError('targets.vscode is required');
  if (!targets.codex || typeof targets.codex !== 'object') throw new ManifestValidationError('targets.codex is required');
  for (const key of ['agents', 'instructions', 'skills', 'hooks']) nonEmpty((targets.vscode as Record<string, unknown>)[key], `targets.vscode.${key}`);
  for (const key of ['agents', 'skills']) nonEmpty((targets.codex as Record<string, unknown>)[key], `targets.codex.${key}`);
  nonEmpty(targets.state, 'targets.state');
  for (const key of ['capabilityCatalog', 'modelProfiles', 'mcpProviders']) nonEmpty(manifest[key], key);
  if (!manifest.agents || typeof manifest.agents !== 'object' || Array.isArray(manifest.agents)) throw new ManifestValidationError('agents must be an object keyed by stable agent id');
  const agents = manifest.agents as Record<string, unknown>;
  if (Object.keys(agents).length === 0) throw new ManifestValidationError('agents must contain at least one canonical agent');
  for (const [id, agent] of Object.entries(agents)) validateAgent(id, agent);
  const ids = new Set(Object.keys(agents));
  for (const [id, rawAgent] of Object.entries(agents)) {
    const agent = rawAgent as AgentManifestEntry;
    for (const target of [...agent.allowedSubagents, ...agent.handoffs]) if (!ids.has(target)) throw new ManifestValidationError(`Agent ${id} references unknown agent ${target}`);
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
      if (seen.has(String(entry.id))) throw new ManifestValidationError(`Duplicate ${collection} id ${entry.id}`);
      seen.add(String(entry.id));
    }
  }
  if (!manifest.codex || typeof manifest.codex !== 'object') throw new ManifestValidationError('codex is required');
  const codex = manifest.codex as Record<string, unknown>;
  if (!codex.agents || typeof codex.agents !== 'object' || Array.isArray(codex.agents)) throw new ManifestValidationError('codex.agents must be an object');
  if (!codex.skillBundles || typeof codex.skillBundles !== 'object' || Array.isArray(codex.skillBundles)) throw new ManifestValidationError('codex.skillBundles must be an object');
  const bundles = codex.skillBundles as Record<string, unknown>;
  const skillIds = new Set((manifest.skills as Array<{ id: string }>).map(item => item.id));
  for (const [id, bundle] of Object.entries(bundles)) validateBundle(id, bundle, skillIds);
  const codexAgents = codex.agents as Record<string, unknown>;
  if (Object.keys(codexAgents).length === 0) throw new ManifestValidationError('codex.agents must contain at least one agent');
  const bundleIds = new Set(Object.keys(bundles));
  for (const [id, agent] of Object.entries(codexAgents)) validateCodexAgent(id, agent, agents, bundleIds);
  const deployedNames = Object.values(bundles).map(raw => (raw as CodexSkillBundleEntry).deploymentName);
  if (codex.productDevelopment !== undefined) {
    if (manifest.schemaVersion !== 4) throw new ManifestValidationError('productDevelopment requires manifest schemaVersion 4');
    const product = codex.productDevelopment as Record<string, unknown>;
    if (!product || typeof product !== 'object') throw new ManifestValidationError('codex.productDevelopment must be an object');
    for (const field of ['source', 'deploymentName', 'hooksSource', 'hooksTarget']) nonEmpty(product[field], `codex.productDevelopment.${field}`);
    if (!/^agent-forge-[a-z0-9-]+$/.test(String(product.deploymentName))) throw new ManifestValidationError('Product skill name must start with agent-forge-');
    deployedNames.push(String(product.deploymentName));
  }
  if (new Set(deployedNames).size !== deployedNames.length) throw new ManifestValidationError('Codex deployed skill names must be unique');
  if (codex.externalSkillCatalog !== undefined) {
    if (manifest.schemaVersion !== 4) throw new ManifestValidationError('externalSkillCatalog requires manifest schemaVersion 4');
    nonEmpty(codex.externalSkillCatalog, 'codex.externalSkillCatalog');
  }
  return raw as DeploymentManifestV3;
}
