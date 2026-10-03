import { createHash } from 'node:crypto';
import { lstat, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PLUGIN_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REQUIRED_FILES = ['research-roster.json', 'scripts/research-session.mjs', 'scripts/research-hooks.mjs', 'scripts/research-integrity.mjs', 'hooks/hooks.json'];
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
export async function verifyResearchPackageIntegrity(pluginRoot = PLUGIN_ROOT) {
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
    if (!within(root, candidate) || !within(root, await realpath(candidate))) throw new Error('Research package integrity reference leaves the plugin.');
    const contents = await regularBytes(candidate, 8 * 1024 * 1024);
    totalBytes += contents.length;
    if (totalBytes > 128 * 1024 * 1024) throw new Error('Research package exceeds its verification limit.');
    if (digest(contents) !== file.sha256) throw new Error('Research plugin content differs from its installed inventory.');
  }
  if (REQUIRED_FILES.some(file => !paths.has(file))) throw new Error('Research package inventory omits a required runtime file.');
  if (inventory.packageHash !== undefined && inventory.packageHash !== digest(JSON.stringify(inventory.files))) throw new Error('Research package inventory digest does not match.');
  return { status: 'verified', verifiedFiles: inventory.files.length };
}
