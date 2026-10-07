import { randomUUID } from 'node:crypto';
import { lstat, mkdir, realpath } from 'node:fs/promises';
import * as path from 'node:path';
import { assertGraphifyPlainPath, graphifyChild, graphifyHash, graphifyJsonHash, graphifyMissing, listGraphifyFiles, readGraphifyFile, withGraphifyLock, writeGraphifyFile } from './graphifyFiles.js';
import { graphifyEnvironment, runGraphifyProcess } from './graphifyProcess.js';
import { verifyGraphifyRuntime, type GraphifyRuntime } from './graphifyRuntime.js';

export interface GraphifyScope { include?: string[]; exclude?: string[]; }
export interface GraphifySelection {
  repositoryPath: string; projectId: string; scopeHash: string; contentHash: string;
  files: { path: string; sha256: string; size: number }[];
  excluded: { path: string; reason: string }[];
}
export interface GraphifyIndexMetadata {
  schemaVersion: 1; repositoryPath: string; projectId: string; runtimeId: string;
  generationId: string; contentHash: string; scopeHash: string; graphPath: string; graphHash: string;
  builtAt: string; fileCount: number; excludedCount: number; nodeCount: number; edgeCount: number;
}
export interface GraphifyStatus {
  status: 'missing' | 'fresh' | 'stale' | 'invalid'; metadata?: GraphifyIndexMetadata; reason?: string;
}
export interface GraphifyIndexOptions extends GraphifyScope {
  runtime: GraphifyRuntime; repositoryPath: string; signal?: AbortSignal; timeoutMs?: number;
}

const codeExtensions = new Set(['.py', '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.go', '.rs', '.java', '.cs', '.c', '.h', '.cc', '.cpp', '.hpp', '.rb', '.php', '.swift', '.kt', '.kts', '.scala', '.lua', '.ps1', '.sh', '.bash', '.vue', '.svelte', '.astro']);
const codeManifests = new Set(['package.json', 'tsconfig.json', 'jsconfig.json', 'cargo.toml', 'pyproject.toml', 'go.mod', 'go.sum']);
const skippedDirectories = new Set(['.git', '.hg', '.svn', '.cache', '.graphify', 'graphify-out', 'node_modules', 'vendor', 'dist', 'build', 'target', '.venv', 'venv', '__pycache__', '.next', 'coverage', '.terraform', '.aws', '.ssh', '.gnupg', '.azure', '.kube', 'secrets', '.secrets', 'credentials']);
const sensitiveName = /(^\.env(?:\.|$)|^\.envrc(?:\.|$)|^\.(?:npmrc|pypirc|netrc|git-credentials|pgpass)$|(?:^|[._-])(?:secret|secrets|credential|credentials|private[._-]?key)(?:[._-]|$)|\.(?:pem|key|p12|pfx|crt|der)$|^id_(?:rsa|dsa|ecdsa|ed25519))/i;
const sensitiveContent = /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----|\b(?:AKIA|ASIA)[A-Z0-9]{16}\b|\bgh[pousr]_[a-zA-Z0-9]{30,}\b|\bgithub_pat_[a-zA-Z0-9_]{30,}\b|\bsk-(?:proj-)?[a-zA-Z0-9_-]{32,}\b|(?:password|passwd|api[_-]?key|client[_-]?secret|access[_-]?token)\s*[=:]\s*["'][^"'\r\n]{8,}["']/i;

