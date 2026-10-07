import * as path from 'node:path';
import { readFile } from 'node:fs/promises';
import * as vscode from 'vscode';
import {
  getDeploymentStatus,
  loadManifest,
  loadRosterCatalog,
  type RosterCatalog,
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

type GroupKey = 'vscode-managed' | 'vscode-rosters' | 'codex-managed' | 'codex-roster' | 'codex-skills';

interface CopilotRosterSummary {
  name: string;
  coordinator: { id: string; name: string; model?: string; reasoning?: string };
  specialistCount: number;
  skillCount: number;
}

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
  private copilotRosters?: CopilotRosterSummary[];
  private canonical?: RosterCatalog;

  constructor(private readonly getRepoPath: () => string | undefined) {}

  refresh(): void {
    this.result = undefined;
    this.manifest = undefined;
    this.copilotRosters = undefined;
    this.canonical = undefined;
    this.changeEmitter.fire();
  }

  getTreeItem(element: RosterItem): vscode.TreeItem { return element; }

  async getChildren(element?: RosterItem): Promise<RosterItem[]> {
    const repoPath = this.getRepoPath();
    if (!repoPath) return [];
    try {
      this.result ??= await getDeploymentStatus(repoPath, { target: 'all' });
      this.manifest ??= await loadManifest(repoPath);
      if (this.manifest.schemaVersion === 6 && !this.canonical) {
        this.canonical = await loadRosterCatalog(repoPath);
        this.copilotRosters = this.canonical.rosters.map(roster => {
          const coordinator = this.canonical!.agents.find(agent => agent.id === roster.coordinatorId)!;
          return {name:roster.name,coordinator:{id:coordinator.id,name:coordinator.id,model:coordinator.model,reasoning:coordinator.reasoning},specialistCount:this.canonical!.agents.filter(agent=>agent.roster===roster.id&&!agent.coordinator).length,skillCount:new Set(this.canonical!.resources.filter(resource=>resource.kind==='skill'&&resource.roster===roster.id).map(resource=>resource.relativePath.split('/')[0])).size};
        });
      }
      if (this.manifest.copilotFourRosters && !this.copilotRosters) {
        const catalog = JSON.parse(await readFile(path.resolve(repoPath, this.manifest.copilotFourRosters.catalog), 'utf8')) as { rosters: CopilotRosterSummary[] };
        this.copilotRosters = catalog.rosters;
      }
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
        ...(this.copilotRosters ? [new RosterItem('group', 'Copilot rosters (' + this.copilotRosters.length + ')', undefined, 'vscode-rosters')] : []),
        new RosterItem('group', 'VS Code managed files (' + vscodeCount + ')', undefined, 'vscode-managed'),
        new RosterItem('group', 'Codex managed files (' + codexCount + ')', undefined, 'codex-managed'),
        new RosterItem('group', 'Codex roster (' + (this.canonical?.agents.length ?? Object.keys(this.manifest.codex.agents).length) + ')', undefined, 'codex-roster'),
        new RosterItem('group', 'Codex skills (' + (this.canonical ? new Set(this.canonical.resources.filter(r=>r.kind==='skill').map(r=>r.relativePath.split('/')[0])).size : Object.keys(this.manifest.codex.skillBundles).length) + ')', undefined, 'codex-skills'),
      ];
    }

    if (element.groupKey === 'vscode-rosters') {
      const harness = vscode.workspace.getConfiguration('agentForge').get<string>('copilotHarness', 'copilot');
      return (this.copilotRosters ?? []).map(roster => {
        const item = new RosterItem('entry', roster.name);
        item.description = roster.specialistCount + ' specialists · ' + roster.skillCount + ' skills';
        item.tooltip = 'Coordinator: ' + roster.coordinator.name + '\nModel: ' + (roster.coordinator.model ?? 'inherit chat selection') + '\nHooks: ' + harness + '\nSpecialists are available through delegation.';
        item.iconPath = new vscode.ThemeIcon('organization');
        return item;
      });
    }

    if (element.groupKey === 'vscode-managed' || element.groupKey === 'codex-managed') {
      const runtime = element.groupKey.startsWith('vscode') ? 'vscode' : 'codex';
      return (this.result.targets[runtime]?.files ?? []).map(item => new RosterItem('entry', path.basename(item.path), item));
    }
    if (element.groupKey === 'codex-roster') {
      if (this.canonical) return this.canonical.agents.map(agent => {
        const item = new RosterItem('entry',agent.id);
        item.description = (agent.readOnly?'read-only':'workspace-write')+' · '+(agent.model??'model inherit');
        item.tooltip = 'Skills: '+agent.skills.join(', ');
        item.iconPath = new vscode.ThemeIcon(agent.readOnly?'lock':'edit');
        return item;
      });
      return Object.values(this.manifest.codex.agents).map(agent => {
        const item = new RosterItem('entry', agent.id);
        item.description = agent.sandboxMode + ' · ' + (agent.model ?? 'model inherit');
        item.tooltip = 'Bundles: ' + agent.requiredSkillBundles.join(', ');
        item.iconPath = new vscode.ThemeIcon(agent.sandboxMode === 'read-only' ? 'lock' : 'edit');
        return item;
      });
    }
    if (element.groupKey === 'codex-skills') {
      if (this.canonical) return [...new Set(this.canonical.resources.filter(r=>r.kind==='skill').map(r=>r.relativePath.split('/')[0]))].sort().map(id => {
        const item = new RosterItem('entry',id);item.iconPath=new vscode.ThemeIcon('book');return item;
      });
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
