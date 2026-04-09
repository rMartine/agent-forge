export interface Manifest {
  version: string;
  editor: string;
  targets: TargetPaths;
  agents?: AgentEntry[];
  instructions?: InstructionEntry[];
  skills?: SkillEntry[];
  toolsets?: ToolsetsConfig;
  prompts?: PromptEntry[];
  hooks?: HookEntry[];
}

export interface AgentEntry {
  id: string;
  file: string;
  category: string;
  model?: string | null;
  toolset?: string | null;
}

export interface InstructionEntry {
  id: string;
  file: string;
}

export interface PromptEntry {
  id: string;
  file: string;
}

export interface HookEntry {
  id: string;
  file: string;
}

export interface SkillEntry {
  id: string;
  dir: string;
}

export interface ToolsetsConfig {
  file: string;
}

export interface TargetPaths {
  prompts: string;
  skills: string;
  hooks?: string;
}

export type FileState = 'synced' | 'modified' | 'missing-locally' | 'missing-from-repo' | 'untracked';

export type FileType = 'agent' | 'instruction' | 'skill' | 'toolset' | 'prompt' | 'hook';

export interface FileStatus {
  path: string;
  state: FileState;
  type: FileType;
}

export interface FileOperationDetail {
  path: string;
  action: string;
  type: FileType;
}

export interface OperationError {
  path: string;
  message: string;
}

export interface OperationResult {
  success: boolean;
  summary: Record<string, number>;
  details: FileOperationDetail[];
  errors: OperationError[];
}

export interface DeployResult extends OperationResult {
  deployed: number;
  skipped: number;
  failed: number;
}

export interface RestoreResult extends OperationResult {
  restored: number;
  recreated: number;
  alreadyMatching: number;
}

export interface WipeResult extends OperationResult {
  deleted: number;
  notFound: number;
}

export interface StatusResult {
  agents: FileStatus[];
  instructions: FileStatus[];
  skills: FileStatus[];
  toolsets: FileStatus[];
  prompts: FileStatus[];
  hooks: FileStatus[];
  syncState: 'synced' | 'out-of-sync';
}
