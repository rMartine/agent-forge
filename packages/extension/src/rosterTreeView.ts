import * as path from 'node:path';
import * as vscode from 'vscode';
import { status, type ArtifactType, type FileStatus, type StatusResult } from '@agent-forge/core';

const GROUPS: Array<{ type: ArtifactType; label: string }> = [
  { type: 'agent', label: 'Agents' },
  { type: 'skill', label: 'Skills' },
  { type: 'instruction', label: 'Instructions' },
  { type: 'hook', label: 'Hooks' },
];

function iconForState(state: FileStatus['state']): vscode.ThemeIcon {
  if (state === 'synced') return new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
  if (state === 'modified') return new vscode.ThemeIcon('warning', new vscode.ThemeColor('testing.iconQueued'));
  if (state === 'unmanaged') return new vscode.ThemeIcon('shield', new vscode.ThemeColor('problemsWarningIcon.foreground'));
  return new vscode.ThemeIcon('close', new vscode.ThemeColor('testing.iconFailed'));
}

export class RosterItem extends vscode.TreeItem {
  public artifactType?: ArtifactType;

  constructor(
    public readonly itemType: 'group' | 'entry' | 'status',
    label: string,
    public readonly fileStatus?: FileStatus,
  ) {
    super(label, itemType === 'group' ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
    this.contextValue = itemType;
    if (fileStatus) {
      this.description = fileStatus.state;
      this.tooltip = `${fileStatus.path} — ${fileStatus.state}`;
      this.iconPath = iconForState(fileStatus.state);
      this.command = {
        command: 'agentForge.openFile',
        title: 'Open managed file',
        arguments: [this],
      };
    }
  }
}

export class RosterTreeViewProvider implements vscode.TreeDataProvider<RosterItem>, vscode.Disposable {
  private readonly changeEmitter = new vscode.EventEmitter<RosterItem | undefined | void>();
  readonly onDidChangeTreeData = this.changeEmitter.event;
  private result?: StatusResult;

  constructor(private readonly getRepoPath: () => string | undefined) {}

  refresh(): void {
    this.result = undefined;
    this.changeEmitter.fire();
  }

  getTreeItem(element: RosterItem): vscode.TreeItem { return element; }

  async getChildren(element?: RosterItem): Promise<RosterItem[]> {
    const repoPath = this.getRepoPath();
    if (!repoPath) return [];
    if (!this.result) {
      try { this.result = await status(repoPath); } catch { return []; }
    }

    if (!element) {
      const deployment = new RosterItem('status', `Deployment: ${this.result.deploymentId ?? 'not deployed'}`);
      deployment.description = this.result.syncState;
      deployment.iconPath = this.result.syncState === 'synced'
        ? new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'))
        : new vscode.ThemeIcon('info');
      const groups = GROUPS.map(({ type, label }) => {
        const items = this.result!.files.filter(item => item.type === type);
        const group = new RosterItem('group', `${label} (${items.length})`);
        group.artifactType = type;
        group.iconPath = items.every(item => item.state === 'synced')
          ? new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'))
          : new vscode.ThemeIcon('warning', new vscode.ThemeColor('testing.iconQueued'));
        return group;
      });
      return [deployment, ...groups];
    }

    if (element.itemType === 'group' && element.artifactType) {
      return this.result.files
        .filter(item => item.type === element.artifactType)
        .map(item => new RosterItem('entry', path.basename(item.path), item));
    }
    return [];
  }

  dispose(): void { this.changeEmitter.dispose(); }
}
