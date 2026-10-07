import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, realpath, rename, rmdir, unlink, writeFile } from 'node:fs/promises';
import * as path from 'node:path';

export const graphifyHash = (value: string | Buffer): string => createHash('sha256').update(value).digest('hex');
export const graphifyJsonHash = (value: unknown): string => graphifyHash(JSON.stringify(value));
export const graphifyMissing = (error: unknown): boolean => (error as NodeJS.ErrnoException).code === 'ENOENT';

export function graphifyRelative(value: string): string {
  if (!value || path.isAbsolute(value) || /[\\:\u0000-\u001f]/.test(value) || value.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Graphify requires an ordinary relative path');
  return value;
}

export function graphifyChild(root: string, relative: string): string {
  return path.join(path.resolve(root), ...graphifyRelative(relative).split('/'));
}

/** Reject symlinks and Windows junctions in existing ancestors, including the final path. */
export async function assertGraphifyPlainPath(target: string): Promise<void> {
  const absolute = path.resolve(target);
  let current = path.parse(absolute).root;
  for (const component of absolute.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, component);
    try {
      const info = await lstat(current);
      if (info.isSymbolicLink()) throw new Error(`Graphify refuses a symbolic link or reparse point: ${current}`);
      const actual = await realpath(current);
      const normalize = (value: string) => process.platform === 'win32' ? path.resolve(value).toLowerCase() : path.resolve(value);
      if (normalize(actual) !== normalize(current)) throw new Error(`Graphify path resolves outside its recorded location: ${current}`);
    } catch (error) { if (graphifyMissing(error)) return; throw error; }
  }
}

export async function readGraphifyFile(target: string): Promise<Buffer> {
  await assertGraphifyPlainPath(target);
  if (!(await lstat(target)).isFile()) throw new Error(`Graphify requires a regular file: ${target}`);
  return readFile(target);
}

export async function writeGraphifyFile(target: string, bytes: string | Buffer): Promise<void> {
  await assertGraphifyPlainPath(target);
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, bytes, { flag: 'wx' });
    await assertGraphifyPlainPath(target);
    await rename(temporary, target);
  } finally { await unlink(temporary).catch(error => { if (!graphifyMissing(error)) throw error; }); }
}

export async function withGraphifyLock<T>(directory: string, action: () => Promise<T>): Promise<T> {
  await assertGraphifyPlainPath(directory);
  await mkdir(path.dirname(directory), { recursive: true });
  try { await mkdir(directory); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new Error(`Graphify operation is busy. An interrupted operation may leave this lock; inspect it before removing it: ${directory}`);
    throw error;
  }
  try {
    await writeFile(path.join(directory, 'owner.json'), JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }), { flag: 'wx' });
    return await action();
  } finally {
    await assertGraphifyPlainPath(directory);
    await unlink(path.join(directory, 'owner.json')).catch(error => { if (!graphifyMissing(error)) throw error; });
    await rmdir(directory);
  }
}

export async function listGraphifyFiles(root: string, skip: (relative: string, directory: boolean) => boolean = () => false, signal?: AbortSignal): Promise<string[]> {
  signal?.throwIfAborted();
  await assertGraphifyPlainPath(root);
  const result: string[] = [];
  async function visit(relative: string): Promise<void> {
    signal?.throwIfAborted();
    const entries = await readdir(relative ? graphifyChild(root, relative) : root, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      signal?.throwIfAborted();
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      if (skip(name, entry.isDirectory())) continue;
      if (entry.isSymbolicLink()) throw new Error(`Graphify refuses a symbolic link or reparse point: ${name}`);
      await assertGraphifyPlainPath(graphifyChild(root, name));
      if (entry.isDirectory()) await visit(name);
      else if (entry.isFile()) result.push(name);
      else throw new Error(`Graphify refuses a non-regular file: ${name}`);
    }
  }
  await visit('');
  return result.sort();
}
