import { createHash } from 'node:crypto';
import { lstat, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateResearchDefinitions } from './research-definitions.mjs';

const MODULE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REQUIRED_FILES = ['manifest.json', 'research-roster.json', 'roles/research-specialist-common.md', 'scripts/research-definitions.mjs', 'scripts/research-session.mjs', 'scripts/research-hooks.mjs', 'scripts/research-integrity.mjs', 'hooks/hooks.json'];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const normalized = value => process.platform === 'win32' ? value.toLowerCase() : value;

function within(root, candidate) {
  const relative = path.relative(normalized(root), normalized(candidate));
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

async function regularBytes(file, maximum) {
  const info = await lstat(file);
  if (!info.isFile() || info.isSymbolicLink() || info.size > maximum) throw new Error('Research package integrity requires bounded regular files.');
  const data = await readFile(file);
  if (data.length > maximum) throw new Error('Research package file exceeds its verification limit.');
  return data;
}

/** Detect changes against the installed inventory; this is not signature verification. */
export async function verifyResearchPackageIntegrity(pluginRoot = MODULE_ROOT) {
  const root = await realpath(pluginRoot);
  let bytes;
  try { bytes = await regularBytes(path.join(root, 'package-integrity.json'), 1024 * 1024); }
  catch (error) { if (error.code === 'ENOENT') return { status: 'not-installed', verifiedFiles: 0 }; throw error; }
  const inventory = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
  if (inventory.version !== 1 || !Array.isArray(inventory.files) || !inventory.files.length || inventory.files.length > 2000) throw new Error('Invalid research package integrity inventory.');
  const paths = new Set();
  let totalBytes = 0;
  for (const file of inventory.files) {
    if (!file || typeof file.path !== 'string' || file.path.length > 512 || !file.path || /[\\:\u0000-\u001f]/.test(file.path) || path.isAbsolute(file.path) || file.path.split('/').some(part => !part || part === '.' || part === '..') || !/^[a-f0-9]{64}$/.test(file.sha256)) throw new Error('Invalid research package integrity file reference.');
    const key = file.path.toLowerCase();
    if (paths.has(key) || key === 'package-integrity.json') throw new Error('Duplicate or recursive research package integrity reference.');
    paths.add(key);
    const candidate = path.resolve(root, file.path);
    if (!within(root, candidate) || !within(root, await realpath(candidate))) throw new Error('Research package integrity reference leaves the module.');
    const contents = await regularBytes(candidate, 8 * 1024 * 1024);
    totalBytes += contents.length;
    if (totalBytes > 128 * 1024 * 1024) throw new Error('Research package exceeds its verification limit.');
    if (digest(contents) !== file.sha256) throw new Error('Research module content differs from its installed inventory.');
  }
  if (REQUIRED_FILES.some(file => !paths.has(file))) throw new Error('Research package inventory omits a required runtime file.');
  if (!Array.isArray(inventory.generatedDefinitions) || !inventory.generatedDefinitions.length || inventory.generatedDefinitions.length > 100) throw new Error('Research inventory must include generated global definitions.');
  const codexHome = path.dirname(root);
  const expectedDefinitions = await generateResearchDefinitions(root, root, codexHome);
  const expectedInventory = expectedDefinitions.map(definition => ({ kind: definition.kind, name: definition.name, sha256: digest(definition.bytes) }));
  if (JSON.stringify(inventory.generatedDefinitions) !== JSON.stringify(expectedInventory)) throw new Error('Global research definitions differ from their catalog, roles or model configuration.');
  for (const definition of expectedDefinitions) {
    const canonicalHome = await realpath(codexHome);
    const canonicalFile = await realpath(definition.path);
    if (!within(canonicalHome, canonicalFile)) throw new Error('Global research definition leaves the Codex profile.');
    // Reject directory links too, even when a link resolves within the profile.
    let current = definition.path;
    while (current !== codexHome) {
      if ((await lstat(current)).isSymbolicLink()) throw new Error('Global research definition must not use filesystem links.');
      current = path.dirname(current);
    }
    if (digest(await regularBytes(definition.path, 1024 * 1024)) !== digest(definition.bytes)) throw new Error('Global research agent or skill differs from its installed inventory.');
  }
  if (inventory.packageHash !== digest(JSON.stringify({ files: inventory.files, generatedDefinitions: inventory.generatedDefinitions }))) throw new Error('Research package inventory digest does not match.');
  return { status: 'verified', verifiedFiles: inventory.files.length, verifiedDefinitions: expectedDefinitions.length };
}
