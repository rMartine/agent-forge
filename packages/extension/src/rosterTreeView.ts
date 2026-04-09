import * as vscode from 'vscode';
import { status, type FileStatus, type FileState, type StatusResult } from '@agent-forge/core';

export type RosterItemType = 'group' | 'entry';

const GROUP_LABELS: { key: keyof Omit<StatusResult, 'syncState'>; label: string }[] = [
  { key: 'agents', label: 'Agents' },
  { key: 'instructions', label: 'Instructions' },
  { key: 'skills', label: 'Skills' },
  { key: 'toolsets', label: 'Toolsets' },
  { key: 'prompts', label: 'Prompts' },
  { key: 'hooks', label: 'Hooks' },
];

function stateIcon(state: FileState): vscode.ThemeIcon {
  switch (state) {
    case 'synced':
      return new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
    case 'modified':
      return new vscode.ThemeIcon('warning', new vscode.ThemeColor('testing.iconQueued'));
    case 'missing-locally':
      return new vscode.ThemeIcon('close', new vscode.ThemeColor('testing.iconFailed'));
    case 'missing-from-repo':
      return new vscode.ThemeIcon('question', new vscode.ThemeColor('problemsWarningIcon.foreground'));
    case 'untracked':
      return new vscode.ThemeIcon('eye', new vscode.ThemeColor('textLink.foreground'));
    default:
      return new vscode.ThemeIcon('dash');
  }
}

function pendingIcon(): vscode.ThemeIcon {
  return new vscode.ThemeIcon('dash');
}

function groupIcon(items: FileStatus[]): vscode.ThemeIcon {
  if (items.length === 0) {
    return new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
  }
  const allSynced = items.every((i) => i.state === 'synced');
  return allSynced
    ? new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'))
    : new vscode.ThemeIcon('warning', new vscode.ThemeColor('testing.iconQueued'));
}

export class RosterItem extends vscode.TreeItem {
  constructor(
    public readonly itemType: RosterItemType,
    public readonly groupName?: string,
    public readonly fileStatus?: FileStatus,
  ) {
    const label =
      itemType === 'group'
        ? groupName ?? ''
        : fileStatus?.path.split(/[\\/]/).pop() ?? fileStatus?.path ?? '';

    const collapsible =
      itemType === 'group'
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None;

    super(label, collapsible);

    this.contextValue = itemType;

    if (itemType === 'entry' && fileStatus) {
      this.iconPath = stateIcon(fileStatus.state);
      this.tooltip = `${fileStatus.path} — ${fileStatus.state}`;
      this.description = fileStatus.state;
    }
  }
}

export class RosterTreeViewProvider implements vscode.TreeDataProvider<RosterItem> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<RosterItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private statusResult: StatusResult | undefined;
  private loading = false;

  constructor(private getRepoPath: () => string | undefined) {}

  refresh(): void {
    this.statusResult = undefined;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: RosterItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: RosterItem): Promise<RosterItem[]> {
    const repoPath = this.getRepoPath();
    if (!repoPath) {
      return [];
    }

    // Load status lazily
    if (!this.statusResult && !this.loading) {
      this.loading = true;
      try {
        this.statusResult = await status(repoPath);
      } catch {
        this.statusResult = undefined;
      } finally {
        this.loading = false;
      }
    }

    // Root level — return group headers
    if (!element) {
      if (!this.statusResult) {
        return [];
      }

      return GROUP_LABELS.map(({ key, label }) => {
        const items: FileStatus[] = this.statusResult![key];
        const group = new RosterItem('group', `${label} (${items.length})`);
        group.iconPath = groupIcon(items);

        // Expand groups that have non-synced items
        const hasIssues = items.some((i) => i.state !== 'synced');
        group.collapsibleState = hasIssues
          ? vscode.TreeItemCollapsibleState.Expanded
          : vscode.TreeItemCollapsibleState.Collapsed;

        // Store the key so getChildren can resolve children
        (group as RosterItem & { _groupKey?: string })._groupKey = key;
        return group;
      });
    }

    // Child level — return entries for a group
    if (element.itemType === 'group' && this.statusResult) {
      const key = (element as RosterItem & { _groupKey?: string })._groupKey as
        | keyof Omit<StatusResult, 'syncState'>
        | undefined;

      if (!key) {
        // Derive key from label
        const match = element.groupName?.match(/^(\w+)/);
        const derivedKey = match?.[1]?.toLowerCase() as keyof Omit<StatusResult, 'syncState'> | undefined;
        if (derivedKey && derivedKey in this.statusResult) {
          return this.statusResult[derivedKey].map((fs) => new RosterItem('entry', undefined, fs));
        }
        return [];
      }

      return this.statusResult[key].map((fs) => new RosterItem('entry', undefined, fs));
    }

    return [];
  }

  dispose(): void {
    this._onDidChangeTreeData.dispose();
  }
}
