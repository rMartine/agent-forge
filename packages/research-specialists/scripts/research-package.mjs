import { createHash } from 'node:crypto';
import { readFile, readdir, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const repositoryRoot = path.resolve(sourceRoot, '..', '..');
const digest = data => createHash('sha256').update(data).digest('hex');
const excluded = new Set(['.gitignore', '.gitattributes', '__pycache__', '.venv', 'runtime', 'package-integrity.json', 'runtime.json']);

export async function filesBelow(root, relative = '') {
  const files = [];
  for (const entry of await readdir(path.join(root, relative), { withFileTypes: true })) {
    if (excluded.has(entry.name) || entry.name.endsWith('.pyc')) continue;
    if (entry.isSymbolicLink()) throw new Error('Research source cannot contain symbolic links');
    const name = path.posix.join(relative.replaceAll('\\', '/'), entry.name);
    if (entry.isDirectory()) files.push(...await filesBelow(root, name));
    else if (entry.isFile()) files.push(name);
  }
  return files.sort();
}

function contained(root, relative) {
  if (typeof relative !== 'string' || path.isAbsolute(relative) || relative.split(/[\\/]/).includes('..')) throw new Error('Research reference must stay inside the module');
  const result = path.resolve(root, relative);
  if (!result.startsWith(path.resolve(root) + path.sep)) throw new Error('Research reference leaves module');
  return result;
}

export async function inspectPackage(root = sourceRoot) {
  const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
  if (manifest.schemaVersion !== 1 || manifest.packageName !== 'research-specialists' || manifest.skills !== 'skills' || manifest.hooks !== 'hooks/hooks.json' || manifest.roster !== 'research-roster.json') throw new Error('Unexpected research module manifest');
  const catalog = JSON.parse(await readFile(path.join(root, manifest.roster), 'utf8'));
  if (catalog.version !== 1 || catalog.specialists.length !== 20 || new Set(catalog.specialists.map(a => a.id)).size !== 20) throw new Error('Exactly twenty unique research specialists are required');
  let validateModel;
  try { ({ validateCodexModelConfiguration: validateModel } = await import(new URL('../../core/dist/models.js', import.meta.url))); }
  catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }
  for (const agent of [catalog.coordinator, ...catalog.specialists]) {
    if (!/^research-[a-z0-9-]+$/.test(agent.id) || !['gpt-6-astra', 'gpt-6.1-sol'].includes(agent.model) || !['medium', 'high'].includes(agent.reasoning)) throw new Error(`Unapproved model configuration for ${agent.id}`);
    if (agent !== catalog.coordinator && typeof agent.readOnly !== 'boolean') throw new Error('Each research specialist must declare readOnly');
    if (validateModel) { const issue = validateModel(agent.model, agent.reasoning); if (issue) throw new Error(issue); }
    for (const relative of [agent.roleFile, agent.skill, ...(agent.skills || [])].filter(Boolean)) {
      const candidate = contained(root, relative);
      if (!(await stat(candidate)).isFile()) throw new Error(`Missing procedure: ${relative}`);
      if (!(await realpath(candidate)).startsWith((await realpath(root)) + path.sep)) throw new Error('Procedure resolves outside module');
    }
  }
  const skills = (await readdir(path.join(root, 'skills'), { withFileTypes: true })).filter(entry => entry.isDirectory());
  if (skills.length !== 21) throw new Error('Exactly twenty-one complete research skill directories are required');
  for (const skill of skills) if (!(await stat(path.join(root, 'skills', skill.name, 'SKILL.md'))).isFile()) throw new Error(`Missing research skill: ${skill.name}`);
  const hooks = JSON.parse(await readFile(path.join(root, 'hooks', 'hooks.json'), 'utf8'));
  const expected = ['PreToolUse', 'PostToolUse', 'SubagentStart', 'SubagentStop', 'Stop', 'Interrupt', 'SessionEnd'];
  if (Object.keys(hooks.hooks).sort().join() !== expected.sort().join()) throw new Error('Research hook events do not match the approved seven events');
  const filenames = await filesBelow(root);
  if (filenames.some(name => /(^|\/)\.env($|\.)|(^|\/)(node_modules|\.git)\//.test(name))) throw new Error('Unexpected secret or dependency artifact in module');
  const files = await Promise.all(filenames.map(async name => ({ path: name, sha256: digest(await readFile(path.join(root, name))) })));
  return { version: 1, packageName: manifest.packageName, moduleVersion: manifest.version, packageHash: digest(JSON.stringify(files)), specialists: catalog.specialists.length, skills: skills.length, files };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv[2] !== 'check' || process.argv.length > 4) throw new Error('Usage: node scripts/research-specialists.mjs check [module-root]');
    const value = await inspectPackage(process.argv[3] || sourceRoot);
    console.log(JSON.stringify({ ...value, files: value.files.length }, null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
