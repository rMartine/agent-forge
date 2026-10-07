import { randomBytes } from 'node:crypto';
import { lstat, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import type { ArtifactType, DeploymentStateV2, ManagedArtifactState, OperationResult, RuntimeDeploymentRecord } from './types.js';
import { hashBuffer } from './hash.js';
import { diagnostic } from './diagnostics.js';
import { sharedHooksAreIntact, sharedHooksOwnershipHash, type SharedHooksGroup, type SharedHooksOwnership } from './sharedHooks.js';

export type LegacyRosterPackage = 'research-specialists' | 'independent-specialists' | 'consulting-specialist';
export interface RosterMigrationOptions {
  codexHome: string;
  legacyLedgers: Array<{ packageName: LegacyRosterPackage; statePath: string }>;
  /** Exact reviewed historical paths; never a directory, glob or discovery rule. */
  legacyArchivePaths?: string[];
}
interface Snapshot { path: string; sha256: string; contentBase64: string; }
interface LegacyLedger extends Snapshot { packageName: LegacyRosterPackage; }
export interface RosterMigrationPlan {
  schemaVersion: 1;
  planId: string;
  createdAt: string;
  statePath: string;
  codexHome: string;
  core: Snapshot;
  legacyLedgers: LegacyLedger[];
  files: Snapshot[];
  archives: Array<Snapshot & { historicalDeploymentId: string }>;
  fingerprint: string;
}
export interface RosterMigrationResult extends OperationResult { planId: string; backupDirectory: string; }
interface PackageState {
  schemaVersion: 1; packageName: LegacyRosterPackage; codexHome: string; stateHome: string; createdHooks?: boolean;
  current: { files: Array<{ path: string; sha256: string; content: string }>; groups: Array<{ event: string; group: Record<string, unknown> }> };
}
interface MigrationWrite { path: string; before: Buffer | undefined; after: Buffer | undefined; }
interface Receipt { schemaVersion: 1; planId: string; fingerprint: string; baselineHash: string; status: 'prepared' | 'applied' | 'restored'; }
const packages: LegacyRosterPackage[] = ['research-specialists', 'independent-specialists', 'consulting-specialist'];
const key = (value: string): string => path.resolve(value).toLowerCase();
const optionalHash = (value: Buffer | undefined): string | null => value === undefined ? null : hashBuffer(value);
const json = (value: unknown): Buffer => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const canonical = (value: unknown): string => Array.isArray(value) ? `[${value.map(canonical).join(',')}]`
  : value && typeof value === 'object' ? `{${Object.keys(value).sort().map(name => `${JSON.stringify(name)}:${canonical((value as Record<string, unknown>)[name])}`).join(',')}}` : JSON.stringify(value);
const bytes = (snapshot: Snapshot): Buffer => Buffer.from(snapshot.contentBase64, 'base64');
const snapshot = (filePath: string, content: Buffer): Snapshot => ({ path: path.resolve(filePath), sha256: hashBuffer(content), contentBase64: content.toString('base64') });
const inside = (root: string, filePath: string): boolean => { const relative = path.relative(key(root), key(filePath)); return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative); };

