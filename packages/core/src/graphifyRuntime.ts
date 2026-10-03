import { mkdir, realpath } from 'node:fs/promises';
import * as path from 'node:path';
import { assertGraphifyPlainPath, graphifyChild, graphifyHash, graphifyJsonHash, graphifyMissing, graphifyRelative, listGraphifyFiles, readGraphifyFile, withGraphifyLock, writeGraphifyFile } from './graphifyFiles.js';
import { graphifyEnvironment, runGraphifyProcess } from './graphifyProcess.js';

export interface GraphifyWheel { name: string; version: string; filename: string; url: string; sha256: string; size: number; }
export interface GraphifyDependencyLock {
  schemaVersion: 1; graphifyVersion: '0.9.74'; sourceRevision: string;
  python: { version: string; platform: 'win32'; architecture: 'x64' };
  wheels: GraphifyWheel[];
}
export interface GraphifyPayloadFile { path: string; sha256: string; size: number; }
export interface GraphifyProvisionPlan {
  schemaVersion: 1; planId: string; createdAt: string; managedRoot: string;
  lock: GraphifyDependencyLock; lockHash: string;
  python: { sourceDirectory: string; executable: string; version: string; files: GraphifyPayloadFile[] };
  helpers: GraphifyPayloadFile[];
  previousRuntimeBase64: string | null;
}
export interface GraphifyRuntime {
  schemaVersion: 1; runtimeId: string; managedRoot: string; runtimePath: string; pythonPath: string;
  graphifyVersion: string; pythonVersion: string; lockHash: string; installedAt: string;
  files: GraphifyPayloadFile[];
}

function validateLock(lock: GraphifyDependencyLock): void {
  if (lock.schemaVersion !== 1 || lock.graphifyVersion !== '0.9.74' || !/^[a-f0-9]{40}$/.test(lock.sourceRevision) || lock.python?.platform !== 'win32' || lock.python.architecture !== 'x64' || lock.python.version !== '3.12.13' || !Array.isArray(lock.wheels)) throw new Error('Unsupported Graphify dependency lock');
  const names = new Set<string>();
  for (const wheel of lock.wheels) {
    if (!/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(wheel.name) || !/^[0-9][a-zA-Z0-9.+-]*$/.test(wheel.version) || !/^[a-zA-Z0-9_.+-]+\.whl$/.test(wheel.filename) || !/^https:\/\/files\.pythonhosted\.org\/packages\/[a-zA-Z0-9_./+-]+\.whl$/.test(wheel.url) || !/^[a-f0-9]{64}$/.test(wheel.sha256) || !Number.isSafeInteger(wheel.size) || wheel.size <= 0 || wheel.size > 128 * 1024 * 1024 || names.has(wheel.name)) throw new Error('Invalid or duplicate Graphify wheel');
    if (!wheel.filename.endsWith('-win_amd64.whl') && !wheel.filename.endsWith('-any.whl')) throw new Error('The Graphify lock contains a wheel for another platform');
    names.add(wheel.name);
  }
  if (lock.wheels.find(item => item.name === 'graphifyy')?.version !== lock.graphifyVersion || !names.has('pip')) throw new Error('Graphify and pinned pip wheels are required');
}

function validatePayload(files: GraphifyPayloadFile[]): void {
  if (!Array.isArray(files) || !files.length) throw new Error('Missing Graphify frozen payload');
  const names = new Set<string>();
  for (const file of files) {
    graphifyRelative(file.path);
    if (!/^[a-f0-9]{64}$/.test(file.sha256) || !Number.isSafeInteger(file.size) || file.size < 0 || file.size > 128 * 1024 * 1024 || names.has(file.path.toLowerCase())) throw new Error('Invalid Graphify payload');
    names.add(file.path.toLowerCase());
  }
}

function planDigest(plan: Omit<GraphifyProvisionPlan, 'planId'> | GraphifyProvisionPlan): string {
  const { planId: _ignored, ...body } = plan as GraphifyProvisionPlan;
  return graphifyJsonHash(body);
}

function validatePlan(plan: GraphifyProvisionPlan): void {
  if (plan.schemaVersion !== 1 || planDigest(plan) !== plan.planId || plan.managedRoot !== path.resolve(plan.managedRoot)) throw new Error('Graphify plan integrity check failed');
  validateLock(plan.lock); validatePayload(plan.python.files); validatePayload(plan.helpers);
  if (graphifyJsonHash(plan.lock) !== plan.lockHash || plan.python.version !== plan.lock.python.version || plan.python.executable !== 'python.exe') throw new Error('Graphify plan runtime mismatch');
  if (plan.helpers.length !== 2 || !plan.helpers.some(file => file.path === 'run_local.py') || !plan.helpers.some(file => file.path === 'install_wheels.py')) throw new Error('Invalid Graphify helper payload');
}

