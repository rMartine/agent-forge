import * as vscode from 'vscode';

export interface DashboardState {
  repoConfigured: boolean;
  repoPath?: string;
  subAgentsEnabled: boolean;
}

export class SidebarViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'agentForge.dashboard';

  private _view?: vscode.WebviewView;
  private _state: DashboardState = {
    repoConfigured: false,
    subAgentsEnabled: false,
  };

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.onDidReceiveMessage((message: { command: string }) => {
      vscode.commands.executeCommand(message.command);
    });

    this._updateHtml();
  }

  public updateState(state: Partial<DashboardState>): void {
    this._state = { ...this._state, ...state };
    this._updateHtml();
  }

  private _updateHtml(): void {
    if (!this._view) return;

    const nonce = getNonce();
    const { repoConfigured, repoPath, subAgentsEnabled } = this._state;

    // Truncate repo path for display
    const displayPath = repoPath
      ? repoPath.length > 35
        ? '\u2026' + repoPath.slice(-35)
        : repoPath
      : '';

    this._view.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style nonce="${nonce}">
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      padding: 12px 14px;
      line-height: 1.5;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    }
    .header .icon {
      font-size: 20px;
      opacity: 0.85;
    }
    .header h2 {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--vscode-foreground);
    }

    .section {
      margin-bottom: 16px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 8px;
    }

    .status-row {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 0;
      font-size: 12px;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .status-dot.on { background: var(--vscode-testing-iconPassed); }
    .status-dot.off { background: var(--vscode-testing-iconFailed); }
    .status-dot.warn { background: var(--vscode-testing-iconQueued); }
    .status-label {
      color: var(--vscode-descriptionForeground);
    }
    .status-value {
      margin-left: auto;
      color: var(--vscode-foreground);
      font-size: 11px;
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      direction: rtl;
      text-align: right;
    }

    button {
      width: 100%;
      padding: 7px 12px;
      margin-bottom: 6px;
      border: none;
      border-radius: 3px;
      font-family: var(--vscode-font-family);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: opacity 0.15s;
    }
    button:hover { opacity: 0.9; }
    button:active { opacity: 0.75; }

    .btn-primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    .btn-primary:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .btn-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .btn-secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    .btn-icon {
      font-size: 14px;
      width: 16px;
      text-align: center;
      flex-shrink: 0;
    }

    .separator {
      height: 1px;
      background: var(--vscode-widget-border, var(--vscode-panel-border));
      margin: 14px 0;
    }

    .hint {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      margin-top: 4px;
      line-height: 1.4;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      margin-bottom: 6px;
    }
    .actions-grid button {
      margin-bottom: 0;
      justify-content: center;
      padding: 8px 6px;
      flex-direction: column;
      gap: 3px;
    }
    .actions-grid .btn-icon {
      font-size: 18px;
    }
    .actions-grid .btn-label {
      font-size: 11px;
    }
  </style>
</head>
<body>
  ${repoConfigured ? getDashboardHtml(displayPath, subAgentsEnabled) : getWelcomeHtml()}
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    document.querySelectorAll('button[data-command]').forEach(btn => {
      btn.addEventListener('click', () => {
        vscode.postMessage({ command: btn.getAttribute('data-command') });
      });
    });
  </script>
</body>
</html>`;
  }
}

function getWelcomeHtml(): string {
  return `
    <div class="header">
      <span class="icon">&#9776;</span>
      <h2>Agent Forge</h2>
    </div>

    <div class="section">
      <div class="section-title">Get Started</div>
      <p class="hint" style="margin-bottom: 10px;">Configure your agent roster repository to begin deploying, syncing, and managing your AI agents.</p>
      <button class="btn-primary" data-command="agentForge.setRepoPath">
        <span class="btn-icon">&#128193;</span> Set Repository Path
      </button>
    </div>

    <div class="separator"></div>

    <div class="section">
      <div class="section-title">Recommended Setup</div>
      <button class="btn-secondary" data-command="agentForge.enableSubAgents">
        <span class="btn-icon">&#128279;</span> Enable Sub-Agent Nesting
      </button>
      <p class="hint">Allow agents to invoke other agents for multi-step workflows.</p>
    </div>

    <div class="separator"></div>

    <div class="section">
      <button class="btn-secondary" data-command="agentForge.openSettings">
        <span class="btn-icon">&#9881;</span> Open Settings
      </button>
      <p class="hint">Configure model storage, generated assets path, and other preferences.</p>
    </div>`;
}

function getDashboardHtml(displayPath: string, subAgentsEnabled: boolean): string {
  return `
    <div class="header">
      <span class="icon">&#9776;</span>
      <h2>Agent Forge</h2>
    </div>

    <div class="section">
      <div class="section-title">Status</div>
      <div class="status-row">
        <span class="status-dot on"></span>
        <span class="status-label">Repository</span>
        <span class="status-value">${displayPath}</span>
      </div>
      <div class="status-row">
        <span class="status-dot ${subAgentsEnabled ? 'on' : 'warn'}"></span>
        <span class="status-label">Sub-Agents</span>
        <span class="status-value">${subAgentsEnabled ? 'Enabled' : 'Disabled'}</span>
      </div>
    </div>

    <div class="separator"></div>

    <div class="section">
      <div class="section-title">Actions</div>
      <div class="actions-grid">
        <button class="btn-primary" data-command="agentForge.deploy">
          <span class="btn-icon">&#9729;</span>
          <span class="btn-label">Deploy</span>
        </button>
        <button class="btn-primary" data-command="agentForge.restore">
          <span class="btn-icon">&#8634;</span>
          <span class="btn-label">Restore</span>
        </button>
        <button class="btn-secondary" data-command="agentForge.status">
          <span class="btn-icon">&#8505;</span>
          <span class="btn-label">Status</span>
        </button>
        <button class="btn-secondary" data-command="agentForge.wipe">
          <span class="btn-icon">&#128465;</span>
          <span class="btn-label">Wipe</span>
        </button>
      </div>
    </div>

    <div class="separator"></div>

    <div class="section">
      <div class="section-title">Configuration</div>
      <button class="btn-secondary" data-command="agentForge.setRepoPath">
        <span class="btn-icon">&#128193;</span> Change Repository
      </button>
      <button class="btn-secondary" data-command="agentForge.selectImageModel">
        <span class="btn-icon">&#128247;</span> Select Image Model
      </button>
      ${!subAgentsEnabled ? `<button class="btn-secondary" data-command="agentForge.enableSubAgents">
        <span class="btn-icon">&#128279;</span> Enable Sub-Agent Nesting
      </button>` : ''}
      <button class="btn-secondary" data-command="agentForge.openSettings">
        <span class="btn-icon">&#9881;</span> Open Settings
      </button>
    </div>`;
}

function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  for (let i = 0; i < 32; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}
