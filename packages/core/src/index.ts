// Types
export type {
  Manifest,
  AgentEntry,
  InstructionEntry,
  PromptEntry,
  HookEntry,
  SkillEntry,
  ToolsetsConfig,
  TargetPaths,
  FileState,
  FileType,
  FileStatus,
  FileOperationDetail,
  OperationError,
  OperationResult,
  DeployResult,
  RestoreResult,
  WipeResult,
  StatusResult,
} from './types.js';

// Errors
export {
  ManifestNotFoundError,
  ManifestParseError,
  ManifestValidationError,
  PathResolutionError,
  FileOperationError,
  GitOperationError,
} from './errors.js';

// Hash
export { hashFile, hashBuffer } from './hash.js';

// Paths
export { expandEnvVars, resolveTargetPath, resolveRepoFilePath, isPathSafe } from './paths.js';

// Manifest
export { loadManifest, validateManifest } from './manifest.js';

// Operations
export { deploy } from './deploy.js';
export { restore } from './restore.js';
export { wipe } from './wipe.js';
export { status } from './status.js';

// Scaffold
export { scaffoldRepo } from './scaffold.js';
export type { ScaffoldResult } from './scaffold.js';

// Image Model
export type { HardwareInfo, ImageModelTier, ImageRuntime } from './imageModel.js';
export { IMAGE_MODEL_TIERS, detectHardware, selectImageModel, selectImageRuntime } from './imageModel.js';
