import { spawnSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyResearchPackageIntegrity } from './research-integrity.mjs';

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
try {
  if (args[0] !== '--authorization' || args[2] !== '--script' || args[4] !== '--') throw new Error('Usage: node run-research-python.mjs --authorization <policy.json> --script <relative-script.py> -- <arguments>');
  const script = realpathSync(path.resolve(pluginRoot, args[3]));
  if (!script.startsWith(realpathSync(pluginRoot) + path.sep) || !script.endsWith('.py')) throw new Error('Scientific program must be a Python script inside the installed plugin');
  const authorization = realpathSync(args[1]);
  const authorizationBytes = readFileSync(authorization);
  if (authorizationBytes.length > 262144) throw new Error('Authorization file exceeds size limit');
  const grant = JSON.parse(authorizationBytes.toString('utf8').replace(/^\uFEFF/, ''));
  if (grant.version !== 1 || !grant.authorizationReference || !grant.purpose) throw new Error('Research authorization reference and purpose are required');
  const verification = await verifyResearchPackageIntegrity(pluginRoot);
  if (verification.status !== 'verified') throw new Error('An installed package integrity inventory is required');
  const integrity = JSON.parse(readFileSync(path.join(pluginRoot, 'package-integrity.json'), 'utf8'));
  const scriptRelative = path.relative(realpathSync(pluginRoot), script).replaceAll('\\', '/');
  if (!integrity.files.some(file => file.path === scriptRelative) || !integrity.files.some(file => file.path === 'runtime.json')) throw new Error('The scientific program and runtime must be included in the reviewed inventory');
  const runtime = JSON.parse(readFileSync(path.join(pluginRoot, 'runtime.json'), 'utf8'));
  const python = realpathSync(runtime.pythonExecutable);
  const result = spawnSync(python, [script, ...args.slice(5)], { stdio: 'inherit', windowsHide: true, env: { ...process.env, AGENT_FORGE_RESEARCH_AUTHORIZATION: authorization, PYTHONDONTWRITEBYTECODE: '1', PYTHONUTF8: '1' }, shell: false });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} catch (error) { console.error(error.message); process.exitCode = 1; }
