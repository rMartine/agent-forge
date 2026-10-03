import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectPackage } from './research-specialists.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(root, 'packages', 'research-specialists', 'tests');
const args = process.argv.slice(2);
if (args[0] !== '--python' || args.length !== 2 || !path.isAbsolute(args[1])) {
  console.error('Usage: npm run test:research -- --python <absolute-Python-with-locked-dependencies>');
  process.exitCode = 1;
} else {
  try {
    await inspectPackage();
    const commands = [[process.execPath, ['--test', ...readdirSync(directory).filter(name => name.endsWith('.test.mjs')).map(name => path.join(directory, name))]], [args[1], ['-m', 'unittest', 'discover', '-s', directory, '-p', 'test_*.py', '-v']]];
    for (const [binary, command] of commands) {
      const result = spawnSync(binary, command, { cwd: root, stdio: 'inherit', windowsHide: true, shell: false, env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTHONUTF8: '1', MPLBACKEND: 'Agg' } });
      if (result.error) throw result.error;
      if (result.status !== 0) throw new Error(`Research checks failed with status ${result.status}`);
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
