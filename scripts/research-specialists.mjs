export { inspectPackage, filesBelow, sourceRoot, repositoryRoot } from '../packages/research-specialists/scripts/research-package.mjs';
import { inspectPackage, sourceRoot } from '../packages/research-specialists/scripts/research-package.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) try {
  if (process.argv[2] !== 'check' || process.argv.length > 4) throw new Error('Usage: node scripts/research-specialists.mjs check [module-root]');
  const value = await inspectPackage(process.argv[3] || sourceRoot);
  console.log(JSON.stringify({ ...value, files: value.files.length }, null, 2));
} catch (error) { console.error(error.message); process.exitCode = 1; }
