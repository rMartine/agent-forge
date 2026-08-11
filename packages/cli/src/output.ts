import * as readline from 'node:readline';
import type { Diagnostic } from '@agent-forge/core';

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

export function environmentList(name: string): string[] {
  const value = process.env[name];
  return value ? value.split(',').map(item => item.trim()).filter(Boolean) : [];
}
