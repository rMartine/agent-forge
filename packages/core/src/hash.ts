import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import * as path from 'node:path';

export async function hashFile(filePath: string): Promise<string> {
  const content = await readFile(filePath);
  return hashBuffer(content);
}

export function hashBuffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export async function hashDirectory(directory: string): Promise<string> {
  const hash = createHash('sha256');
  async function visit(current: string): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      const relative = path.relative(directory, fullPath).replaceAll('\\', '/');
      hash.update(relative);
      if (entry.isDirectory()) await visit(fullPath);
      else hash.update(await readFile(fullPath));
    }
  }
  await visit(directory);
  return hash.digest('hex');
}
