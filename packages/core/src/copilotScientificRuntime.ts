import { createHash } from 'node:crypto';
import { lstat, readFile, realpath } from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

export interface CopilotScientificFile { sourcePath: string; relativePath: string; content: Buffer; }
export interface CopilotScientificInput { targetPath: string; content: Buffer; }
const digest = (bytes: Buffer | string): string => createHash('sha256').update(bytes).digest('hex');
const json = (value: unknown): Buffer => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const normalized = (value: string): string => process.platform === 'win32' ? path.resolve(value).toLowerCase() : path.resolve(value);
const inside = (root: string, candidate: string): boolean => {
  const relative = path.relative(normalized(root), normalized(candidate));
  return !!relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
};

/** Snapshot installed interpreter metadata and final rendered bytes, without executing Python or research. */
export async function renderCopilotScientificRuntime(repoPath: string, runtimeRoot: string, files?: ReadonlyArray<CopilotScientificInput>): Promise<CopilotScientificFile[]> {
  if (!path.isAbsolute(runtimeRoot)) throw new Error('Scientific runtime requires an absolute Copilot runtime root.');
  const packageRoot = path.join(runtimeRoot, 'research-specialists');
  const sourcePath = path.join(repoPath, 'packages', 'core', 'src', 'copilotScientificRuntime.ts');
  const sourceRuntimePath = path.join(process.env.USERPROFILE ?? os.homedir(), '.codex', 'research-specialists', 'runtime.json');
  const installed = JSON.parse(await readFile(sourceRuntimePath, 'utf8')) as { pythonExecutable?: string; pythonVersion?: string };
  if (typeof installed.pythonExecutable !== 'string' || !path.isAbsolute(installed.pythonExecutable)) throw new Error('The installed research runtime has no absolute Python interpreter path.');
  const pythonExecutable = await realpath(installed.pythonExecutable);
  const pythonStat = await lstat(pythonExecutable);
  if (!pythonStat.isFile() || pythonStat.isSymbolicLink() || pythonStat.size > 128 * 1024 * 1024) throw new Error('The scientific Python interpreter is not a bounded regular file.');
  const result: CopilotScientificFile[] = [{ sourcePath: sourceRuntimePath, relativePath: 'research-specialists/runtime.json', content: json({
    pythonExecutable, sessionDataRoot: path.resolve(runtimeRoot, '..', 'state', 'research'),
    platform: process.platform === 'win32' ? 'windows' : process.platform,
    pythonVersion: typeof installed.pythonVersion === 'string' ? installed.pythonVersion : 'not-observed',
    interpreter: { source: 'existing-workstation-research-runtime', discovery: 'metadata-and-file-inspection-only',
      sha256: digest(await readFile(pythonExecutable)), executionVerified: false },
    installation: 'copilot', isolation: 'No session, assignment, authorization or credential files were imported.',
  }) }];

  // A first pass may request only generated runtime bytes. The final call must
  // receive all final adapted artifacts to produce a usable integrity inventory.
  const inputs = files ?? [];
  const dependencies = new Set(['zotero', 'jupyter-notebook', 'documents', 'presentations', 'spreadsheets', 'pdf', 'latex']);
  const definitionRoots = new Set<string>();
  const definitions: Array<{ kind: string; name: string; path: string; sha256: string }> = [];
  for (const file of inputs) {
    if (!path.isAbsolute(file.targetPath) || !Buffer.isBuffer(file.content)) throw new Error('Scientific integrity inputs require absolute targets and final Buffer contents.');
    if (inside(packageRoot, file.targetPath)) continue;
    const base = path.basename(file.targetPath), portable = file.targetPath.replaceAll('\\', '/');
    const skillMatch = portable.match(/^(.*\/)(agent-forge-copilot-([^/]+))\/(.+)$/);
    let kind: string | undefined, root: string | undefined, name: string | undefined;
    if (/^(?:agent-forge-copilot-)?research-[a-z0-9-]+\.agent\.md$/.test(base) || base === 'agent-forge-research.agent.md') { kind = 'agent'; root = path.dirname(file.targetPath); name = base; }
    else if (skillMatch && (skillMatch[3].startsWith('research-') || dependencies.has(skillMatch[3]))) {
      kind = 'skill'; root = path.resolve(skillMatch[1]); name = `${skillMatch[2]}/${skillMatch[4]}`;
    } else if (inside(runtimeRoot, file.targetPath) && /^(?:hooks|dependencies)[/\\]/.test(path.relative(runtimeRoot, file.targetPath))) {
      kind = 'runtime'; root = runtimeRoot; name = path.relative(runtimeRoot, file.targetPath).replaceAll('\\', '/');
    } else if (base === 'agent-forge-rosters.json') { kind = 'hook'; root = path.dirname(file.targetPath); name = base; }
    if (kind && root && name) {
      definitionRoots.add(path.resolve(root));
      definitions.push({ kind, name, path: path.resolve(file.targetPath), sha256: digest(file.content) });
    }
  }
  const verifier = verifierSource([...definitionRoots].sort());
  result.push({ sourcePath: path.join(repoPath, 'packages', 'research-specialists', 'scripts', 'research-integrity.mjs'),
    relativePath: 'research-specialists/scripts/research-integrity.mjs', content: Buffer.from(verifier) });
  if (!files) return result;

  const packageFiles = new Map<string, { path: string; content: Buffer }>();
  for (const file of inputs) {
    if (!inside(packageRoot, file.targetPath)) continue;
    const relative = path.relative(packageRoot, file.targetPath).replaceAll('\\', '/');
    if (relative === 'package-integrity.json') continue;
    if (packageFiles.has(relative.toLowerCase())) throw new Error(`Duplicate scientific integrity target ${relative}`);
    packageFiles.set(relative.toLowerCase(), { path: relative, content: file.content });
  }
  for (const file of result) {
    const relative = file.relativePath.slice('research-specialists/'.length);
    packageFiles.set(relative.toLowerCase(), { path: relative, content: file.content });
  }
  const required = ['manifest.json', 'research-roster.json', 'roles/research-specialist-common.md', 'scripts/research-session.mjs', 'scripts/research-hooks.mjs', 'scripts/research-integrity.mjs', 'scripts/run-research-python.mjs', 'runtime.json'];
  if (required.some(name => !packageFiles.has(name))) throw new Error('Final scientific runtime files are incomplete. Render the full package before its inventory.');
  const policies = [...packageFiles.keys()].filter(name => name.endsWith('/research_policy.py'));
  if (!policies.length) throw new Error('Scientific authorization policies are missing from the rendered package.');
  if (definitions.filter(file => file.kind === 'agent').length !== 21) throw new Error('Scientific inventory requires all 21 rendered research agent definitions.');
  const researchSkillEntrypoints = definitions.filter(file => file.kind === 'skill' && /^agent-forge-copilot-research-[^/]+\/SKILL\.md$/.test(file.name));
  if (researchSkillEntrypoints.length !== 21) throw new Error('Scientific inventory requires all 21 rendered research skill entrypoints.');
  if (!definitions.some(file => file.kind === 'runtime' && file.name === 'hooks/adapter.mjs') || !definitions.some(file => file.kind === 'hook')) throw new Error('Scientific inventory requires the selected Copilot hook profile and adapter.');
  if (packageFiles.size > 2000 || definitions.length > 10000) throw new Error('Scientific inventory exceeds its verification limits.');
  let total = 0;
  const inventoryFiles = [...packageFiles].sort(([a], [b]) => a.localeCompare(b)).map(([, { path: name, content }]) => {
    if (content.length > 8 * 1024 * 1024) throw new Error('Scientific package file exceeds its verification limit.');
    total += content.length;
    return { path: name, sha256: digest(content) };
  });
  if (total > 128 * 1024 * 1024) throw new Error('Scientific package exceeds its verification limit.');
  definitions.sort((a, b) => a.path.localeCompare(b.path));
  const inventory = { version: 1, format: 'agent-forge-copilot-research-v1', files: inventoryFiles,
    generatedDefinitions: definitions, packageHash: digest(JSON.stringify({ files: inventoryFiles, generatedDefinitions: definitions })),
    validation: 'Hashes cover final rendered bytes, including the Copilot verifier. This is change detection, not a digital signature or proof of scientific correctness.' };
  if (json(inventory).length > 1024 * 1024) throw new Error('Scientific inventory exceeds 1 MiB.');
  result.push({ sourcePath, relativePath: 'research-specialists/package-integrity.json', content: json(inventory) });
  return result;
}

