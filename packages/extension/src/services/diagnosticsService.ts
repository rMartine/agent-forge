import * as path from 'node:path';
import * as vscode from 'vscode';
import type { Diagnostic } from '@agent-forge/core';

function severity(value: Diagnostic['severity']): vscode.DiagnosticSeverity {
  if (value === 'error') return vscode.DiagnosticSeverity.Error;
  if (value === 'warning') return vscode.DiagnosticSeverity.Warning;
  return vscode.DiagnosticSeverity.Information;
}

export class DiagnosticsService implements vscode.Disposable {
  private readonly collection = vscode.languages.createDiagnosticCollection('agent-forge');

  publish(repoPath: string, diagnostics: Diagnostic[]): void {
    this.collection.clear();
    const byFile = new Map<string, vscode.Diagnostic[]>();
    for (const item of diagnostics) {
      const filePath = item.path
        ? (path.isAbsolute(item.path) ? item.path : path.join(repoPath, item.path))
        : path.join(repoPath, 'agent-forge.manifest.jsonc');
      const diagnostic = new vscode.Diagnostic(new vscode.Range(0, 0, 0, 1), `${item.code}: ${item.message}`, severity(item.severity));
      diagnostic.code = item.code;
      diagnostic.source = 'Agent Forge';
      const list = byFile.get(filePath) ?? [];
      list.push(diagnostic);
      byFile.set(filePath, list);
    }
    for (const [filePath, values] of byFile) this.collection.set(vscode.Uri.file(filePath), values);
  }

  dispose(): void { this.collection.dispose(); }
}
