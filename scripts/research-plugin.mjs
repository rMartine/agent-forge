import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, realpath, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const sourceRoot = path.join(repositoryRoot, 'plugins', 'agent-forge-research');
const digest = data => createHash('sha256').update(data).digest('hex');
const excluded = new Set(['.gitignore', '__pycache__', 'tests', '.venv', 'runtime', 'package-integrity.json']);

async function filesBelow(root, relative = '') {
  const files = [];
  for (const entry of await readdir(path.join(root, relative), { withFileTypes: true })) {
    if (excluded.has(entry.name) || entry.name.endsWith('.pyc')) continue;
    if (entry.isSymbolicLink()) throw new Error('Plugin source cannot contain symbolic links');
    const name = path.posix.join(relative.replaceAll('\\', '/'), entry.name);
    if (entry.isDirectory()) files.push(...await filesBelow(root, name));
    else if (entry.isFile()) files.push(name);
  }
  return files.sort();
}

function contained(root, relative) {
  if (typeof relative !== 'string' || path.isAbsolute(relative) || relative.split(/[\\/]/).includes('..')) throw new Error('Plugin reference must stay inside the package');
  const result = path.resolve(root, relative);
  if (!result.startsWith(path.resolve(root) + path.sep)) throw new Error('Plugin reference leaves package');
  return result;
}