export function validateGraphifyProvisionPlan(plan: GraphifyProvisionPlan): void { validatePlan(plan); }

export async function verifyGraphifyProvisionPlan(plan: GraphifyProvisionPlan): Promise<void> {
  validatePlan(plan);
  const saved = await loadGraphifyProvisionPlan(plan.managedRoot, plan.planId);
  if (JSON.stringify(saved) !== JSON.stringify(plan)) throw new Error('Graphify plan differs from its saved preview');
  for (const item of [...plan.python.files, ...plan.helpers, ...plan.lock.wheels]) await payloadBytes(plan.managedRoot, item);
}

function blobPath(root: string, hash: string): string {
  if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error('Invalid Graphify content hash');
  return graphifyChild(root, `blobs/${hash}`);
}

async function freezeBytes(root: string, relative: string, bytes: Buffer): Promise<GraphifyPayloadFile> {
  const sha256 = graphifyHash(bytes); const destination = blobPath(root, sha256);
  try { if (graphifyHash(await readGraphifyFile(destination)) !== sha256) throw new Error('Graphify frozen payload has been modified'); }
  catch (error) { if (!graphifyMissing(error)) throw error; await writeGraphifyFile(destination, bytes); }
  return { path: relative, sha256, size: bytes.length };
}

async function payloadBytes(root: string, file: Pick<GraphifyPayloadFile, 'sha256' | 'size'>): Promise<Buffer> {
  const bytes = await readGraphifyFile(blobPath(root, file.sha256));
  if (bytes.length !== file.size || graphifyHash(bytes) !== file.sha256) throw new Error('Graphify frozen payload integrity check failed; prepare a new plan');
  return bytes;
}

