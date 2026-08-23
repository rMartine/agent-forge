import * as readline from 'node:readline';
import type { Diagnostic } from '@agent-forge/core';
import type { RuntimeSelection, RuntimeTarget } from '@agent-forge/core';

export function repoPath(program: import('commander').Command): string {
  return program.opts().repo || process.cwd();
}

export function printDiagnostics(items: Diagnostic[]): void {
  for (const item of items) {
    const context = [item.agentId, item.path].filter(Boolean).join(' ');
    console.log(`[${item.severity.toUpperCase()}] ${item.code} ${context} ${item.message}`.trim());
  }
}

export function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(`${message} [y/N] `, answer => {
    rl.close();
    resolve(answer.trim().toLowerCase() === 'y');
  }));
}

export function runtimeSelection(value: string): RuntimeSelection {
  if (value !== 'vscode' && value !== 'codex' && value !== 'all') throw new Error('Target must be vscode, codex, or all.');
  return value;
}

export function runtimeTarget(value: string): RuntimeTarget {
  if (value !== 'vscode' && value !== 'codex') throw new Error('Target must be vscode or codex.');
  return value;
}
