import assert from 'node:assert/strict';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { DiagnosticsService } from '../../services/diagnosticsService';

export async function runDiagnosticsTests(): Promise<void> {
  const service = new DiagnosticsService();
  const root = path.join(vscode.extensions.getExtension('agent-forge.agent-forge')!.extensionPath, 'test-fixture');
  const uri = vscode.Uri.file(path.join(root, 'agent-forge.manifest.jsonc'));
  try {
    service.publish(root, [{ code: 'AF010', severity: 'error', message: 'Unsupported test version' }]);
    const diagnostics = vscode.languages.getDiagnostics(uri);
    assert.equal(diagnostics.length, 1);
    assert.equal(diagnostics[0].code, 'AF010');
    assert.equal(diagnostics[0].severity, vscode.DiagnosticSeverity.Error);
  } finally {
    service.dispose();
  }
}
