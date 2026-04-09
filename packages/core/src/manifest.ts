import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { parse, printParseErrorCode } from 'jsonc-parser';
import type { Manifest } from './types.js';
import {
  ManifestNotFoundError,
  ManifestParseError,
  ManifestValidationError,
} from './errors.js';

const MANIFEST_FILENAME = 'agent-forge.manifest.jsonc';

export async function loadManifest(repoPath: string): Promise<Manifest> {
  const manifestPath = path.join(repoPath, MANIFEST_FILENAME);

  let content: string;
  try {
    content = await readFile(manifestPath, 'utf-8');
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new ManifestNotFoundError(manifestPath);
    }
    throw err;
  }

  const errors: import('jsonc-parser').ParseError[] = [];
  const raw = parse(content, errors, { allowTrailingComma: true });

  if (errors.length > 0) {
    const first = errors[0];
    const line = content.substring(0, first.offset).split('\n').length;
    throw new ManifestParseError(printParseErrorCode(first.error), line);
  }

  return validateManifest(raw);
}

export function validateManifest(raw: unknown): Manifest {
  if (raw === null || raw === undefined || typeof raw !== 'object') {
    throw new ManifestValidationError('Manifest must be a JSON object');
  }

  const obj = raw as Record<string, unknown>;

  // --- version --------------------------------------------------------
  if (obj.version !== '1.0') {
    throw new ManifestValidationError('Field "version" must be "1.0"');
  }

  // --- editor ---------------------------------------------------------
  if (obj.editor !== 'vscode') {
    throw new ManifestValidationError('Field "editor" must be "vscode"');
  }

  // --- targets --------------------------------------------------------
  if (!obj.targets || typeof obj.targets !== 'object') {
    throw new ManifestValidationError('Field "targets" is required and must be an object');
  }

  const targets = obj.targets as Record<string, unknown>;
  if (typeof targets.prompts !== 'string' || targets.prompts.length === 0) {
    throw new ManifestValidationError('Field "targets.prompts" must be a non-empty string');
  }
  if (typeof targets.skills !== 'string' || targets.skills.length === 0) {
    throw new ManifestValidationError('Field "targets.skills" must be a non-empty string');
  }

  // --- uniqueness across all entry types ------------------------------
  const allIds = new Set<string>();

  function requireUniqueId(id: string, context: string): void {
    if (allIds.has(id)) {
      throw new ManifestValidationError(`Duplicate id "${id}" found in ${context}`);
    }
    allIds.add(id);
  }

  // --- agents ---------------------------------------------------------
  if (obj.agents !== undefined && obj.agents !== null) {
    if (!Array.isArray(obj.agents)) {
      throw new ManifestValidationError('Field "agents" must be an array');
    }
    for (let i = 0; i < obj.agents.length; i++) {
      const a = obj.agents[i];
      if (!a || typeof a !== 'object') {
        throw new ManifestValidationError(`agents[${i}] must be an object`);
      }
      if (typeof a.id !== 'string' || a.id.length === 0) {
        throw new ManifestValidationError(`agents[${i}].id must be a non-empty string`);
      }
      if (typeof a.file !== 'string' || a.file.length === 0) {
        throw new ManifestValidationError(`agents[${i}].file must be a non-empty string`);
      }
      requireUniqueId(a.id, `agents[${i}]`);
    }
  }

  // --- instructions ---------------------------------------------------
  if (obj.instructions !== undefined && obj.instructions !== null) {
    if (!Array.isArray(obj.instructions)) {
      throw new ManifestValidationError('Field "instructions" must be an array');
    }
    for (let i = 0; i < obj.instructions.length; i++) {
      const inst = obj.instructions[i];
      if (!inst || typeof inst !== 'object') {
        throw new ManifestValidationError(`instructions[${i}] must be an object`);
      }
      if (typeof inst.id !== 'string' || inst.id.length === 0) {
        throw new ManifestValidationError(`instructions[${i}].id must be a non-empty string`);
      }
      if (typeof inst.file !== 'string' || inst.file.length === 0) {
        throw new ManifestValidationError(`instructions[${i}].file must be a non-empty string`);
      }
      requireUniqueId(inst.id, `instructions[${i}]`);
    }
  }

  // --- skills ---------------------------------------------------------
  if (obj.skills !== undefined && obj.skills !== null) {
    if (!Array.isArray(obj.skills)) {
      throw new ManifestValidationError('Field "skills" must be an array');
    }
    for (let i = 0; i < obj.skills.length; i++) {
      const s = obj.skills[i];
      if (!s || typeof s !== 'object') {
        throw new ManifestValidationError(`skills[${i}] must be an object`);
      }
      if (typeof s.id !== 'string' || s.id.length === 0) {
        throw new ManifestValidationError(`skills[${i}].id must be a non-empty string`);
      }
      if (typeof s.dir !== 'string' || s.dir.length === 0) {
        throw new ManifestValidationError(`skills[${i}].dir must be a non-empty string`);
      }
      requireUniqueId(s.id, `skills[${i}]`);
    }
  }

  // --- toolsets -------------------------------------------------------
  if (obj.toolsets !== undefined && obj.toolsets !== null) {
    if (typeof obj.toolsets !== 'object') {
      throw new ManifestValidationError('Field "toolsets" must be an object');
    }
    const ts = obj.toolsets as Record<string, unknown>;
    if (typeof ts.file !== 'string' || ts.file.length === 0) {
      throw new ManifestValidationError('Field "toolsets.file" must be a non-empty string');
    }
  }

  // --- prompts --------------------------------------------------------
  if (obj.prompts !== undefined && obj.prompts !== null) {
    if (!Array.isArray(obj.prompts)) {
      throw new ManifestValidationError('Field "prompts" must be an array');
    }
    for (let i = 0; i < obj.prompts.length; i++) {
      const p = obj.prompts[i];
      if (!p || typeof p !== 'object') {
        throw new ManifestValidationError(`prompts[${i}] must be an object`);
      }
      if (typeof p.id !== 'string' || p.id.length === 0) {
        throw new ManifestValidationError(`prompts[${i}].id must be a non-empty string`);
      }
      if (typeof p.file !== 'string' || p.file.length === 0) {
        throw new ManifestValidationError(`prompts[${i}].file must be a non-empty string`);
      }
      requireUniqueId(p.id, `prompts[${i}]`);
    }
  }

  // --- hooks ----------------------------------------------------------
  if (obj.hooks !== undefined && obj.hooks !== null) {
    if (!Array.isArray(obj.hooks)) {
      throw new ManifestValidationError('Field "hooks" must be an array');
    }
    for (let i = 0; i < obj.hooks.length; i++) {
      const h = obj.hooks[i];
      if (!h || typeof h !== 'object') {
        throw new ManifestValidationError(`hooks[${i}] must be an object`);
      }
      if (typeof h.id !== 'string' || h.id.length === 0) {
        throw new ManifestValidationError(`hooks[${i}].id must be a non-empty string`);
      }
      if (typeof h.file !== 'string' || h.file.length === 0) {
        throw new ManifestValidationError(`hooks[${i}].file must be a non-empty string`);
      }
      requireUniqueId(h.id, `hooks[${i}]`);
    }
    if (obj.hooks.length > 0) {
      if (typeof targets.hooks !== 'string' || targets.hooks.length === 0) {
        throw new ManifestValidationError('Field "targets.hooks" must be a non-empty string when hooks are defined');
      }
    }
  }

  return raw as Manifest;
}