export async function inspectPackage(root = sourceRoot) {
  const manifest = JSON.parse(await readFile(path.join(root, '.codex-plugin', 'plugin.json'), 'utf8'));
  if (manifest.name !== 'agent-forge-research' || manifest.skills !== './skills/' || manifest.hooks !== './hooks/hooks.json') throw new Error('Unexpected research plugin manifest');
  const catalog = JSON.parse(await readFile(path.join(root, 'research-roster.json'), 'utf8'));
  if (catalog.version !== 1 || catalog.specialists.length !== 20 || new Set(catalog.specialists.map(a => a.id)).size !== 20) throw new Error('Exactly twenty unique research specialists are required');
  // Reuse the core validator when the development roster publishes it. The
  // plugin remains independently buildable from the integration branch.
  let validateModel;
  try { ({ validateCodexModelConfiguration: validateModel } = await import('../packages/core/dist/models.js')); }
  catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }
  for (const agent of [catalog.coordinator, ...catalog.specialists]) {
    if (!['gpt-6-astra', 'gpt-6.1-sol'].includes(agent.model) || !['medium', 'high'].includes(agent.reasoning)) throw new Error(`Unapproved model configuration for ${agent.id}`);
    if (validateModel) { const issue = validateModel(agent.model, agent.reasoning); if (issue) throw new Error(issue); }
    for (const relative of [agent.roleFile, agent.skill, ...(agent.skills || [])].filter(Boolean)) {
      const candidate = contained(root, relative);
      if (!(await stat(candidate)).isFile()) throw new Error(`Missing procedure: ${relative}`);
      if (!(await realpath(candidate)).startsWith((await realpath(root)) + path.sep)) throw new Error('Procedure resolves outside plugin');
    }
  }
  const hooks = JSON.parse(await readFile(path.join(root, 'hooks', 'hooks.json'), 'utf8'));
  const expected = ['PreToolUse', 'PostToolUse', 'SubagentStart', 'SubagentStop', 'Stop', 'Interrupt', 'SessionEnd'];
  if (Object.keys(hooks.hooks).sort().join() !== expected.sort().join()) throw new Error('Research hook events do not match the approved seven events');
  const filenames = await filesBelow(root);
  if (filenames.some(name => /(^|\/)\.env($|\.)|(^|\/)(node_modules|\.git)\//.test(name))) throw new Error('Unexpected secret or dependency artifact in plugin');
  const files = await Promise.all(filenames.map(async name => ({ path: name, sha256: digest(await readFile(path.join(root, name))) })));
  const packageHash = digest(JSON.stringify(files));
  return { version: 1, plugin: manifest.name, pluginVersion: manifest.version, packageHash, specialists: catalog.specialists.length, files };
}

export async function verifyPackage(root) {
  const expected = JSON.parse(await readFile(path.join(root, 'package-integrity.json'), 'utf8'));
  const actual = await inspectPackage(root);
  if (actual.packageHash !== expected.packageHash || JSON.stringify(actual.files) !== JSON.stringify(expected.files)) throw new Error('Installed research package differs from the reviewed content');
  return actual;
}

export async function preparePackage(output, root = sourceRoot, runtime = undefined) {
  const inventory = await inspectPackage(root);
  const destination = path.resolve(output);
  if (destination === path.resolve(root) || destination.startsWith(path.resolve(root) + path.sep)) throw new Error('Build output must be outside plugin source');
  await mkdir(destination, { recursive: true });
  if ((await readdir(destination)).length) throw new Error('Build output must be empty; reviewed versions are immutable');
  const pluginDirectory = path.join(destination, 'plugins', 'agent-forge-research');
  for (const file of inventory.files) {
    const target = path.join(pluginDirectory, file.path);
    await mkdir(path.dirname(target), { recursive: true });
    await cp(path.join(root, file.path), target, { errorOnExist: true, force: false });
  }
  if (runtime) {
    if (!path.isAbsolute(runtime.pythonExecutable) || !(await stat(runtime.pythonExecutable)).isFile()) throw new Error('Runtime Python must be an existing absolute executable path');
    if (typeof runtime.sessionDataRoot !== 'string' || !path.isAbsolute(runtime.sessionDataRoot) || path.resolve(runtime.sessionDataRoot).startsWith(path.resolve(destination) + path.sep)) throw new Error('Session records require an absolute directory outside the prepared package');
    await writeFile(path.join(pluginDirectory, 'runtime.json'), JSON.stringify({ pythonExecutable: await realpath(runtime.pythonExecutable), sessionDataRoot: path.resolve(runtime.sessionDataRoot), platform: 'windows', pythonVersion: '3.12' }, null, 2) + '\n', { flag: 'wx' });
  }
  const preparedInventory = await inspectPackage(pluginDirectory);
  await writeFile(path.join(pluginDirectory, 'package-integrity.json'), JSON.stringify(preparedInventory, null, 2) + '\n', { flag: 'wx' });
  const marketplace = { name: 'agent-forge-research-local', interface: { displayName: 'Investigación de Agent Forge en esta workstation' }, plugins: [{ name: 'agent-forge-research', source: { source: 'local', path: './plugins/agent-forge-research' }, policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' }, category: 'Productivity' }] };
  await mkdir(path.join(destination, '.agents', 'plugins'), { recursive: true });
  await writeFile(path.join(destination, '.agents', 'plugins', 'marketplace.json'), JSON.stringify(marketplace, null, 2) + '\n', { flag: 'wx' });
  await verifyPackage(pluginDirectory);
  return { marketplaceRoot: destination, pluginDirectory, packageHash: preparedInventory.packageHash, specialistCount: inventory.specialists, fileCount: preparedInventory.files.length, writesToStandaloneAgents: false, writesToVsCode: false };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, ...args] = process.argv.slice(2);
  try {
    const value = command === 'check' ? await inspectPackage(args[0] || sourceRoot)
      : command === 'verify' ? await verifyPackage(args[0])
      : command === 'prepare' && (args.length === 1 || (args.length === 5 && args[1] === '--python' && args[3] === '--data-root')) ? await preparePackage(args[0], sourceRoot, args[2] ? { pythonExecutable: args[2], sessionDataRoot: args[4] } : undefined)
      : (() => { throw new Error('Usage: node scripts/research-plugin.mjs check [plugin-root] | prepare <empty-marketplace-root> [--python <executable> --data-root <absolute-record-directory>] | verify <installed-plugin-root>'); })();
    console.log(JSON.stringify(command === 'check' || command === 'verify' ? { ...value, files: value.files.length } : value, null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
