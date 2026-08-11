export type DeploymentScope = 'user';
export type ModelProfile = 'inherit' | 'reasoning' | 'coding' | 'creative' | 'balanced';
export type AgentVisibility = 'entry' | 'worker';
export type CapabilityAccess = 'read' | 'write' | 'admin';
export type DiagnosticSeverity = 'info' | 'warning' | 'error';
export type ArtifactType = 'agent' | 'instruction' | 'skill' | 'hook';

export interface AgentManifestEntry {
  id: string;
  source: string;
  visibility: AgentVisibility;
  capabilityProfile: string;
  modelProfile: ModelProfile;
  requiredSkills: string[];
  optionalSkills: string[];
  allowedSubagents: string[];
  handoffs: string[];
  requiredCapabilities: string[];
  optionalCapabilities: string[];
}

export interface FileArtifactEntry { id: string; source: string; }
export interface DeploymentTargets { agents: string; instructions: string; skills: string; hooks: string; state: string; }

export interface DeploymentManifestV2 {
  schemaVersion: 2;
  platform: 'vscode';
  scope: DeploymentScope;
  targets: DeploymentTargets;
  capabilityCatalog: string;
  modelProfiles: string;
  mcpProviders: string;
  agents: Record<string, AgentManifestEntry>;
  instructions: FileArtifactEntry[];
  skills: FileArtifactEntry[];
  hooks: FileArtifactEntry[];
}

export interface CapabilityProfile { builtins: string[]; required: string[]; optional: string[]; }
export interface CapabilityCatalog {
  version: 1;
  providers: Record<string, { toolPatterns: string[] }>;
  capabilities: Record<string, { access: CapabilityAccess; provider?: string; tools: string[] }>;
  profiles: Record<string, CapabilityProfile>;
}
export interface ModelPolicy { version: 1; profiles: Record<ModelProfile, string[]>; }
export interface Diagnostic {
  code: `AF${string}`;
  severity: DiagnosticSeverity;
  message: string;
  path?: string;
  agentId?: string;
  hint?: string;
}
export interface ValidationResult { valid: boolean; diagnostics: Diagnostic[]; }
export interface ResolvedAgentRuntime {
  tools: string[];
  model?: string | string[];
  missingRequiredCapabilities: string[];
  missingOptionalCapabilities: string[];
}
export interface DeploymentArtifact {
  id: string;
  type: ArtifactType;
  sourcePath: string;
  targetPath: string;
  content?: Buffer;
  sourceHash: string;
}
export interface DeploymentPlan {
  deploymentId: string;
  repoPath: string;
  createdAt: string;
  artifacts: DeploymentArtifact[];
  diagnostics: Diagnostic[];
}
export interface ManagedArtifactState {
  id: string;
  type: ArtifactType;
  targetPath: string;
  deployedHash: string;
  backupPath?: string;
  existedBefore: boolean;
}
export interface DeploymentRecord { id: string; createdAt: string; repoPath: string; artifacts: ManagedArtifactState[]; }
export interface DeploymentState { schemaVersion: 1; activeDeploymentId?: string; deployments: DeploymentRecord[]; }
export interface FileOperationDetail { path: string; action: string; type: ArtifactType; }
export interface OperationError { path: string; message: string; }
export interface OperationResult {
  success: boolean;
  summary: Record<string, number>;
  details: FileOperationDetail[];
  errors: OperationError[];
  diagnostics: Diagnostic[];
}
export interface DeployResult extends OperationResult {
  deploymentId?: string;
  deployed: number;
  skipped: number;
  failed: number;
}
export interface RestoreResult extends OperationResult { deploymentId?: string; restored: number; skipped: number; }
export interface WipeResult extends OperationResult { deleted: number; skipped: number; }
export interface FileStatus {
  id: string;
  path: string;
  type: ArtifactType;
  state: 'synced' | 'modified' | 'missing' | 'unmanaged';
}
export interface StatusResult {
  deploymentId?: string;
  files: FileStatus[];
  syncState: 'synced' | 'out-of-sync' | 'not-deployed';
  diagnostics: Diagnostic[];
}

export interface VsCodeEnvironment {
  supported: boolean;
  version?: string;
  userProfile: string;
  availableTools: string[];
  availableModels: string[];
  targets: DeploymentTargets;
  diagnostics: Diagnostic[];
}

export interface McpSetupChange {
  provider: string;
  action: 'add' | 'manual';
  cliPayload?: Record<string, unknown>;
  message: string;
}

export interface McpSetupPlan {
  changes: McpSetupChange[];
  diagnostics: Diagnostic[];
}

export interface McpSetupResult {
  success: boolean;
  applied: string[];
  skipped: string[];
  diagnostics: Diagnostic[];
}