/** Preview freezes every resolved byte in content-addressed sidecars, including Python itself. */
export async function createGraphifyProvisionPlan(options: {
  managedRoot: string; pythonPath: string; lockPath: string; downloadMissing?: boolean;
  wheelCachePath?: string; helperDirectory?: string; signal?: AbortSignal;
}): Promise<GraphifyProvisionPlan> {
  options.signal?.throwIfAborted();
  const root = path.resolve(options.managedRoot);
  await assertGraphifyPlainPath(root);
  return withGraphifyLock(path.join(root, 'locks', 'provision'), async () => {
    const lock = JSON.parse((await readGraphifyFile(options.lockPath)).toString('utf8')) as GraphifyDependencyLock;
    validateLock(lock);
    if (process.platform !== lock.python.platform || process.arch !== lock.python.architecture) throw new Error('This Graphify lock supports Windows x64 only');
    await assertGraphifyPlainPath(options.pythonPath);
    const privateHome = path.join(root, 'prepare-home'); await mkdir(path.join(privateHome, 'tmp'), { recursive: true });
    const probe = await runGraphifyProcess(path.resolve(options.pythonPath), ['-I', '-B', '-c', 'import json,sys,platform; print(json.dumps({"version":platform.python_version(),"prefix":sys.base_prefix,"executable":sys.executable,"machine":platform.machine()}))'], { cwd: root, env: graphifyEnvironment(privateHome), signal: options.signal });
    const python = JSON.parse(probe.stdout) as { version: string; prefix: string; executable: string; machine: string };
    if (python.version !== lock.python.version || !['AMD64', 'x86_64'].includes(python.machine) || path.resolve(python.executable).toLowerCase() !== path.resolve(options.pythonPath).toLowerCase()) throw new Error('Python does not match the reviewed Graphify lock');
    const sourceDirectory = await realpath(python.prefix);
    const pythonNames = await listGraphifyFiles(sourceDirectory, (relative, directory) => {
      const normalized = relative.toLowerCase();
      // The source owner's PEP 668 marker describes the original uv installation,
      // not this independent byte-for-byte standard-library copy. Never modify it at source.
      return normalized === 'scripts' || normalized === 'lib/site-packages' || normalized === 'lib/externally-managed' || normalized === 'include' || normalized === 'libs' || normalized === 'tcl' || normalized.split('/').includes('__pycache__') || (!directory && /\.(pyc|pyo)$/.test(normalized));
    }, options.signal);
    if (!pythonNames.includes('python.exe') || !pythonNames.includes('python312.dll') || !pythonNames.includes('Lib/os.py')) throw new Error('Python must be a relocatable, complete Windows distribution');
    const pythonFiles: GraphifyPayloadFile[] = [];
    for (const relative of pythonNames) {
      options.signal?.throwIfAborted();
      pythonFiles.push(await freezeBytes(root, relative, await readGraphifyFile(graphifyChild(sourceDirectory, relative))));
    }
    const helperDirectory = options.helperDirectory ?? path.resolve(__dirname, '../../../scripts/graphify');
    const helpers: GraphifyPayloadFile[] = [];
    for (const name of ['run_local.py', 'install_wheels.py']) helpers.push(await freezeBytes(root, name, await readGraphifyFile(path.join(helperDirectory, name))));
    for (const wheel of lock.wheels) {
      options.signal?.throwIfAborted();
      let bytes: Buffer | undefined;
      try { bytes = await payloadBytes(root, wheel); } catch (error) { if (!graphifyMissing(error)) throw error; }
      if (!bytes && options.wheelCachePath) {
        try { bytes = await readGraphifyFile(path.join(options.wheelCachePath, wheel.filename)); } catch (error) { if (!graphifyMissing(error)) throw error; }
      }
      if (!bytes && options.downloadMissing) {
        const download = new AbortController();
        const cancel = () => download.abort(options.signal?.reason);
        options.signal?.addEventListener('abort', cancel, { once: true });
        const timer = setTimeout(() => download.abort(new Error('Graphify download exceeded its time limit')), 60_000);
        try {
          options.signal?.throwIfAborted();
          const response = await fetch(wheel.url, { redirect: 'error', signal: download.signal });
          if (!response.ok || Number(response.headers.get('content-length') ?? wheel.size) > wheel.size) throw new Error(`Unable to download pinned Graphify wheel: ${wheel.name}`);
          const chunks: Buffer[] = []; let length = 0;
          if (!response.body) throw new Error('Empty Graphify download');
          for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
            length += chunk.length;
            if (length > wheel.size) { download.abort(); throw new Error('Graphify wheel download exceeded the locked size'); }
            chunks.push(Buffer.from(chunk));
          }
          bytes = Buffer.concat(chunks);
        } finally {
          clearTimeout(timer); options.signal?.removeEventListener('abort', cancel);
        }
      }
      if (!bytes) throw new Error(`Pinned Graphify wheel is missing: ${wheel.name}; prepare with downloadMissing enabled`);
      if (bytes.length !== wheel.size || graphifyHash(bytes) !== wheel.sha256) throw new Error(`Graphify wheel integrity check failed: ${wheel.name}`);
      await freezeBytes(root, wheel.filename, bytes);
    }
    let previousRuntimeBase64: string | null = null;
    try { previousRuntimeBase64 = (await readGraphifyFile(path.join(root, 'runtime.json'))).toString('base64'); } catch (error) { if (!graphifyMissing(error)) throw error; }
    const body: Omit<GraphifyProvisionPlan, 'planId'> = { schemaVersion: 1, createdAt: new Date().toISOString(), managedRoot: root, lock, lockHash: graphifyJsonHash(lock), python: { sourceDirectory, executable: 'python.exe', version: python.version, files: pythonFiles }, helpers, previousRuntimeBase64 };
    const plan: GraphifyProvisionPlan = { ...body, planId: planDigest(body) };
    options.signal?.throwIfAborted();
    await saveGraphifyProvisionPlan(plan);
    return plan;
  });
}

export async function saveGraphifyProvisionPlan(plan: GraphifyProvisionPlan): Promise<string> {
  validatePlan(plan);
  const destination = graphifyChild(plan.managedRoot, `plans/${plan.planId}/plan.json`);
  const bytes = Buffer.from(JSON.stringify(plan, null, 2) + '\n');
  try { if (!(await readGraphifyFile(destination)).equals(bytes)) throw new Error('An immutable Graphify plan already exists with different bytes'); }
  catch (error) { if (!graphifyMissing(error)) throw error; await writeGraphifyFile(destination, bytes); }
  return destination;
}

