import * as path from 'node:path';
import { PathResolutionError } from './errors.js';

/**
 * Replace %VAR% tokens with the corresponding environment variable value.
 * Throws PathResolutionError if any referenced variable is undefined.
 */
export function expandEnvVars(pathWithVars: string): string {
  return pathWithVars.replace(/%([^%]+)%/g, (_match, varName: string) => {
    const value = process.env[varName];
    if (value === undefined) {
      throw new PathResolutionError(`Environment variable "${varName}" is not defined`);
    }
    return value;
  });
}

/**
 * Expand env vars, normalize, and validate a target path.
 * Rejects paths containing ".." segments after normalization (path traversal).
 */
export function resolveTargetPath(target: string): string {
  const expanded = expandEnvVars(target);
  const normalized = path.normalize(expanded);

  // After normalization, ".." segments indicate path traversal
  const segments = normalized.split(path.sep);
  if (segments.includes('..')) {
    throw new PathResolutionError(`Path traversal detected in "${target}"`);
  }

  return normalized;
}

export function resolveStatePath(target: string): string {
  return resolveTargetPath(target);
}

/**
 * Resolve a repo-relative path to an absolute path, ensuring it stays within the repo root.
 */
export function resolveRepoFilePath(repoRoot: string, relativePath: string): string {
  const normalized = path.normalize(relativePath);

  // Reject obvious traversal in the relative portion
  if (normalized.split(path.sep).includes('..')) {
    throw new PathResolutionError(`Path traversal detected in relative path "${relativePath}"`);
  }

  const resolved = path.resolve(repoRoot, normalized);

  if (!isPathSafe(resolved, repoRoot)) {
    throw new PathResolutionError(`Resolved path "${resolved}" escapes repo root "${repoRoot}"`);
  }

  return resolved;
}

/**
 * Return true when resolvedPath is equal to or a descendant of allowedBase.
 */
export function isPathSafe(resolvedPath: string, allowedBase: string): boolean {
  const normalizedResolved = path.resolve(resolvedPath);
  const normalizedBase = path.resolve(allowedBase);
  return (
    normalizedResolved === normalizedBase ||
    normalizedResolved.startsWith(normalizedBase + path.sep)
  );
}
