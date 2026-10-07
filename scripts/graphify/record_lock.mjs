// Maintainer-only lock preparation after a binary-only, hash-checked pip download.
// This reads wheel filenames/bytes and official PyPI metadata; it does not execute wheels.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const directory = path.resolve(process.argv[2] ?? '.cache/graphify/wheels');
const destination = path.resolve(process.argv[3] ?? 'config/graphify-windows-x64-python312.lock.json');
const wheels = [];
for (const filename of (await readdir(directory)).filter(name => name.endsWith('.whl')).sort()) {
  const [distribution, version] = filename.split('-');
  const name = distribution.toLowerCase().replaceAll('_', '-');
  const response = await fetch(`https://pypi.org/pypi/${name}/${version}/json`, { redirect: 'error', signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`PyPI metadata unavailable for ${name}`);
  const metadata = await response.json();
  const published = metadata.urls.find(file => file.filename === filename && file.packagetype === 'bdist_wheel');
  const bytes = await readFile(path.join(directory, filename));
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (!published || published.digests.sha256 !== sha256 || published.size !== bytes.length) throw new Error(`Published wheel mismatch: ${filename}`);
  wheels.push({ name, version, filename, url: published.url, sha256, size: bytes.length });
}
const lock = { schemaVersion: 1, graphifyVersion: '0.9.74', sourceRevision: 'e10df08877f8819a625a1afa38c3297a31fda296', python: { version: '3.12.13', platform: 'win32', architecture: 'x64' }, wheels };
await writeFile(destination, JSON.stringify(lock, null, 2) + '\n', { flag: 'wx' });
console.log(`Recorded ${wheels.length} exact wheel artifacts in ${destination}`);
