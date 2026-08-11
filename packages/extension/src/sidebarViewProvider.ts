import * as vscode from 'vscode';

export interface DashboardState {
  repoConfigured: boolean;
  repoPath?: string;
  readiness?: string;
}

export class SidebarViewProvider implements vscode.WebviewViewProvider {
  static readonly viewType = 'agentForge.dashboard';
  private view?: vscode.WebviewView;
  private state: DashboardState = { repoConfigured: false };

  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = { enableScripts: true, localResourceRoots: [this.extensionUri] };
    view.webview.onDidReceiveMessage((message: { command: string }) => {
      void vscode.commands.executeCommand(message.command);
    });
    this.render();
  }

  updateState(state: Partial<DashboardState>): void {
    this.state = { ...this.state, ...state };
    this.render();
  }

  private render(): void {
    if (!this.view) return;
    const nonce = getNonce();
    const path = escapeHtml(this.state.repoPath ?? 'Not configured');
    const readiness = escapeHtml(this.state.readiness ?? 'Run Doctor');
    const actionButtons = this.state.repoConfigured ? `
      <button data-command="agentForge.validate">Validate roster</button>
      <button data-command="agentForge.doctor">Doctor capabilities</button>
      <button data-command="agentForge.preview">Preview deployment</button>
      <button class="primary" data-command="agentForge.deploy">Deploy to user profile</button>
      <button data-command="agentForge.status">Deployment status</button>
      <button data-command="agentForge.rollback">Rollback deployment</button>
      <button data-command="agentForge.setupMcp">MCP setup</button>
      <button class="danger" data-command="agentForge.wipe">Wipe managed deployment</button>` : `
      <button class="primary" data-command="agentForge.setRepoPath">Set repository path</button>`;

    this.view.webview.html = `<!doctype html><html lang="en"><head>
      <meta charset="UTF-8">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style nonce="${nonce}">
        body{font-family:var(--vscode-font-family);color:var(--vscode-foreground);padding:12px;line-height:1.45}
        h2{font-size:13px;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--vscode-panel-border);padding-bottom:8px}
        .status{font-size:11px;color:var(--vscode-descriptionForeground);overflow-wrap:anywhere;margin-bottom:12px}
        .status strong{color:var(--vscode-foreground)}
        button{width:100%;border:0;border-radius:2px;padding:7px 9px;margin:0 0 6px;background:var(--vscode-button-secondaryBackground);color:var(--vscode-button-secondaryForeground);cursor:pointer;text-align:left}
        button:hover{background:var(--vscode-button-secondaryHoverBackground)}
        button.primary{background:var(--vscode-button-background);color:var(--vscode-button-foreground)}
        button.primary:hover{background:var(--vscode-button-hoverBackground)}
        button.danger{border:1px solid var(--vscode-inputValidation-errorBorder)}
      </style></head><body>
      <h2>Agent Forge</h2>
      <div class="status"><strong>Repository</strong><br>${path}<br><br><strong>Readiness</strong><br>${readiness}</div>
      ${actionButtons}
      <button data-command="agentForge.setRepoPath">Change repository</button>
      <button data-command="agentForge.openSettings">Open settings</button>
      <script nonce="${nonce}">const vscode=acquireVsCodeApi();document.querySelectorAll('button[data-command]').forEach(button=>button.addEventListener('click',()=>vscode.postMessage({command:button.dataset.command})));</script>
      </body></html>`;
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let index = 0; index < 32; index += 1) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}