function scopePattern(value: string): RegExp {
  if (!value || value.length > 200 || /[\\:\u0000-\u001f]/.test(value) || value.startsWith('/') || value.split('/').includes('..')) throw new Error('Graphify scope patterns must be relative, slash-separated glob patterns');
  let expression = '';
  for (let index = 0; index < value.length; index++) {
    const character = value[index];
    if (character === '*' && value[index + 1] === '*') {
      index++;
      if (value[index + 1] === '/') { expression += '(?:.*/)?'; index++; } else expression += '.*';
    } else if (character === '*') expression += '[^/]*';
    else if (character === '?') expression += '[^/]';
    else expression += character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${expression}$`, 'i');
}

export async function graphifyProjectDirectory(managedRoot: string, repositoryPath: string): Promise<{ repositoryPath: string; projectId: string; directory: string }> {
  await assertGraphifyPlainPath(repositoryPath);
  const canonical = await realpath(repositoryPath);
  if (!(await lstat(canonical)).isDirectory()) throw new Error('Graphify repository must be a directory');
  const projectId = graphifyHash(process.platform === 'win32' ? canonical.toLowerCase() : canonical);
  return { repositoryPath: canonical, projectId, directory: graphifyChild(managedRoot, `projects/${projectId}`) };
}

/** Hash only eligible local code, never documents/media or known credentials. No source bytes leave this function. */
export async function selectGraphifyFiles(repositoryPath: string, scope: GraphifyScope & { signal?: AbortSignal } = {}): Promise<GraphifySelection> {
  scope.signal?.throwIfAborted();
  await assertGraphifyPlainPath(repositoryPath);
  const canonical = await realpath(repositoryPath);
  const projectId = graphifyHash(process.platform === 'win32' ? canonical.toLowerCase() : canonical);
  const include = (scope.include ?? ['**']).map(scopePattern);
  const exclude = (scope.exclude ?? []).map(scopePattern);
  const scopeHash = graphifyJsonHash({ policyVersion: 1, include: scope.include ?? ['**'], exclude: scope.exclude ?? [] });
  const excluded: GraphifySelection['excluded'] = [];
  const names = await listGraphifyFiles(canonical, (relative, directory) => {
    const parts = relative.toLowerCase().split('/');
    const denied = (directory && skippedDirectories.has(parts[parts.length - 1])) || exclude.some(pattern => pattern.test(relative) || (directory && pattern.test(`${relative}/`))) || sensitiveName.test(parts[parts.length - 1]);
    if (denied) excluded.push({ path: relative, reason: 'Excluded by directory, secret-name, or explicit scope rule' });
    return denied;
  }, scope.signal);
  let gitPaths: Set<string> | undefined;
  let hasGitMetadata = false;
  try { await lstat(path.join(canonical, '.git')); hasGitMetadata = true; }
  catch (error) { if (!graphifyMissing(error)) throw error; }
  if (hasGitMetadata) {
    const output = await runGraphifyProcess('git', ['-C', canonical, '-c', 'core.fsmonitor=false', '-c', 'core.untrackedCache=false', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: canonical, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' }, maxOutputBytes: 8 * 1024 * 1024, timeoutMs: 30_000, signal: scope.signal });
    gitPaths = new Set(output.stdout.split('\0').filter(Boolean).map(file => file.replaceAll('\\', '/')));
  }
  const files: GraphifySelection['files'] = []; let total = 0;
  for (const relative of names) {
    scope.signal?.throwIfAborted();
    if (gitPaths && !gitPaths.has(relative)) { excluded.push({ path: relative, reason: 'Excluded by Git ignore rules' }); continue; }
    if (!include.some(pattern => pattern.test(relative))) { excluded.push({ path: relative, reason: 'Outside the selected code scope' }); continue; }
    if (!codeExtensions.has(path.extname(relative).toLowerCase()) && !codeManifests.has(path.basename(relative).toLowerCase())) continue;
    const source = graphifyChild(canonical, relative);
    if ((await lstat(source)).size > 2 * 1024 * 1024) throw new Error(`Graphify code file exceeds the 2 MiB input limit: ${relative}`);
    const bytes = await readGraphifyFile(source);
    if (sensitiveContent.test(bytes.toString('utf8'))) { excluded.push({ path: relative, reason: 'Potential embedded credential or private key' }); continue; }
    if (bytes.includes(0)) { excluded.push({ path: relative, reason: 'Binary content in a source-code path' }); continue; }
    total += bytes.length;
    if (total > 64 * 1024 * 1024 || files.length >= 10_000) throw new Error('Graphify selected input exceeds 64 MiB or 10,000 code files; select a narrower scope');
    files.push({ path: relative, sha256: graphifyHash(bytes), size: bytes.length });
  }
  const contentHash = graphifyJsonHash({ scopeHash, files });
  return { repositoryPath: canonical, projectId, scopeHash, contentHash, files, excluded };
}

async function readMetadata(options: GraphifyIndexOptions, selection: GraphifySelection): Promise<GraphifyIndexMetadata> {
  const location = await graphifyProjectDirectory(options.runtime.managedRoot, selection.repositoryPath);
  const metadata = JSON.parse((await readGraphifyFile(path.join(location.directory, 'status.json'))).toString('utf8')) as GraphifyIndexMetadata;
  if (metadata.schemaVersion !== 1 || metadata.projectId !== selection.projectId || metadata.repositoryPath !== selection.repositoryPath || !/^[a-f0-9]{16}-[a-f0-9-]{36}$/.test(metadata.generationId)) throw new Error('Invalid Graphify index metadata');
  const graphPath = graphifyChild(location.directory, `generations/${metadata.generationId}/graphify-out/graph.json`);
  if (metadata.graphPath !== graphPath || graphifyHash(await readGraphifyFile(graphPath)) !== metadata.graphHash) throw new Error('Graphify index bytes do not match their metadata');
  return metadata;
}

export async function getGraphifyStatus(options: GraphifyIndexOptions): Promise<GraphifyStatus> {
  const location = await graphifyProjectDirectory(options.runtime.managedRoot, options.repositoryPath);
  try { await readGraphifyFile(path.join(location.directory, 'status.json')); }
  catch (error) { if (graphifyMissing(error)) return { status: 'missing' }; return { status: 'invalid', reason: 'Index metadata is not a regular file' }; }
  try {
    const selection = await selectGraphifyFiles(options.repositoryPath, options);
    const metadata = await readMetadata(options, selection);
    return metadata.contentHash === selection.contentHash && metadata.scopeHash === selection.scopeHash && metadata.runtimeId === options.runtime.runtimeId
      ? { status: 'fresh', metadata }
      : { status: 'stale', metadata, reason: 'Selected code, scope, or Graphify runtime has changed' };
  } catch {
    options.signal?.throwIfAborted();
    return { status: 'invalid', reason: 'Index or source integrity verification failed; rebuild after resolving the input error' };
  }
}

export async function buildGraphifyIndex(options: GraphifyIndexOptions & { rebuild?: boolean }): Promise<GraphifyIndexMetadata> {
  await verifyGraphifyRuntime(options.runtime, { signal: options.signal });
  const location = await graphifyProjectDirectory(options.runtime.managedRoot, options.repositoryPath);
  return withGraphifyLock(path.join(location.directory, 'operation.lock'), async () => {
    if (options.signal?.aborted) throw new Error('Graphify operation cancelled');
    const selection = await selectGraphifyFiles(options.repositoryPath, options);
    if (!selection.files.length) throw new Error('No eligible local code files were selected for Graphify');
    if (!options.rebuild) {
      try {
        const current = await readMetadata(options, selection);
        if (current.contentHash === selection.contentHash && current.runtimeId === options.runtime.runtimeId) return current;
      } catch (error) { if (!graphifyMissing(error)) throw error; }
    }
    const generationId = `${selection.contentHash.slice(0, 16)}-${randomUUID()}`;
    const generation = graphifyChild(location.directory, `generations/${generationId}`);
    const snapshot = path.join(generation, 'source');
    const privateHome = path.join(generation, 'home');
    await assertGraphifyPlainPath(generation); await mkdir(path.join(privateHome, 'tmp'), { recursive: true }); await mkdir(snapshot);
    // Stop Graphify's ancestor-ignore discovery at the selected snapshot. An empty
    // marker is sufficient; no Git command, hook, config or original .git is copied.
    await mkdir(path.join(snapshot, '.git'));
    // Complete fresh generations avoid mixing previous semantic data and isolate each content snapshot's cache.
    for (const file of selection.files) {
      options.signal?.throwIfAborted();
      const bytes = await readGraphifyFile(graphifyChild(selection.repositoryPath, file.path));
      if (graphifyHash(bytes) !== file.sha256) throw new Error('Selected source changed while preparing the Graphify snapshot');
      await writeGraphifyFile(graphifyChild(snapshot, file.path), bytes);
    }
    await writeGraphifyFile(path.join(generation, 'selection.json'), JSON.stringify(selection, null, 2) + '\n');
    await runGraphifyProcess(options.runtime.pythonPath, ['-I', '-B', path.join(options.runtime.runtimePath, 'helpers', 'run_local.py'), options.runtime.runtimePath, generation, 'extract', snapshot, '--code-only', '--no-cluster', '--max-workers', '1', '--out', generation], { cwd: generation, env: graphifyEnvironment(privateHome), signal: options.signal, timeoutMs: options.timeoutMs ?? 180_000 });
    const graphPath = path.join(generation, 'graphify-out', 'graph.json');
    const graphBytes = await readGraphifyFile(graphPath);
    const graph = JSON.parse(graphBytes.toString('utf8')) as { nodes: Record<string, unknown>[]; edges?: unknown[]; links?: unknown[]; input_tokens?: number; output_tokens?: number };
    if (!Array.isArray(graph.nodes) || !graph.nodes.length || (!Array.isArray(graph.edges) && !Array.isArray(graph.links)) || (graph.input_tokens ?? 0) !== 0 || (graph.output_tokens ?? 0) !== 0) throw new Error('Graphify did not produce a nonempty local code graph');
    const allowed = new Set(selection.files.map(file => file.path));
    for (const node of graph.nodes) {
      if (typeof node.source_file !== 'string' || !node.source_file) continue;
      const source = path.isAbsolute(node.source_file) ? path.relative(snapshot, node.source_file).replaceAll('\\', '/') : node.source_file.replaceAll('\\', '/');
      if (!allowed.has(source)) throw new Error('Graphify output references a file outside the selected code snapshot');
    }
    const after = await selectGraphifyFiles(options.repositoryPath, options);
    if (after.contentHash !== selection.contentHash || options.signal?.aborted) throw new Error('Selected source changed or operation was cancelled before publication; previous index remains active');
    const metadata: GraphifyIndexMetadata = { schemaVersion: 1, repositoryPath: selection.repositoryPath, projectId: selection.projectId, runtimeId: options.runtime.runtimeId, generationId, contentHash: selection.contentHash, scopeHash: selection.scopeHash, graphPath, graphHash: graphifyHash(graphBytes), builtAt: new Date().toISOString(), fileCount: selection.files.length, excludedCount: selection.excluded.length, nodeCount: graph.nodes.length, edgeCount: (graph.edges ?? graph.links ?? []).length };
    await writeGraphifyFile(path.join(generation, 'index.json'), JSON.stringify(metadata, null, 2) + '\n');
    await writeGraphifyFile(path.join(location.directory, 'status.json'), JSON.stringify(metadata, null, 2) + '\n');
    return metadata;
  });
}

export async function queryGraphify(options: GraphifyIndexOptions & {
  operation: 'query' | 'affected' | 'path' | 'explain'; text: string; target?: string; depth?: number; budget?: number;
}): Promise<{ output: string; metadata: GraphifyIndexMetadata }> {
  await verifyGraphifyRuntime(options.runtime, { signal: options.signal });
  if (!['query', 'affected', 'path', 'explain'].includes(options.operation) || typeof options.text !== 'string' || !options.text.trim() || options.text.length > 2000 || /[\u0000-\u001f]/.test(options.text)) throw new Error('Invalid Graphify query');
  const location = await graphifyProjectDirectory(options.runtime.managedRoot, options.repositoryPath);
  return withGraphifyLock(path.join(location.directory, 'operation.lock'), async () => {
    const status = await getGraphifyStatus(options);
    if (status.status !== 'fresh' || !status.metadata) throw new Error(`Graphify index is ${status.status}; build a current index before querying it`);
    const metadata = status.metadata;
    const generation = path.dirname(path.dirname(metadata.graphPath));
    let text = options.text;
    if (options.operation === 'affected' && path.isAbsolute(text)) {
      text = path.relative(metadata.repositoryPath, text).replaceAll('\\', '/');
      if (text.startsWith('../') || text === '..' || path.isAbsolute(text)) throw new Error('Graphify affected path is outside the repository');
    }
    const args = [options.operation, text];
    if (options.operation === 'path') {
      if (!options.target || options.target.length > 2000 || /[\u0000-\u001f]/.test(options.target)) throw new Error('Graphify path requires a target');
      args.push(options.target, '--directed');
    }
    if (options.operation === 'query') {
      const budget = options.budget ?? 2000;
      if (!Number.isInteger(budget) || budget < 1 || budget > 8000) throw new Error('Graphify query budget must be 1–8000');
      args.push('--budget', String(budget));
    }
    if (options.operation === 'affected') {
      const depth = options.depth ?? 2;
      if (!Number.isInteger(depth) || depth < 1 || depth > 8) throw new Error('Graphify affected depth must be 1–8');
      args.push('--depth', String(depth));
    }
    args.push('--graph', metadata.graphPath);
    const result = await runGraphifyProcess(options.runtime.pythonPath, ['-I', '-B', path.join(options.runtime.runtimePath, 'helpers', 'run_local.py'), options.runtime.runtimePath, generation, ...args], { cwd: generation, env: graphifyEnvironment(path.join(generation, 'home')), signal: options.signal, timeoutMs: options.timeoutMs ?? 30_000, maxOutputBytes: 1024 * 1024 });
    if ((await selectGraphifyFiles(options.repositoryPath, options)).contentHash !== metadata.contentHash) throw new Error('Source changed during the Graphify query; its result was not returned');
    return { output: result.stdout, metadata };
  });
}