function verifierSource(definitionRoots: string[]): string {
  return `// Copilot adaptation of the original bounded research integrity verifier.
// Checks exact installed bytes; never regenerates Codex definitions or reads its profile.
import { createHash } from 'node:crypto';
import { lstat, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const MODULE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFINITION_ROOTS = ${JSON.stringify(definitionRoots)};
const REQUIRED = ['manifest.json','research-roster.json','roles/research-specialist-common.md','scripts/research-session.mjs','scripts/research-hooks.mjs','scripts/research-integrity.mjs','scripts/run-research-python.mjs','runtime.json'];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const normalize = value => process.platform === 'win32' ? path.resolve(value).toLowerCase() : path.resolve(value);
const within = (root, candidate) => { const relative = path.relative(normalize(root), normalize(candidate)); return !!relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative); };
async function regularBytes(file, maximum) {
  const info = await lstat(file);
  if (!info.isFile() || info.isSymbolicLink() || info.size > maximum) throw new Error('Research package integrity requires bounded regular files.');
  const bytes = await readFile(file);
  if (bytes.length > maximum) throw new Error('Research package file exceeds its verification limit.');
  return bytes;
}
async function containedBytes(root, file) {
  if (!within(root, file) || !within(await realpath(root), await realpath(file))) throw new Error('Research integrity reference leaves its registered scope.');
  let cursor = path.resolve(file), boundary = path.resolve(root);
  while (normalize(cursor) !== normalize(boundary)) {
    if ((await lstat(cursor)).isSymbolicLink()) throw new Error('Research integrity references must not use filesystem links.');
    cursor = path.dirname(cursor);
  }
  if ((await lstat(boundary)).isSymbolicLink()) throw new Error('Research integrity scope must not be a filesystem link.');
  return regularBytes(file, 8 * 1024 * 1024);
}
export async function verifyResearchPackageIntegrity(pluginRoot = MODULE_ROOT) {
  const root = await realpath(pluginRoot);
  let bytes;
  try { bytes = await regularBytes(path.join(root, 'package-integrity.json'), 1024 * 1024); }
  catch (error) { if (error.code === 'ENOENT') return { status: 'not-installed', verifiedFiles: 0 }; throw error; }
  const inventory = JSON.parse(bytes.toString('utf8'));
  if (inventory.version !== 1 || inventory.format !== 'agent-forge-copilot-research-v1' || !Array.isArray(inventory.files) || !inventory.files.length || inventory.files.length > 2000 || !Array.isArray(inventory.generatedDefinitions) || !inventory.generatedDefinitions.length || inventory.generatedDefinitions.length > 10000) throw new Error('Invalid Copilot research inventory.');
  const paths = new Set(); let total = 0;
  for (const file of inventory.files) {
    if (!file || typeof file.path !== 'string' || !file.path || file.path.length > 512 || /[\\\\:\\u0000-\\u001f]/.test(file.path) || path.isAbsolute(file.path) || file.path.split('/').some(part => !part || part === '.' || part === '..') || !/^[a-f0-9]{64}$/.test(file.sha256)) throw new Error('Invalid scientific file reference.');
    const key = file.path.toLowerCase();
    if (paths.has(key) || key === 'package-integrity.json') throw new Error('Duplicate or recursive scientific reference.');
    paths.add(key);
    const content = await containedBytes(root, path.resolve(root, file.path));
    total += content.length;
    if (total > 128 * 1024 * 1024 || digest(content) !== file.sha256) throw new Error('Scientific package changed or exceeds its verification limit.');
  }
  if (REQUIRED.some(name => !paths.has(name)) || ![...paths].some(name => name.endsWith('/research_policy.py'))) throw new Error('Required scientific runtime or authorization policy is missing.');
  const seen = new Set();
  for (const definition of inventory.generatedDefinitions) {
    if (!definition || typeof definition.path !== 'string' || !path.isAbsolute(definition.path) || !/^[a-f0-9]{64}$/.test(definition.sha256)) throw new Error('Invalid Copilot definition reference.');
    const key = normalize(definition.path);
    if (seen.has(key)) throw new Error('Duplicate Copilot definition.');
    seen.add(key);
    const scope = DEFINITION_ROOTS.find(candidate => within(candidate, definition.path));
    if (!scope) throw new Error('Copilot definition is outside the installed scopes.');
    const content = await containedBytes(scope, definition.path);
    total += content.length;
    if (total > 128 * 1024 * 1024 || digest(content) !== definition.sha256) throw new Error('Copilot research definition differs from its reviewed installation.');
  }
  if (inventory.generatedDefinitions.filter(file => file.kind === 'agent').length !== 21 || inventory.generatedDefinitions.filter(file => file.kind === 'skill' && /^agent-forge-copilot-research-[^/]+\\/SKILL\\.md$/.test(file.name)).length !== 21) throw new Error('Copilot research definition inventory is incomplete.');
  if (inventory.packageHash !== digest(JSON.stringify({ files: inventory.files, generatedDefinitions: inventory.generatedDefinitions }))) throw new Error('Scientific inventory digest does not match.');
  return { status: 'verified', verifiedFiles: inventory.files.length, verifiedDefinitions: inventory.generatedDefinitions.length };
}
`;
}