async function regularPath(filePath: string): Promise<void> {
  if (!path.isAbsolute(filePath)) throw new Error('AF012: migration paths must be absolute');
  let current = filePath;
  for (;;) {
    try { if ((await lstat(current)).isSymbolicLink()) throw new Error(`AF012: migration preserves links and redirects: ${current}`); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    const parent = path.dirname(current); if (parent === current) break; current = parent;
  }
}
async function read(filePath: string): Promise<Buffer | undefined> {
  await regularPath(filePath);
  try { if (!(await lstat(filePath)).isFile()) throw new Error(`AF012: migration requires a regular file: ${filePath}`); return await readFile(filePath); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined; throw error; }
}
async function required(filePath: string): Promise<Buffer> { const content = await read(filePath); if (content === undefined) throw new Error(`AF012: migration source is missing: ${filePath}`); return content; }
function coreState(content: Buffer): DeploymentStateV2 {
  const value = JSON.parse(content.toString('utf8')) as DeploymentStateV2;
  if (value.schemaVersion !== 2 || !Array.isArray(value.deployments) || !value.activeDeployments || typeof value.activeDeployments !== 'object') throw new Error('AF012: migration requires a schema 2 core ledger');
  return value;
}
function active(state: DeploymentStateV2, runtime: 'codex' | 'vscode'): RuntimeDeploymentRecord | undefined { return state.deployments.find(record => record.runtime === runtime && record.id === state.activeDeployments[runtime]); }
function storage(statePath: string, planId: string): string {
  if (!/^roster-migration-[A-Za-z0-9-]+$/.test(planId)) throw new Error('AF012: invalid roster migration ID');
  return path.join(path.dirname(path.resolve(statePath)), 'migrations', planId);
}
function fingerprint(plan: Omit<RosterMigrationPlan, 'fingerprint'> | RosterMigrationPlan): string { const { fingerprint: ignored, ...value } = plan as RosterMigrationPlan; return hashBuffer(Buffer.from(canonical(value))); }
function checkSnapshot(item: Snapshot): void { if (!path.isAbsolute(item.path) || !/^[a-f0-9]{64}$/.test(item.sha256) || typeof item.contentBase64 !== 'string' || hashBuffer(bytes(item)) !== item.sha256) throw new Error('AF012: migration snapshot or hash is invalid'); }
function group(event: string, value: Record<string, unknown>): SharedHooksGroup { return { event, group: value, fingerprint: hashBuffer(Buffer.from(canonical({ event, group: value }))) }; }
function packageState(item: LegacyLedger, plan: RosterMigrationPlan): PackageState {
  checkSnapshot(item); const value = JSON.parse(bytes(item).toString('utf8')) as PackageState;
  if (!packages.includes(item.packageName) || value.schemaVersion !== 1 || value.packageName !== item.packageName || key(value.codexHome) !== key(plan.codexHome) || key(value.stateHome) !== key(path.dirname(item.path)) || !Array.isArray(value.current?.files) || !Array.isArray(value.current.groups)) throw new Error('AF012: incompatible legacy package ledger');
  return value;
}
function managedType(filePath: string, codexHome: string): ArtifactType { return path.dirname(key(filePath)) === key(path.join(codexHome, 'agents')) ? 'agent' : 'skill'; }
function allowedPackagePath(filePath: string, codexHome: string, packageName: string): boolean {
  return [path.join(codexHome, 'agents'), path.join(codexHome, 'skills'), path.join(codexHome, packageName)].some(root => inside(root, filePath));
}
function validate(plan: RosterMigrationPlan, statePath: string): DeploymentStateV2 {
  if (plan.schemaVersion !== 1 || key(plan.statePath) !== key(statePath) || !path.isAbsolute(plan.codexHome) || plan.fingerprint !== fingerprint(plan)) throw new Error('AF012: migration plan identity or fingerprint mismatch');
  storage(statePath, plan.planId); checkSnapshot(plan.core);
  if (key(plan.core.path) !== key(statePath)) throw new Error('AF012: core ledger snapshot path mismatch');
  const state = coreState(bytes(plan.core));
  if (state.deployments.some(record => record.id === plan.planId)) throw new Error('AF012: migration ID already appears in history');
  const observed = new Map<string, Snapshot>();
  for (const item of plan.files) { checkSnapshot(item); if (observed.has(key(item.path))) throw new Error('AF012: duplicate migration file snapshot'); observed.set(key(item.path), item); }
  const expected = new Set<string>();
  const owned = new Set<string>();
  for (const runtime of ['codex', 'vscode'] as const) for (const item of active(state, runtime)?.artifacts ?? []) {
    if (owned.has(key(item.targetPath))) throw new Error('AF012: core ownership collides across runtimes'); owned.add(key(item.targetPath));
    if (runtime === 'codex') { expected.add(key(item.targetPath)); const seen = observed.get(key(item.targetPath)); if (!seen || (item.sharedHooks ? !sharedHooksAreIntact(bytes(seen), item.sharedHooks) : seen.sha256 !== item.deployedHash)) throw new Error('AF012: core managed file or hook groups changed'); }
  }
  const ledgerPaths = new Set([key(statePath)]), names = new Set<string>();
  const hookGroups = [...(active(state, 'codex')?.artifacts.find(item => item.sharedHooks && key(item.targetPath) === key(path.join(plan.codexHome, 'hooks.json')))?.sharedHooks?.groups ?? [])];
  for (const item of plan.legacyLedgers) {
    if (ledgerPaths.has(key(item.path)) || names.has(item.packageName)) throw new Error('AF012: duplicate legacy ledger or package'); ledgerPaths.add(key(item.path)); names.add(item.packageName);
    const legacy = packageState(item, plan);
    for (const file of legacy.current.files) {
      if (!path.isAbsolute(file.path) || !allowedPackagePath(file.path, plan.codexHome, item.packageName) || owned.has(key(file.path)) || ledgerPaths.has(key(file.path)) || hashBuffer(Buffer.from(file.content, 'base64')) !== file.sha256) throw new Error('AF009: imported file has unsafe ownership, content or a collision');
      owned.add(key(file.path)); expected.add(key(file.path)); const seen = observed.get(key(file.path)); if (!seen || seen.sha256 !== file.sha256) throw new Error('AF012: legacy managed file changed');
    }
    for (const item of legacy.current.groups) hookGroups.push(group(item.event, item.group));
  }
  if (plan.legacyLedgers.length) {
    const hookPath = path.join(plan.codexHome, 'hooks.json'); expected.add(key(hookPath));
    const seen = observed.get(key(hookPath));
    if (!seen || !sharedHooksAreIntact(bytes(seen), { groups: hookGroups, previousGroups: [], createdFile: false })) throw new Error('AF009: legacy hook groups are missing, modified, duplicated or collide');
  }
  if (expected.size !== observed.size || [...observed.keys()].some(item => !expected.has(item))) throw new Error('AF012: migration snapshots must describe exactly the imported and current Codex ownership');
  const archived = new Set<string>();
  for (const item of plan.archives) {
    checkSnapshot(item);
    const historical = state.deployments.find(record => record.runtime === 'vscode' && record.id === item.historicalDeploymentId)?.artifacts.find(artifact => key(artifact.targetPath) === key(item.path));
    if (!historical || historical.sharedHooks || owned.has(key(item.path)) || ledgerPaths.has(key(item.path)) || archived.has(key(item.path)) || !['agent', 'skill', 'instruction'].includes(historical.type) || !/(^|[\\/])\.copilot([\\/])/.test(item.path)) throw new Error('AF009: archival requires an explicit inactive historical Copilot file');
    archived.add(key(item.path));
  }
  for (const filePath of observed.keys()) if (ledgerPaths.has(filePath)) throw new Error('AF009: a ledger cannot also be a managed artifact');
  return state;
}
function baseline(plan: RosterMigrationPlan, statePath: string): DeploymentStateV2 {
  const state = validate(plan, statePath), previous = active(state, 'codex');
  const artifacts: ManagedArtifactState[] = structuredClone(previous?.artifacts ?? []);
  const backupRoot = storage(statePath, plan.planId);
  const allGroups = artifacts.find(item => item.sharedHooks && key(item.targetPath) === key(path.join(plan.codexHome, 'hooks.json')))?.sharedHooks?.groups ?? [];
  for (const legacy of plan.legacyLedgers) {
    const old = packageState(legacy, plan);
    for (const file of old.current.files) {
      const index = plan.files.findIndex(item => key(item.path) === key(file.path));
      artifacts.push({ id: `imported/${legacy.packageName}/${path.relative(plan.codexHome, file.path).replaceAll('\\', '/')}`, runtime: 'codex', type: managedType(file.path, plan.codexHome), targetPath: file.path, deployedHash: file.sha256, existedBefore: true, backupPath: path.join(backupRoot, 'files', `${index}.bak`) });
    }
    for (const item of old.current.groups) allGroups.push(group(item.event, item.group));
  }
  if (plan.legacyLedgers.length) {
    const hookPath = path.join(plan.codexHome, 'hooks.json');
    let hooks = artifacts.find(item => key(item.targetPath) === key(hookPath));
    if (hooks && !hooks.sharedHooks) throw new Error('AF009: hooks.json has incompatible complete-file ownership');
    const ownership: SharedHooksOwnership = { groups: allGroups, previousGroups: structuredClone(allGroups), createdFile: hooks?.sharedHooks?.createdFile ?? false };
    if (!hooks) { hooks = { id: 'agent-forge-roster-hooks', type: 'hook', runtime: 'codex', targetPath: hookPath, deployedHash: '', existedBefore: true }; artifacts.push(hooks); }
    hooks.sharedHooks = ownership; hooks.deployedHash = sharedHooksOwnershipHash(ownership);
  }
  if (plan.legacyLedgers.length) {
    state.deployments.push({ id: plan.planId, runtime: 'codex', createdAt: plan.createdAt, repoPath: previous?.repoPath ?? path.dirname(statePath), ...(previous?.sourceCommit ? { sourceCommit: previous.sourceCommit } : {}), previousDeploymentId: previous?.id ?? null, artifacts });
    state.activeDeployments.codex = plan.planId;
  }
  return state;
}
function tombstone(plan: RosterMigrationPlan, item: LegacyLedger): Buffer {
  return json({ schemaVersion: 0, packageName: item.packageName, migratedTo: { planId: plan.planId, statePath: plan.statePath, originalLedger: path.join(storage(plan.statePath, plan.planId), 'ledgers', `${item.packageName}.json`) }, explanation: 'Ownership belongs to the unified Agent Forge ledger. Restore the migration before running a legacy installer.' });
}
function writes(plan: RosterMigrationPlan, statePath: string): MigrationWrite[] {
  return [...plan.legacyLedgers.map(item => ({ path: item.path, before: bytes(item), after: tombstone(plan, item) })), ...plan.archives.map(item => ({ path: item.path, before: bytes(item), after: undefined })), { path: statePath, before: bytes(plan.core), after: json(baseline(plan, statePath)) }];
}
async function immutable(filePath: string, content: Buffer): Promise<void> {
  await regularPath(filePath); await mkdir(path.dirname(filePath), { recursive: true });
  try { await writeFile(filePath, content, { flag: 'wx' }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; if (optionalHash(await read(filePath)) !== hashBuffer(content)) throw new Error(`AF012: migration backup already exists with different bytes: ${filePath}`); }
}
async function replace(filePath: string, expectedHash: string | null, content: Buffer | undefined): Promise<void> {
  if (optionalHash(await read(filePath)) !== expectedHash) throw new Error(`AF012: migration preserves a concurrent change: ${filePath}`);
  if (content === undefined) { if (expectedHash !== null) await unlink(filePath); return; }
  await mkdir(path.dirname(filePath), { recursive: true }); const temporary = `${filePath}.migration-tmp`;
  let created = false;
  try { await regularPath(temporary); await writeFile(temporary, content, { flag: 'wx' }); created = true; if (optionalHash(await read(filePath)) !== expectedHash) throw new Error(`AF012: migration preserves a concurrent change: ${filePath}`); await rename(temporary, filePath); created = false; }
  finally { if (created) await unlink(temporary); }
}
async function assertFiles(plan: RosterMigrationPlan): Promise<void> {
  const state = coreState(bytes(plan.core));
  for (const item of plan.files) {
    const content = await read(item.path);
    const hooks = key(item.path) === key(path.join(plan.codexHome, 'hooks.json'));
    if (hooks) {
      const groups = [...(active(state, 'codex')?.artifacts.find(artifact => key(artifact.targetPath) === key(item.path))?.sharedHooks?.groups ?? [])];
      for (const ledger of plan.legacyLedgers) for (const entry of packageState(ledger, plan).current.groups) groups.push(group(entry.event, entry.group));
      if (!sharedHooksAreIntact(content, { groups, previousGroups: [], createdFile: false })) throw new Error('AF012: managed hook groups changed after migration preview');
    } else if (optionalHash(content) !== item.sha256) throw new Error(`AF012: owned file changed after migration preview: ${item.path}`);
  }
}

export async function createRosterMigrationPlan(statePath: string, options: RosterMigrationOptions): Promise<RosterMigrationPlan> {
  const core = snapshot(statePath, await required(statePath));
  const state = coreState(bytes(core)); const legacyLedgers: LegacyLedger[] = [];
  for (const item of options.legacyLedgers) legacyLedgers.push({ ...snapshot(item.statePath, await required(item.statePath)), packageName: item.packageName });
  const filePaths = new Set((active(state, 'codex')?.artifacts ?? []).map(item => path.resolve(item.targetPath)));
  for (const item of legacyLedgers) {
    const old = JSON.parse(bytes(item).toString('utf8')) as PackageState;
    if (!Array.isArray(old.current?.files)) throw new Error('AF012: legacy ledger has no current owned files');
    for (const file of old.current.files) filePaths.add(file.path);
  }
  if (legacyLedgers.length) filePaths.add(path.join(options.codexHome, 'hooks.json'));
  const files: Snapshot[] = []; for (const filePath of filePaths) files.push(snapshot(filePath, await required(filePath)));
  const archives: RosterMigrationPlan['archives'] = [];
  for (const filePath of options.legacyArchivePaths ?? []) {
    const record = [...state.deployments].reverse().find(item => item.runtime === 'vscode' && item.artifacts.some(file => key(file.targetPath) === key(filePath)));
    if (!record) throw new Error('AF009: legacy archive path has no recorded Copilot provenance');
    archives.push({ ...snapshot(filePath, await required(filePath)), historicalDeploymentId: record.id });
  }
  const plan: RosterMigrationPlan = { schemaVersion: 1, planId: `roster-migration-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomBytes(3).toString('hex')}`, createdAt: new Date().toISOString(), statePath: path.resolve(statePath), codexHome: path.resolve(options.codexHome), core, legacyLedgers, files, archives, fingerprint: '' };
  plan.fingerprint = fingerprint(plan); baseline(plan, statePath); return plan;
}
export async function saveRosterMigrationPlan(plan: RosterMigrationPlan, statePath: string): Promise<string> { validate(plan, statePath); const filePath = path.join(storage(statePath, plan.planId), 'plan.json'); await immutable(filePath, json(plan)); return filePath; }
export async function loadRosterMigrationPlan(statePath: string, planId: string): Promise<RosterMigrationPlan> { const plan = JSON.parse((await required(path.join(storage(statePath, planId), 'plan.json'))).toString('utf8')) as RosterMigrationPlan; if (plan.planId !== planId) throw new Error('AF012: migration plan ID mismatch'); validate(plan, statePath); return plan; }
function result(plan: RosterMigrationPlan, statePath: string, success: boolean, error?: unknown): RosterMigrationResult {
  return { planId: plan.planId, backupDirectory: storage(statePath, plan.planId), success, summary: { importedLedgers: success ? plan.legacyLedgers.length : 0, archivedFiles: success ? plan.archives.length : 0 }, details: [], errors: error ? [{ path: statePath, message: (error as Error).message }] : [], diagnostics: error ? [diagnostic('AF012', 'error', 'Migration preserved recoverable snapshots; inspect the reported conflict and use migration restore if needed')] : [] };
}
async function receipt(plan: RosterMigrationPlan, statePath: string, status: Receipt['status']): Promise<void> {
  const filePath = path.join(storage(statePath, plan.planId), 'receipt.json');
  const value: Receipt = { schemaVersion: 1, planId: plan.planId, fingerprint: plan.fingerprint, baselineHash: hashBuffer(json(baseline(plan, statePath))), status };
  await replace(filePath, optionalHash(await read(filePath)), json(value));
}
export async function applyRosterMigrationPlan(plan: RosterMigrationPlan, statePath: string, confirmId: string): Promise<RosterMigrationResult> {
  const changes: MigrationWrite[] = []; let prepared = false;
  try {
    validate(plan, statePath); if (confirmId !== plan.planId) throw new Error('AF012: migration confirmation must exactly match the plan ID');
    const expected = writes(plan, statePath);
    for (const item of expected) if (optionalHash(await read(item.path)) !== optionalHash(item.before)) throw new Error(`AF012: ledger or archival file changed after migration preview: ${item.path}`);
    await assertFiles(plan); const savedPath = await saveRosterMigrationPlan(plan, statePath); const root = path.dirname(savedPath);
    await immutable(path.join(root, 'state-before.json'), bytes(plan.core)); await immutable(path.join(root, 'state-migrated.json'), json(baseline(plan, statePath)));
    for (const item of plan.legacyLedgers) await immutable(path.join(root, 'ledgers', `${item.packageName}.json`), bytes(item));
    for (const [index, item] of plan.files.entries()) await immutable(path.join(root, 'files', `${index}.bak`), bytes(item));
    for (const [index, item] of plan.archives.entries()) await immutable(path.join(root, 'archive', `${index}.bak`), bytes(item));
    await receipt(plan, statePath, 'prepared'); prepared = true; await assertFiles(plan);
    for (const item of expected) { await replace(item.path, optionalHash(item.before), item.after); changes.push(item); }
    await receipt(plan, statePath, 'applied'); return result(plan, statePath, true);
  } catch (error) {
    const recoveryErrors: string[] = [];
    for (const item of [...changes].reverse()) try { await replace(item.path, optionalHash(item.after), item.before); } catch (failure) { recoveryErrors.push((failure as Error).message); }
    if (prepared && !recoveryErrors.length) try { await receipt(plan, statePath, 'restored'); } catch (failure) { recoveryErrors.push((failure as Error).message); }
    return result(plan, statePath, false, new Error([(error as Error).message, ...recoveryErrors].join('; ')));
  }
}
function compatibleBaseline(current: Buffer, plan: RosterMigrationPlan, statePath: string): boolean {
  const state = coreState(current), expected = baseline(plan, statePath);
  return canonical(state.activeDeployments) === canonical(expected.activeDeployments)
    && expected.deployments.every(record => canonical(record) === canonical(state.deployments.find(item => item.runtime === record.runtime && item.id === record.id)))
    && canonical(state.deployments.filter(record => record.runtime !== 'codex')) === canonical(expected.deployments.filter(record => record.runtime !== 'codex'));
}
/** Also recovers an interrupted apply. Later deployments must first be rolled back. */
export async function restoreRosterMigration(statePath: string, planId: string, confirmId: string): Promise<RosterMigrationResult> {
  const plan = await loadRosterMigrationPlan(statePath, planId);
  try {
    if (confirmId !== planId) throw new Error('AF012: migration recovery confirmation must match the plan ID');
    const root = storage(statePath, planId), savedReceipt = JSON.parse((await required(path.join(root, 'receipt.json'))).toString('utf8')) as Receipt;
    if (savedReceipt.schemaVersion !== 1 || savedReceipt.planId !== planId || savedReceipt.fingerprint !== plan.fingerprint || savedReceipt.baselineHash !== hashBuffer(json(baseline(plan, statePath)))) throw new Error('AF012: migration recovery receipt does not match the saved plan');
    await assertFiles(plan);
    const expected = writes(plan, statePath);
    for (const item of expected) {
      const current = await read(item.path), currentHash = optionalHash(current);
      if (currentHash !== optionalHash(item.before) && currentHash !== optionalHash(item.after) && !(key(item.path) === key(statePath) && current && compatibleBaseline(current, plan, statePath))) throw new Error(`AF012: recovery preserves a customization or a later deployment: ${item.path}`);
    }
    if (optionalHash(await read(path.join(root, 'state-before.json'))) !== plan.core.sha256) throw new Error('AF012: original core ledger backup was modified');
    for (const item of plan.legacyLedgers) if (optionalHash(await read(path.join(root, 'ledgers', `${item.packageName}.json`))) !== item.sha256) throw new Error('AF012: original legacy ledger backup was modified');
    for (const [index, item] of plan.archives.entries()) if (optionalHash(await read(path.join(root, 'archive', `${index}.bak`))) !== item.sha256) throw new Error('AF012: archived customization backup was modified');
    const coreCurrent = await required(statePath); await immutable(path.join(root, 'state-before-restore.json'), coreCurrent);
    for (const item of [...expected].reverse()) { const current = await read(item.path); if (optionalHash(current) !== optionalHash(item.before)) await replace(item.path, optionalHash(current), item.before); }
    await receipt(plan, statePath, 'restored'); return result(plan, statePath, true);
  } catch (error) { return result(plan, statePath, false, error); }
}
