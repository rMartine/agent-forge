import { hashBuffer } from './hash.js';

export interface SharedHooksGroup {
  event: string;
  group: Record<string, unknown>;
  fingerprint: string;
}

export interface SharedHooksOwnership {
  groups: SharedHooksGroup[];
  previousGroups: SharedHooksGroup[];
  createdFile: boolean;
}

export interface SharedHooksPlan {
  expectedFileHash: string | null;
  ownership: SharedHooksOwnership;
}

export type SharedHooksGroups = Record<string, Array<Record<string, unknown>>>;

interface HooksDocument extends Record<string, unknown> { hooks?: SharedHooksGroups; }

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (isObject(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function fingerprint(event: string, group: Record<string, unknown>): string {
  return hashBuffer(Buffer.from(canonical({ event, group })));
}

function parse(content: Buffer | undefined): HooksDocument {
  if (!content) return {};
  const document: unknown = JSON.parse(content.toString('utf8'));
  if (!isObject(document) || (document.hooks !== undefined && !isObject(document.hooks))) {
    throw new Error('AF012: hooks.json must be an object with an optional hooks object');
  }
  const hooks = (document.hooks ?? {}) as Record<string, unknown>;
  for (const [event, groups] of Object.entries(hooks)) {
    if (!Array.isArray(groups) || groups.some(group => !isObject(group))) {
      throw new Error(`AF012: hooks.json event ${event} must contain hook groups`);
    }
  }
  return document as HooksDocument;
}

function describe(groups: SharedHooksGroups): SharedHooksGroup[] {
  return Object.entries(groups).flatMap(([event, entries]) => entries.map(group => ({
    event,
    group: JSON.parse(JSON.stringify(group)) as Record<string, unknown>,
    fingerprint: fingerprint(event, group),
  })));
}

function validateOwnership(groups: SharedHooksGroup[]): void {
  const seen = new Set<string>();
  for (const item of groups) {
    if (!item.event || !isObject(item.group) || item.fingerprint !== fingerprint(item.event, item.group) || seen.has(item.fingerprint)) {
      throw new Error('AF012: invalid or duplicate managed hook group fingerprint');
    }
    seen.add(item.fingerprint);
  }
}

function assertGroupsIntact(document: HooksDocument, groups: SharedHooksGroup[]): void {
  validateOwnership(groups);
  for (const item of groups) {
    const matches = (document.hooks?.[item.event] ?? []).filter(group => fingerprint(item.event, group) === item.fingerprint);
    if (matches.length !== 1) {
      throw new Error(`AF012: managed ${item.event} hook group was modified, removed, or duplicated; preserving hooks.json`);
    }
  }
}

function replaceGroups(document: HooksDocument, current: SharedHooksGroup[], desired: SharedHooksGroup[]): void {
  assertGroupsIntact(document, current);
  validateOwnership(desired);
  const hooks = document.hooks ?? {};
  for (const item of current) {
    const remaining = hooks[item.event].filter(group => fingerprint(item.event, group) !== item.fingerprint);
    if (remaining.length) hooks[item.event] = remaining;
    else delete hooks[item.event];
  }
  for (const item of desired) {
    const existing = hooks[item.event] ?? [];
    if (existing.some(group => fingerprint(item.event, group) === item.fingerprint)) {
      throw new Error(`AF009: desired ${item.event} hook group collides with an unmanaged group`);
    }
    hooks[item.event] = [...existing, item.group];
  }
  document.hooks = hooks;
}

function serialize(document: HooksDocument): Buffer {
  return Buffer.from(`${JSON.stringify(document, null, 2)}\n`);
}

export function sharedHooksOwnershipHash(ownership: SharedHooksOwnership): string {
  validateOwnership(ownership.groups);
  return hashBuffer(Buffer.from(canonical(ownership.groups.map(item => item.fingerprint).sort())));
}

export function sharedHooksAreIntact(content: Buffer | undefined, ownership: SharedHooksOwnership): boolean {
  if (!content) return false;
  try { assertGroupsIntact(parse(content), ownership.groups); return true; }
  catch { return false; }
}

/** Retain every foreign hook group and top-level setting in the immutable preview. */
export function prepareSharedHooks(
  existingContent: Buffer | undefined,
  desiredGroups: SharedHooksGroups,
  previousOwnership?: SharedHooksOwnership,
): { content: Buffer; sharedHooks: SharedHooksPlan } {
  const document = parse(existingContent);
  const groups = describe(desiredGroups);
  const previousGroups = previousOwnership?.groups ?? [];
  replaceGroups(document, previousGroups, groups);
  return {
    content: serialize(document),
    sharedHooks: {
      expectedFileHash: existingContent ? hashBuffer(existingContent) : null,
      ownership: {
        groups,
        previousGroups: JSON.parse(JSON.stringify(previousGroups)) as SharedHooksGroup[],
        createdFile: previousOwnership?.createdFile ?? !existingContent,
      },
    },
  };
}

/** Reconstruct from the current ledger to prevent a modified plan from claiming foreign groups. */
export function assertSharedHooksPlan(
  existingContent: Buffer | undefined,
  content: Buffer,
  plan: SharedHooksPlan,
  previousOwnership?: SharedHooksOwnership,
): void {
  if ((existingContent ? hashBuffer(existingContent) : null) !== plan.expectedFileHash) {
    throw new Error('AF012: hooks.json changed after preview; create a new deployment plan');
  }
  validateOwnership(plan.ownership.groups);
  const desired: SharedHooksGroups = {};
  for (const item of plan.ownership.groups) (desired[item.event] ??= []).push(item.group);
  const expected = prepareSharedHooks(existingContent, desired, previousOwnership);
  if (hashBuffer(expected.content) !== hashBuffer(content) || canonical(expected.sharedHooks) !== canonical(plan)) {
    throw new Error('AF012: shared hooks preview content or ownership metadata does not match its immutable plan');
  }
}

/** Rollback restores only prior owned groups; wipe removes only current owned groups. */
export function restoreSharedHooks(
  existingContent: Buffer | undefined,
  ownership: SharedHooksOwnership,
  operation: 'rollback' | 'remove',
): Buffer | undefined {
  if (!existingContent) throw new Error('AF012: managed hooks.json is missing; preserving deployment ownership');
  const document = parse(existingContent);
  replaceGroups(document, ownership.groups, operation === 'rollback' ? ownership.previousGroups : []);
  if (ownership.createdFile && Object.keys(document).every(key => key === 'hooks') && Object.keys(document.hooks ?? {}).length === 0) return undefined;
  return serialize(document);
}

/** Restore groups removed by stale cleanup while retaining any subsequent foreign additions. */
export function restoreRemovedSharedHooks(existingContent: Buffer | undefined, ownership: SharedHooksOwnership): Buffer {
  const document = parse(existingContent);
  replaceGroups(document, [], ownership.groups);
  return serialize(document);
}
