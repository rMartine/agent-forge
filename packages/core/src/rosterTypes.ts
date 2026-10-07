import type { ArtifactType, Diagnostic } from './types.js';
import type { SharedHooksGroups } from './sharedHooks.js';

/** Editions share logical roles/resources; only their native packaging differs. */
export type ArtifactEdition = 'codex' | 'vscode' | 'opencode';
export interface CanonicalAgent {
  id: string;
  roster: string;
  description: string;
  body: string;
  sourcePath: string;
  model?: string;
  reasoning?: string;
  readOnly: boolean;
  coordinator: boolean;
  skills: string[];
  completionEvidence: string[];
  delegation: 'allowed';
}
export interface CanonicalResource {
  id: string;
  roster: string;
  kind: 'skill' | 'runtime';
  sourcePath: string;
  /** Skill resources begin with their canonical skill ID. */
  relativePath: string;
  content: Buffer;
  dependency: boolean;
  adaptation: 'prose' | 'none';
}
export interface CanonicalRoster {
  id: string;
  name: string;
  coordinatorId: string;
  coordinationSkill: string;
}
export interface RosterCatalog {
  schemaVersion: 1;
  rosters: CanonicalRoster[];
  agents: CanonicalAgent[];
  resources: CanonicalResource[];
  aliases: Record<string, string>;
  diagnostics: Diagnostic[];
}
export interface RosterEditionContext {
  repoPath: string;
  agentRoot: string;
  skillRoot: string;
  runtimeRoot: string;
  hooksRoot?: string;
  harness?: 'local' | 'copilot';
  availableModels?: string[];
  availableTools?: string[];
}
export interface RosterEditionFile {
  id: string;
  type: ArtifactType;
  relativePath: string;
  sourcePath: string;
  content: Buffer;
}
export interface RenderedRosterEdition {
  edition: ArtifactEdition;
  files: RosterEditionFile[];
  diagnostics: Diagnostic[];
  coverage: unknown;
  hookGroups?: SharedHooksGroups;
}
