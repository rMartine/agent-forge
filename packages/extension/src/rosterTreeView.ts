import * as path from 'node:path';
import * as vscode from 'vscode';
import {
  getDeploymentStatus,
  loadManifest,
  type DeploymentManifestV3,
  type FileStatus,
  type RuntimeStatusResult,
} from '@agent-forge/core';

function iconForState(state: FileStatus['state']): vscode.ThemeIcon {
  if (state === 'synced') return new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
  if (state === 'modified') return new vscode.ThemeIcon('warning', new vscode.ThemeColor('testing.iconQueued'));
  if (state === 'unmanaged') return new vscode.ThemeIcon('shield', new vscode.ThemeColor('problemsWarningIcon.foreground'));
  return new vscode.ThemeIcon('close', new vscode.ThemeColor('testing.iconFailed'));
}

type GroupKey = 'vscode-managed' | 'codex-managed' | 'codex-roster' | 'codex-skills';

export class RosterItem extends vscode.TreeItem {
  constructor(
    public readonly itemType: 'group' | 'entry' | 'status',
    label: string,
    public readonly fileStatus?: FileStatus,
    public readonly groupKey?: GroupKey,
  ) {
    super(label, itemType === 'group' ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
    this.contextValue = itemType;
    if (fileStatus) {
      this.description = fileStatus.state;
      this.tooltip = fileStatus.path + ' — ' + fileStatus.state;
      this.iconPath = iconForState(fileStatus.state);
      this.command = { command: 'agentForge.openFile', title: 'Open managed file', arguments: [this] };
    }
  }
}

export class RosterTreeViewProvider implements vscode.TreeDataProvider<RosterItem>, vscode.Disposable {
  private readonly changeEmitter = new vscode.EventEmitter<RosterItem | undefined | void>();
  readonly onDidChangeTreeData = this.changeEmitter.event;
  private result?: RuntimeStatusResult;
  private manifest?: DeploymentManifestV3;

  constructor(private readonly getRepoPath: () => string | undefined) {}

  refresh(): void {
    this.result = undefined;
    this.manifest = undefined;
    this.changeEmitter.fire();
  }

  getTreeItem(element: RosterItem): vscode.TreeItem { return element; }

  async getChildren(element?: RosterItem): Promise<RosterItem[]> {
    const repoPath = this.getRepoPath();
    if (!repoPath) return [];
    try {
      this.result ??= await getDeploymentStatus(repoPath, { target: 'all' });
      this.manifest ??= await loadManifest(repoPath);
    } catch { return []; }

    if (!element) {
      const statuses = (['vscode', 'codex'] as const).map(runtime => {
        const current = this.result!.targets[runtime];
        const item = new RosterItem('status', runtime + ': ' + (current?.deploymentId ?? 'not deployed'));
        item.description = current?.syncState ?? 'not-deployed';
        item.iconPath = current?.syncState === 'synced' ? new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed')) : new vscode.ThemeIcon('info');
        return item;
      });
      const vscodeCount = this.result.targets.vscode?.files.length ?? 0;
      const codexCount = this.result.targets.codex?.files.length ?? 0;
      return [
        ...statuses,
        new RosterItem('group', 'VS Code managed files (' + vscodeCount + ')', undefined, 'vscode-managed'),
        new RosterItem('group', 'Codex managed files (' + codexCount + ')', undefined, 'codex-managed'),
        new RosterItem('group', 'Codex roster (16)', undefined, 'codex-roster'),
        new RosterItem('group', 'Codex skill bundles (5)', undefined, 'codex-skills'),
      ];
    }

    if (element.groupKey === 'vscode-managed' || element.groupKey === 'codex-managed') {
      const runtime = element.groupKey.startsWith('vscode') ? 'vscode' : 'codex';
      return (this.result.targets[runtime]?.files ?? []).map(item => new RosterItem('entry', path.basename(item.path), item));
    }
    if (element.groupKey === 'codex-roster') {
      return Object.values(this.manifest.codex.agents).map(agent => {
        const item = new RosterItem('entry', agent.id);
        item.description = agent.sandboxMode + ' · model inherit';
        item.tooltip = 'Bundles: ' + agent.requiredSkillBundles.join(', ');
        item.iconPath = new vscode.ThemeIcon(agent.sandboxMode === 'read-only' ? 'lock' : 'edit');
        return item;
      });
    }
    if (element.groupKey === 'codex-skills') {
      return Object.values(this.manifest.codex.skillBundles).map(bundle => {
        const item = new RosterItem('entry', bundle.deploymentName);
        item.description = bundle.componentSkills.length + ' workflows';
        item.tooltip = bundle.description;
        item.iconPath = new vscode.ThemeIcon('book');
        return item;
      });
    }
    return [];
  }

  dispose(): void { this.changeEmitter.dispose(); }
}