export async function loadGraphifyProvisionPlan(managedRoot: string, planId: string): Promise<GraphifyProvisionPlan> {
  if (!/^[a-f0-9]{64}$/.test(planId)) throw new Error('Invalid Graphify plan ID');
  const root = path.resolve(managedRoot);
  const plan = JSON.parse((await readGraphifyFile(graphifyChild(root, `plans/${planId}/plan.json`))).toString('utf8')) as GraphifyProvisionPlan;
  validatePlan(plan);
  if (plan.managedRoot !== root || plan.planId !== planId) throw new Error('Graphify plan belongs to another managed directory');
  return plan;
}

export async function applyGraphifyProvisionPlan(plan: GraphifyProvisionPlan, options: { signal?: AbortSignal } = {}): Promise<GraphifyRuntime> {
  options.signal?.throwIfAborted();
  validatePlan(plan);
  // A preview object must correspond to the saved reviewed plan; application never resolves/downloads.
  const saved = await loadGraphifyProvisionPlan(plan.managedRoot, plan.planId);
  if (JSON.stringify(saved) !== JSON.stringify(plan)) throw new Error('Graphify plan differs from its saved preview');
  return withGraphifyLock(path.join(plan.managedRoot, 'locks', 'provision'), async () => {
    let current: string | null = null;
    try { current = (await readGraphifyFile(path.join(plan.managedRoot, 'runtime.json'))).toString('base64'); } catch (error) { if (!graphifyMissing(error)) throw error; }
    if (current !== plan.previousRuntimeBase64) throw new Error('Graphify runtime changed after preview; prepare a new plan');
    for (const item of [...plan.python.files, ...plan.helpers, ...plan.lock.wheels]) {
      options.signal?.throwIfAborted();
      await payloadBytes(plan.managedRoot, item);
    }
    const runtimePath = graphifyChild(plan.managedRoot, `runtimes/${plan.planId}`);
    await assertGraphifyPlainPath(runtimePath);
    try { await mkdir(runtimePath); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') { await mkdir(path.dirname(runtimePath), { recursive: true }); await mkdir(runtimePath); } else throw new Error('Graphify runtime directory already exists; preserve it and prepare a new plan'); }
    try {
      for (const file of plan.python.files) {
        options.signal?.throwIfAborted();
        await writeGraphifyFile(graphifyChild(runtimePath, `python/${file.path}`), await payloadBytes(plan.managedRoot, file));
      }
      for (const file of plan.helpers) await writeGraphifyFile(graphifyChild(runtimePath, `helpers/${file.path}`), await payloadBytes(plan.managedRoot, file));
      for (const file of plan.lock.wheels) await writeGraphifyFile(graphifyChild(runtimePath, `wheels/${file.filename}`), await payloadBytes(plan.managedRoot, file));
      const requirements = plan.lock.wheels.map(wheel => `${wheel.name}==${wheel.version} --hash=sha256:${wheel.sha256}`).join('\n') + '\n';
      await writeGraphifyFile(path.join(runtimePath, 'requirements.txt'), requirements);
      const privateHome = path.join(runtimePath, 'home'); await mkdir(path.join(privateHome, 'tmp'), { recursive: true });
      const pythonPath = path.join(runtimePath, 'python', 'python.exe');
      const bootstrap = plan.lock.wheels.find(wheel => wheel.name === 'pip')!;
      await runGraphifyProcess(pythonPath, ['-I', '-B', path.join(runtimePath, 'helpers', 'install_wheels.py'), path.join(runtimePath, 'wheels'), path.join(runtimePath, 'requirements.txt'), path.join(runtimePath, 'wheels', bootstrap.filename)], { cwd: runtimePath, env: graphifyEnvironment(privateHome), timeoutMs: 180_000, signal: options.signal });
      const verify = await runGraphifyProcess(pythonPath, ['-I', '-B', '-c', 'import json,sys,platform,importlib.metadata as m; print(json.dumps({"version":platform.python_version(),"prefix":sys.prefix,"graphify":m.version("graphifyy")}))'], { cwd: runtimePath, env: graphifyEnvironment(privateHome), signal: options.signal });
      const details = JSON.parse(verify.stdout) as { version: string; prefix: string; graphify: string };
      if (details.version !== plan.python.version || details.graphify !== plan.lock.graphifyVersion || path.resolve(details.prefix).toLowerCase() !== path.dirname(pythonPath).toLowerCase()) throw new Error('Private Graphify runtime verification failed');
      const files: GraphifyPayloadFile[] = [];
      for (const relative of await listGraphifyFiles(runtimePath, relative => relative === 'home', options.signal)) {
        options.signal?.throwIfAborted();
        const bytes = await readGraphifyFile(graphifyChild(runtimePath, relative));
        files.push({ path: relative, sha256: graphifyHash(bytes), size: bytes.length });
      }
      const runtime: GraphifyRuntime = { schemaVersion: 1, runtimeId: plan.planId, managedRoot: plan.managedRoot, runtimePath, pythonPath, graphifyVersion: plan.lock.graphifyVersion, pythonVersion: plan.python.version, lockHash: plan.lockHash, installedAt: new Date().toISOString(), files };
      options.signal?.throwIfAborted();
      await writeGraphifyFile(path.join(runtimePath, 'runtime.json'), JSON.stringify(runtime, null, 2) + '\n');
      options.signal?.throwIfAborted();
      await writeGraphifyFile(path.join(plan.managedRoot, 'runtime.json'), JSON.stringify(runtime, null, 2) + '\n');
      return runtime;
    } catch (error) {
      await writeGraphifyFile(path.join(runtimePath, 'failed.json'), JSON.stringify({ failedAt: new Date().toISOString(), planId: plan.planId, message: 'Provisioning failed; previous runtime remains active. Preserve this directory for inspection.' }));
      throw error;
    }
  });
}

export async function loadGraphifyRuntime(managedRoot: string): Promise<GraphifyRuntime> {
  const root = path.resolve(managedRoot);
  const runtime = JSON.parse((await readGraphifyFile(path.join(root, 'runtime.json'))).toString('utf8')) as GraphifyRuntime;
  validateRuntime(runtime);
  if (runtime.managedRoot !== root) throw new Error('Graphify runtime belongs to another directory');
  return runtime;
}

function validateRuntime(runtime: GraphifyRuntime): void {
  if (runtime.schemaVersion !== 1 || !/^[a-f0-9]{64}$/.test(runtime.runtimeId) || runtime.managedRoot !== path.resolve(runtime.managedRoot) || runtime.runtimePath !== graphifyChild(runtime.managedRoot, `runtimes/${runtime.runtimeId}`) || runtime.pythonPath !== path.join(runtime.runtimePath, 'python', 'python.exe')) throw new Error('Invalid Graphify runtime receipt');
  validatePayload(runtime.files);
}

export async function verifyGraphifyRuntime(runtime: GraphifyRuntime, options: { signal?: AbortSignal } = {}): Promise<void> {
  options.signal?.throwIfAborted();
  validateRuntime(runtime);
  const saved = JSON.parse((await readGraphifyFile(path.join(runtime.runtimePath, 'runtime.json'))).toString('utf8'));
  if (JSON.stringify(saved) !== JSON.stringify(runtime)) throw new Error('Graphify runtime receipt has changed');
  const actual = await listGraphifyFiles(runtime.runtimePath, relative => relative === 'home' || relative === 'runtime.json', options.signal);
  if (JSON.stringify(actual) !== JSON.stringify(runtime.files.map(file => file.path).sort())) throw new Error('Graphify runtime file inventory has changed');
  for (const file of runtime.files) {
    options.signal?.throwIfAborted();
    const bytes = await readGraphifyFile(graphifyChild(runtime.runtimePath, file.path));
    if (bytes.length !== file.size || graphifyHash(bytes) !== file.sha256) throw new Error(`Graphify runtime integrity check failed: ${file.path}`);
  }
}

/** Revert only the active pointer installed by this plan; immutable payloads/indexes stay recoverable. */
export async function restoreGraphifyRuntime(managedRoot: string, planId: string): Promise<void> {
  const plan = await loadGraphifyProvisionPlan(managedRoot, planId);
  await withGraphifyLock(path.join(plan.managedRoot, 'locks', 'provision'), async () => {
    const current = await loadGraphifyRuntime(plan.managedRoot);
    if (current.runtimeId !== planId) throw new Error('Graphify runtime advanced after this deployment; refusing to restore it');
    await verifyGraphifyRuntime(current);
    const destination = path.join(plan.managedRoot, 'runtime.json');
    if (plan.previousRuntimeBase64 === null) {
      const { unlink } = await import('node:fs/promises'); await assertGraphifyPlainPath(destination); await unlink(destination);
    } else {
      const previous = JSON.parse(Buffer.from(plan.previousRuntimeBase64, 'base64').toString('utf8')) as GraphifyRuntime;
      await verifyGraphifyRuntime(previous);
      await writeGraphifyFile(destination, Buffer.from(plan.previousRuntimeBase64, 'base64'));
    }
  });
}
