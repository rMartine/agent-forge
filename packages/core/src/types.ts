import type { SharedHooksOwnership, SharedHooksPlan } from './sharedHooks.js';

export type DeploymentScope = 'user';
export type RuntimeTarget = 'vscode' | 'codex';
export type RuntimeSelection = RuntimeTarget | 'all';
export type CodexSandboxMode = 'read-only' | 'workspace-write';
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

export interface RuntimeDeploymentTargets {
  vscode: Omit<DeploymentTargets, 'state'>;
  codex: { agents: string; skills: string };
  state: string;
}

export interface CodexAgentManifestEntry {
  id: string;
  sourceAgent: string;
  displayName?: string;
  sandboxMode: CodexSandboxMode;
  modelProfile: ModelProfile;
  requiredSkillBundles: string[];
  instructionOverlay: string;
  requiredCapabilities: string[];
  optionalCapabilities: string[];
  completionEvidence?: string[];
}

export interface CodexSkillBundleEntry {
  id: string;
  deploymentName: string;
  entrypoint: string;
  description: string;
  componentSkills: string[];
  flattenedReferences: string[];
}

export interface DeploymentManifestV3 {
  schemaVersion: 3 | 4;
  platforms: RuntimeTarget[];
  scope: DeploymentScope;
  targets: RuntimeDeploymentTargets;
  capabilityCatalog: string;
  modelProfiles: string;
  mcpProviders: string;
  agents: Record<string, AgentManifestEntry>;
  instructions: FileArtifactEntry[];
  skills: FileArtifactEntry[];
  hooks: FileArtifactEntry[];
  codex: {
    agents: Record<string, CodexAgentManifestEntry>;
    skillBundles: Record<string, CodexSkillBundleEntry>;
    externalSkillCatalog?: string;
    productDevelopment?: {
      source: string;
      deploymentName: string;
      hooksSource: string;
      hooksTarget: string;
    };
  };
}

export type DeploymentManifest = DeploymentManifestV3;

/** @deprecated Use DeploymentManifestV3. */
export type DeploymentManifestV2 = DeploymentManifestV3;

export interface CapabilityProfile { builtins: string[]; required: string[]; optional: string[]; }
export interface CapabilityCatalog {
  version: 1;
  providers: Record<string, { toolPatterns: string[] }>;
  capabilities: Record<string, {
    access: CapabilityAccess;
    provider?: string;
    tools: string[];
    requiredTools?: string[];
  }>;
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
  runtime: RuntimeTarget;
  sourcePath: string;
  targetPath: string;
  content?: Buffer;
  sourceHash: string;
  sharedHooks?: SharedHooksPlan;
}
export interface DeploymentPlan {
  deploymentId: string;
  repoPath: string;
  createdAt: string;
  targets: RuntimeTarget[];
  sourceCommit?: string;
  artifacts: DeploymentArtifact[];
  cleanupActions: CleanupAction[];
  diagnostics: Diagnostic[];
}
export interface CleanupAction {
  runtime: RuntimeTarget;
  targetPath: string;
  expectedHash: string;
  type: ArtifactType;
  reason: 'stale-managed';
  sharedHooks?: SharedHooksOwnership;
}
export interface CleanupPlan {
  planId: string;
  repoPath: string;
  createdAt: string;
  targets: RuntimeTarget[];
  actions: CleanupAction[];
  diagnostics: Diagnostic[];
}
export interface ManagedArtifactState {
  id: string;
  type: ArtifactType;
  targetPath: string;
  deployedHash: string;
  backupPath?: string;
  existedBefore: boolean;
  runtime: RuntimeTarget;
  sharedHooks?: SharedHooksOwnership;
}
export interface RuntimeDeploymentRecord { id: string; runtime: RuntimeTarget; createdAt: string; repoPath: string; sourceCommit?: string; previousDeploymentId?: string | null; artifacts: ManagedArtifactState[]; removedArtifacts?: ManagedArtifactState[]; }
export type DeploymentRecord = RuntimeDeploymentRecord;
export interface DeploymentStateV2 {
  schemaVersion: 2;
  activeDeployments: Partial<Record<RuntimeTarget, string>>;
  deployments: RuntimeDeploymentRecord[];
}
export type DeploymentState = DeploymentStateV2;
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
  runtime: RuntimeTarget;
  state: 'synced' | 'modified' | 'missing' | 'unmanaged';
}
export interface StatusResult {
  deploymentId?: string;
  runtime?: RuntimeTarget;
  files: FileStatus[];
  syncState: 'synced' | 'out-of-sync' | 'not-deployed';
  diagnostics: Diagnostic[];
}

export interface RuntimeStatusResult {
  targets: Partial<Record<RuntimeTarget, StatusResult>>;
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

export interface CodexEnvironment {
  supported: boolean;
  version?: string;
  userProfile: string;
  codexHome: string;
  agentsTarget: string;
  skillsTarget: string;
  integrationDetected: boolean;
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
