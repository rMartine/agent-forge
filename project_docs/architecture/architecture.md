# Agent Forge — Architecture Design

**Status**: Accepted  
**Date**: 2026-04-08  
**Author**: Software Architect  

---

## 1. Repository Layout

```
agent-forge/
│
├── agent-forge.manifest.jsonc          # Roster manifest (source of truth)
│
├── agents/                             # Agent .agent.md files
│   ├── software-architect.agent.md
│   ├── backend-developer.agent.md
│   ├── desktop-app-engineer.agent.md
│   ├── graphic-designer.agent.md
│   └── ...
│
├── instructions/                       # Instruction .instructions.md files
│   ├── agent-communication.instructions.md
│   └── ...
│
├── skills/                             # Skill directories (each contains SKILL.md + assets)
│   ├── query-knowledge-base/
│   │   └── SKILL.md
│   ├── scaffold-project/
│   │   └── SKILL.md
│   ├── generate-logo/
│   │   └── SKILL.md
│   ├── search-stock-images/
│   │   └── SKILL.md
│   └── ...
│
├── config/                             # Toolset configurations
│   └── common.toolsets.jsonc
│
├── packages/
│   ├── core/                           # Shared business logic library
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── manifest.ts
│   │       ├── paths.ts
│   │       ├── deploy.ts
│   │       ├── restore.ts
│   │       ├── wipe.ts
│   │       ├── status.ts
│   │       ├── hash.ts
│   │       ├── types.ts
│   │       ├── errors.ts
│   │       └── imageModel.ts
│   │
│   ├── extension/                      # VS Code extension
│   │   ├── package.json                # Extension manifest (contributes, activationEvents)
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── extension.ts
│   │       ├── commands.ts
│   │       └── rosterTreeView.ts
│   │
│   └── cli/                            # CLI tool
│       ├── package.json                # bin entry: "agent-forge"
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           └── commands/
│               ├── deploy.ts
│               ├── restore.ts
│               ├── wipe.ts
│               └── status.ts
│
├── generated/                          # Generated/downloaded assets (gitignored images)
│   └── logo/
│       └── generate_logo.py
│
├── scripts/
│   ├── install.ps1                     # Build + install extension + CLI
│   └── uninstall.ps1                   # Remove extension + CLI
│
├── project_docs/
│   ├── requirements/                   # Product requirements
│   ├── architecture/                   # This document, ADRs
│   ├── backlog/
│   └── knowledge/
│
├── package.json                        # Root workspace package.json
├── tsconfig.base.json                  # Shared TypeScript config
├── README.md
└── .gitignore
```

### Workspace Configuration

The root `package.json` uses npm workspaces to link the three packages:

```json
{
  "name": "agent-forge-workspace",
  "private": true,
  "workspaces": ["packages/core", "packages/extension", "packages/cli"]
}
```

`tsconfig.base.json` at the root defines shared compiler settings. Each package extends it via `"extends": "../../tsconfig.base.json"` and adds package-specific `paths`, `outDir`, and `rootDir`.

---

## 2. Module Decomposition — `packages/core`

All business logic lives here. Both extension and CLI import from `@agent-forge/core`. This package has **zero VS Code dependencies** and **zero terminal I/O** — it is a pure logic library that accepts inputs and returns structured results.

### `types.ts` — Shared Type Definitions

Defines all TypeScript interfaces and types:

| Type | Purpose |
|------|---------|
| `Manifest` | Top-level manifest structure (version, editor, targets, agents, instructions, skills, toolsets) |
| `AgentEntry` | Agent manifest entry: id, file, category, model, toolset |
| `InstructionEntry` | Instruction manifest entry: id, file |
| `SkillEntry` | Skill manifest entry: id, dir |
| `ToolsetsConfig` | Toolset configuration reference: file |
| `TargetPaths` | Resolved target paths: prompts, skills |
| `FileStatus` | Per-file status: path, state (synced/modified/missing-locally/missing-from-repo/untracked), type (agent/instruction/skill/toolset) |
| `OperationResult` | Generic result for all operations: success boolean, summary counts, per-file details, errors |
| `DeployResult` | Extends OperationResult with deployed/skipped/failed counts |
| `RestoreResult` | Extends OperationResult with restored/recreated/already-matching counts |
| `WipeResult` | Extends OperationResult with deleted/not-found counts |
| `StatusResult` | Groups of FileStatus entries by type, with overall sync state |

### `errors.ts` — Custom Error Classes

| Error Class | When Thrown |
|-------------|------------|
| `ManifestNotFoundError` | Manifest file does not exist at expected path |
| `ManifestParseError` | JSONC syntax error (includes line number from parser) |
| `ManifestValidationError` | Schema validation failure (missing fields, duplicate IDs, invalid entries) |
| `PathResolutionError` | Environment variable cannot be resolved or path traversal detected |
| `FileOperationError` | File read/write/delete fails (permissions, lock, etc.) |
| `GitOperationError` | Git command fails (no commits, repo not found) |

All errors include an `actionableMessage` property: a user-facing string explaining what went wrong and what the user can do.

### `manifest.ts` — Manifest Loading and Validation

**Responsibilities:**
- Load manifest file from a given repo path (expects `agent-forge.manifest.jsonc` at root)
- Parse JSONC using `jsonc-parser` (handles comments, trailing commas)
- Validate schema: required fields (`version`, `editor`, `targets`), entry structure, no duplicate IDs
- Return a typed `Manifest` object or throw `ManifestParseError` / `ManifestValidationError`

**Key exports:**
- `loadManifest(repoPath: string): Promise<Manifest>`
- `validateManifest(raw: unknown): Manifest` (pure validation, no I/O)

**Validation rules:**
1. `version` must be `"1.0"` (only supported version in MVP)
2. `editor` must be `"vscode"`
3. `targets.prompts` and `targets.skills` must be non-empty strings
4. Every agent must have `id` (non-empty, unique) and `file` (non-empty)
5. Every instruction must have `id` (non-empty, unique) and `file` (non-empty)
6. Every skill must have `id` (non-empty, unique) and `dir` (non-empty)
7. `toolsets.file` must be a non-empty string if `toolsets` is present
8. No duplicate `id` values across all entry types (agents, instructions, skills share ID namespace)

### `paths.ts` — Path Resolution and Safety

**Responsibilities:**
- Expand environment variables in target paths (`%APPDATA%` → actual value, `%USERPROFILE%` → actual value)
- Normalize all paths to forward slashes internally
- Convert back to OS-native separators for file operations
- Validate that resolved paths do not escape expected directories (path traversal prevention per NFR-SEC-3)
- Resolve file paths relative to the repo root

**Key exports:**
- `expandEnvVars(pathWithVars: string): string`
- `resolveTargetPath(target: string): string` (expand + normalize + validate)
- `resolveRepoFilePath(repoRoot: string, relativePath: string): string`
- `isPathSafe(resolvedPath: string, allowedBase: string): boolean`

**Security:**
- Reject paths containing `..` segments after normalization
- Reject paths that resolve outside the target base directory
- Throw `PathResolutionError` with the unresolved variable name if an env var is undefined

### `hash.ts` — File Hashing Utility

**Responsibilities:**
- Compute SHA-256 hash of file content
- Uses Node.js `crypto` module (no external dependency)

**Key exports:**
- `hashFile(filePath: string): Promise<string>` — Returns hex-encoded SHA-256 hash
- `hashBuffer(buffer: Buffer): string` — Synchronous hash for in-memory content

### `deploy.ts` — Deploy Operation

**Responsibilities:**
- Read and validate the manifest
- For each managed file: resolve source (repo) and target (OS location) paths
- Compare source and target via SHA-256 hash; skip if identical
- Create target directories as needed
- Copy source to target; report per-file result
- Return `DeployResult` with deployed/skipped/failed counts

**Key exports:**
- `deploy(repoPath: string): Promise<DeployResult>`

**Behavior:**
- Reads from working tree (not Git state) — deploys whatever is on disk in the repo
- Per-file atomic: if one file fails, the rest still deploy
- Does NOT modify source repo files (NFR-DATA-1)
- Skills are deployed as directory copies (recursive)

### `restore.ts` — Restore Operation

**Responsibilities:**
- Read and validate the manifest
- For each managed file: retrieve the last committed version via `git show HEAD:<path>`
- Overwrite the target (OS location) with the committed version
- Re-create files that are missing locally
- Return `RestoreResult`

**Key exports:**
- `restore(repoPath: string): Promise<RestoreResult>`

**Behavior:**
- Uses `simple-git` to execute `git show HEAD:<relative-path>` for each file
- Throws `GitOperationError` if repo has no commits
- Does NOT modify source repo files (NFR-DATA-2)
- Untracked files (not in manifest) are left untouched

### `wipe.ts` — Wipe Operation

**Responsibilities:**
- Read and validate the manifest
- For each managed file: resolve target path and delete
- For skills: delete the entire directory recursively
- Leave empty parent folders intact (do not delete OS-level VS Code directories)
- Return `WipeResult`

**Key exports:**
- `wipe(repoPath: string): Promise<WipeResult>`

**Behavior:**
- Only deletes files listed in the manifest
- Untracked files are never touched
- Reports locked/inaccessible files as errors without stopping

### `status.ts` — Status Operation

**Responsibilities:**
- Read and validate the manifest
- For each managed file: hash both repo version and local version
- Categorize each file into one of:
  - `synced` — hashes match
  - `modified` — both exist, hashes differ
  - `missing-locally` — in manifest/repo, not at target location
  - `missing-from-repo` — in manifest, but source file not found in repo
  - `untracked` — exists at target location, not in manifest
- For untracked detection: scan target directories for files matching known patterns (`.agent.md`, `.instructions.md`, `SKILL.md`, toolset configs)
- Group results by type (agents, instructions, skills, toolsets)
- Return `StatusResult`

**Key exports:**
- `status(repoPath: string): Promise<StatusResult>`

---

## 3. Module Decomposition — `packages/extension`

The extension is a thin wrapper around `@agent-forge/core`. It handles VS Code-specific concerns: command registration, settings, progress UI, output channel, and confirmation dialogs.

### `extension.ts` — Extension Entry Point

**Responsibilities:**
- Export `activate(context: ExtensionContext)` and `deactivate()`
- Register all commands in `activate`
- Create and own the "Agent Forge" output channel
- Read `agentForge.repoPath` from VS Code settings; prompt if missing
- Lazy activation: activated only when the user invokes an Agent Forge command

**Activation events** (in `package.json`):
```json
"activationEvents": [
  "onCommand:agentForge.deploy",
  "onCommand:agentForge.restore",
  "onCommand:agentForge.wipe",
  "onCommand:agentForge.status"
]
```

**Extension settings** (in `package.json` `contributes.configuration`):
| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `agentForge.repoPath` | string | `""` | Absolute path to the roster Git repository |
| `agentForge.autoConfirm` | boolean | `false` | Skip confirmation for destructive operations |
| `agentForge.imageModelStoragePath` | string | `""` | Where image generation models are stored (default: `~/.agent-forge/models`) |
| `agentForge.generatedAssetsPath` | string | `""` | Where the graphic-designer saves generated/downloaded assets (default: project `generated/` folder) |

### `commands.ts` — Command Handlers

**Responsibilities:**
- One handler function per command: `handleDeploy`, `handleRestore`, `handleWipe`, `handleStatus`
- Each handler:
  1. Reads `repoPath` from settings (or prompts for it)
  2. Shows progress via `vscode.window.withProgress()`
  3. Calls the corresponding `@agent-forge/core` function
  4. Formats the result for display
  5. Shows summary via `vscode.window.showInformationMessage()` or `showErrorMessage()`
- `handleWipe` and `handleRestore` show modal confirmation dialog before proceeding (unless `autoConfirm` is set)
- `handleStatus` writes detailed results to the "Agent Forge" output channel

---

## 4. Module Decomposition — `packages/cli`

The CLI is a Node.js script that wraps `@agent-forge/core` with terminal I/O. It uses `commander` for argument parsing.

### `index.ts` — Entry Point

**Responsibilities:**
- Configure `commander` program with name, version, description
- Register subcommands: `deploy`, `restore`, `wipe`, `status`
- Parse `process.argv`
- Global options: `--repo <path>`, `--yes` / `-y`

The `package.json` `bin` field maps `"agent-forge"` to the compiled entry point.

### `commands/deploy.ts`

- Resolves repo path from `--repo` flag, or CWD, or error
- Calls `core.deploy(repoPath)`
- Prints summary table to stdout

### `commands/restore.ts`

- Resolves repo path
- Prompts for confirmation (`[y/N]`) unless `--yes` is passed
- Calls `core.restore(repoPath)`
- Prints summary table to stdout

### `commands/wipe.ts`

- Prompts for confirmation (`[y/N]`) unless `--yes` is passed
- Calls `core.wipe(repoPath)`
- Prints summary table to stdout

### `commands/status.ts`

- Resolves repo path
- Calls `core.status(repoPath)`
- Prints grouped status table to stdout (agents, instructions, skills, toolsets)
- Uses plain text formatting (no color-only information per NFR-USE-3)

---

## 5. Manifest Schema (Final)

```jsonc
{
  // Manifest format version. Only "1.0" is supported in MVP.
  "version": "1.0",

  // Target editor. Only "vscode" is supported in MVP.
  "editor": "vscode",

  // Deployment target paths.
  // Supports Windows environment variables: %APPDATA%, %USERPROFILE%, etc.
  // Paths are resolved at runtime by the core paths module.
  "targets": {
    "prompts": "%APPDATA%/Code/User/prompts",
    "skills": "%USERPROFILE%/.copilot/skills"
  },

  // Agent definitions.
  // Each agent maps to a .agent.md file in the repo.
  "agents": [
    {
      // Unique identifier. Must be unique across all entry types.
      "id": "software-architect",

      // Path to the agent file, relative to repo root.
      "file": "agents/software-architect.agent.md",

      // Category tag for grouping and selective operations (v1.1).
      "category": "engineering",

      // Model override (v1.1). null = use whatever the file specifies.
      "model": null,

      // Toolset reference. Matches a key in the toolsets section, or null.
      "toolset": "design"
    }
  ],

  // Instruction file definitions.
  // Each maps to a .instructions.md file in the repo.
  "instructions": [
    {
      // Unique identifier.
      "id": "agent-communication",

      // Path to the instruction file, relative to repo root.
      "file": "instructions/agent-communication.instructions.md"
    }
  ],

  // Skill definitions.
  // Each maps to a directory in the repo containing SKILL.md and assets.
  "skills": [
    {
      // Unique identifier.
      "id": "query-knowledge-base",

      // Path to the skill directory, relative to repo root.
      "dir": "skills/query-knowledge-base/"
    }
  ],

  // Toolset configuration.
  // A single file containing shared toolset definitions.
  "toolsets": {
    // Path to the toolset config file, relative to repo root.
    "file": "config/common.toolsets.jsonc"
  }
}
```

### Field Type Summary

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `version` | `string` | Yes | Must be `"1.0"` |
| `editor` | `string` | Yes | Must be `"vscode"` |
| `targets.prompts` | `string` | Yes | Supports env var expansion |
| `targets.skills` | `string` | Yes | Supports env var expansion |
| `agents` | `AgentEntry[]` | No | Empty array or absent = no agents |
| `agents[].id` | `string` | Yes | Unique across all entries |
| `agents[].file` | `string` | Yes | Relative to repo root |
| `agents[].category` | `string` | Yes | Free-form string tag |
| `agents[].model` | `string \| null` | No | Default: `null` |
| `agents[].toolset` | `string \| null` | No | Default: `null` |
| `instructions` | `InstructionEntry[]` | No | Empty array or absent = none |
| `instructions[].id` | `string` | Yes | Unique |
| `instructions[].file` | `string` | Yes | Relative to repo root |
| `skills` | `SkillEntry[]` | No | Empty array or absent = none |
| `skills[].id` | `string` | Yes | Unique |
| `skills[].dir` | `string` | Yes | Relative to repo root |
| `toolsets` | `ToolsetsConfig` | No | Absent = no toolset config |
| `toolsets.file` | `string` | Yes (if toolsets present) | Relative to repo root |

---

## 6. Key Architectural Decisions

### ADR-001: TypeScript Monorepo with Shared Core

**Status**: Accepted  
**Date**: 2026-04-08

#### Context
Agent Forge has two consumer interfaces (VS Code extension, CLI) that perform identical operations. Duplicating logic across both would cause drift and double the maintenance burden per NFR-MAINT-1.

#### Decision
Use a TypeScript monorepo with three packages under `packages/`. The `core` package contains all business logic and is imported by both `extension` and `cli`. npm workspaces manage inter-package linking.

#### Alternatives Considered
| Option | Pros | Cons |
|--------|------|------|
| Single package (extension only) | Simpler structure | CLI would need to extract/duplicate logic |
| Two separate repos | Independent versioning | Logic duplication, version drift |
| **Monorepo with shared core** | **Zero logic duplication, single version** | **Slightly more build config** |

#### Consequences
- **Positive**: Single source of truth for all operations. Both interfaces guaranteed identical behavior.
- **Negative**: npm workspace configuration adds some build complexity.
- **Risks**: Core module must avoid VS Code API imports — enforced by `core`'s tsconfig excluding VS Code types.

---

### ADR-002: JSONC for Manifest Format

**Status**: Accepted  
**Date**: 2026-04-08

#### Context
The manifest is hand-edited by a power user. JSONC (JSON with Comments) allows inline documentation, which is valuable for a config file with many entries. OQ-MANIFEST-1 from requirements asks whether to use JSONC or strict JSON.

#### Decision
Use JSONC. Parse with `jsonc-parser` (the same library VS Code itself uses, maintained by the VS Code team). File extension: `.jsonc`.

#### Alternatives Considered
| Option | Pros | Cons |
|--------|------|------|
| Strict JSON | Universal parser support | No comments — poor UX for a hand-edited file |
| YAML | Comments, human-friendly | Whitespace-sensitive, ambiguous types, larger parser |
| TOML | Comments, typed | Less familiar, poor nested array support |
| **JSONC** | **Comments, familiar JSON syntax, VS Code-native** | **Requires specific parser** |

#### Consequences
- **Positive**: User can annotate the manifest. VS Code provides syntax highlighting for `.jsonc` natively.
- **Negative**: Must use `jsonc-parser` instead of `JSON.parse()`.
- **Risks**: Minimal — `jsonc-parser` is a well-maintained, zero-dependency package from Microsoft.

---

### ADR-003: SHA-256 Content Hashing for Status Comparison

**Status**: Accepted  
**Date**: 2026-04-08

#### Context
The status operation needs to diff repo files against deployed files. OQ-LIFECYCLE-3 asks whether to use hash comparison, timestamps, or both.

#### Decision
SHA-256 content hashing via Node.js `crypto` module. No timestamp comparison.

#### Alternatives Considered
| Option | Pros | Cons |
|--------|------|------|
| Timestamp (mtime) | Fast | Unreliable — copy operations reset timestamps, cross-machine sync invalidates them |
| Byte-for-byte comparison | No hash computation | Requires reading both files fully into memory simultaneously |
| **SHA-256 hash** | **Deterministic, reliable, standard** | **Reads full file content** |

#### Consequences
- **Positive**: Reliable detection regardless of how files were copied. No false positives from timestamp drift.
- **Negative**: Must read entire file content for each comparison. Acceptable for expected roster sizes (< 100 files, each < 100 KB).
- **Risks**: None for MVP scale. If rosters grew to thousands of large files, incremental hashing or caching would be needed.

---

### ADR-004: `simple-git` for Restore Operation

**Status**: Accepted  
**Date**: 2026-04-08

#### Context
The restore operation needs to read the last committed version of files via `git show HEAD:<path>`. This requires either shelling out to `git` or using a library.

#### Decision
Use `simple-git` — a mature, well-maintained Node.js wrapper around the Git CLI. It requires Git to be installed (already a prerequisite).

#### Alternatives Considered
| Option | Pros | Cons |
|--------|------|------|
| Raw `child_process.exec('git show ...')` | No dependency | Manual error handling, escaping, buffering |
| `isomorphic-git` | Pure JS, no Git binary needed | Large dependency, incomplete feature set for some operations |
| **`simple-git`** | **Clean API, mature, small, uses system Git** | **Requires Git on PATH** |

#### Consequences
- **Positive**: Clean async API. Error handling built in. System Git is already required.
- **Negative**: Adds one runtime dependency.
- **Risks**: If system Git is missing, restore fails. Handled by checking for Git availability and throwing `GitOperationError`.

---

### ADR-005: `commander` for CLI Argument Parsing

**Status**: Accepted  
**Date**: 2026-04-08

#### Context
The CLI needs subcommands (`deploy`, `restore`, `wipe`, `status`) with flags (`--repo`, `--yes`).

#### Decision
Use `commander` — the most widely used Node.js CLI framework.

#### Alternatives Considered
| Option | Pros | Cons |
|--------|------|------|
| `yargs` | Powerful, auto-generates help | Heavier, more complex API |
| Manual `process.argv` parsing | Zero dependencies | Tedious, error-prone for subcommands |
| **`commander`** | **Lightweight, declarative, standard** | **None significant** |

#### Consequences
- **Positive**: Battle-tested, excellent TypeScript support, auto-generated `--help`.
- **Negative**: None.

---

### ADR-006: Lazy Extension Activation

**Status**: Accepted  
**Date**: 2026-04-08

#### Context
NFR-PERF-4 requires that the extension adds no more than 500ms to VS Code startup.

#### Decision
Use `onCommand` activation events. The extension is not loaded until the user invokes an Agent Forge command. No `*` or `onStartupFinished` activation.

#### Consequences
- **Positive**: Zero startup impact. VS Code only loads the extension when needed.
- **Negative**: First command invocation may have a slight delay (~200ms) while the extension activates.

---

### ADR-007: Deploy Reads Working Tree, Not Git State

**Status**: Accepted  
**Date**: 2026-04-08

#### Context
OQ-LIFECYCLE-1 and the requirements state that deploy reads files as they are on disk. The user may have uncommitted edits they want to deploy.

#### Decision
`deploy` reads from the file system (working tree). `restore` reads from Git (`HEAD`). This gives the user two distinct behaviors: "push my current files out" (deploy) vs "go back to the committed state" (restore).

#### Consequences
- **Positive**: Intuitive mental model. Deploy = "what I have now". Restore = "what I saved".
- **Negative**: Deploying uncommitted changes could put the user in a state where source and deployed differ from the committed version. Mitigated by `status` showing the full picture.

---

### ADR-008: Additive Deploy (Not Declarative)

**Status**: Accepted  
**Date**: 2026-04-08

#### Context
OQ-LIFECYCLE-1 asks whether deploy should clean up files that exist locally but are no longer in the manifest (declarative) or only add/update (additive).

#### Decision
Additive for MVP. Deploy only copies/updates files listed in the manifest. It does NOT delete files that were removed from the manifest. The user can run `wipe` followed by `deploy` for a clean slate.

#### Rationale
Declarative deploy risks deleting files the user wants to keep (e.g., files from another source). The user has explicit control via `wipe` + `deploy` if they want declarative behavior.

#### Consequences
- **Positive**: Safer default. No accidental deletions.
- **Negative**: Stale files may accumulate. `status` will show them as "untracked", which is sufficient feedback.

---

### ADR-009: Git Tool Resolution Strategy

**Status**: Accepted  
**Date**: 2026-04-08

#### Context
Agent Forge workflows require Git operations for restore (`git show`), status comparison, and the broader development workflow (branching, merging, tagging). The GitKraken MCP server is available as a preferred tool interface but covers only ~55% of required Git operations. Critically, `merge --no-ff` — required by the project's git workflow for every branch integration — is not supported by GitKraken MCP. Neither are branch delete, pull, fetch, tags, rebase, cherry-pick, stash pop/list/drop, or remote management. The fallback to CLI `git` is therefore not an edge case but a primary execution path.

#### Decision
Implement a prioritized tool resolution cascade:

1. **GitKraken MCP** — preferred for all supported operations:
   - Branch create/list, checkout
   - Add, commit, push (basic)
   - Status, diff, log, blame
   - Stash save
   - Worktree add/list

2. **CLI `git`** — required for all unsupported operations:
   - `merge --no-ff` (all merges)
   - Branch delete (`-d`, `-D`)
   - Pull, fetch
   - Tags (create, list, delete, push)
   - Rebase, cherry-pick
   - Stash pop, list, drop
   - Remote management (add, remove, set-url)
   - Worktree remove
   - Push with `--set-upstream`

3. **Git not found** — if CLI `git` is unavailable on the system:
   a. Ask user permission to install Git
   b. If approved: install and proceed
   c. If denied: skip the git operation, log a warning, proceed without versioning
   d. Never auto-install without explicit consent

**Implementation approach:**
- Add a utility function `resolveGitTool(operation: string)` in `packages/core/src/` with a lookup table mapping operations to their required tool
- The function returns an `ExecutionStrategy` enum value: `GitKrakenMCP | CliGit | Unavailable`
- The lookup table is a static map — no runtime capability probing needed, since GitKraken MCP's coverage is known at build time
- The extension/CLI layer handles the `Unavailable` case with user prompts and consent flow
- `simple-git` (already a dependency per ADR-004) serves as the CLI Git interface for programmatic operations

#### Alternatives Considered
| Option | Pros | Cons |
|--------|------|------|
| GitKraken MCP only | Single interface, consistent | Missing 45% of operations including all merges — blocks core workflow |
| CLI `git` only | Complete coverage, single code path | Ignores available MCP tooling; loses GitKraken integration benefits (UI, blame views) |
| Runtime capability probing | Adapts to future MCP additions | Adds latency, complexity, and non-deterministic behavior for no practical gain |
| **Static lookup cascade** | **Deterministic, zero-latency, simple to maintain** | **Must update lookup table when GitKraken MCP adds operations** |

#### Consequences
- **Positive**: Every Git operation has a known execution path. The `--no-ff` merge workflow is fully supported. GitKraken MCP is used wherever it adds value. The resolution is deterministic — no surprises.
- **Negative**: The lookup table requires manual updates if GitKraken MCP adds new operations. Acceptable cost given update frequency.
- **Risks**: If Git is not installed and the user declines installation, restore operations will fail (they depend on `git show`). This is an accepted degradation — `status` and `deploy` remain functional since they operate on the working tree.

---

### ADR-010: Sub-Agent Nesting Opt-In Notification

**Status**: Accepted  
**Date**: 2026-04-08

#### Context
Agent Forge's agent org chart relies on nested delegation: CTO orchestrates Principal Engineer, who delegates to domain engineers (Backend Developer, Frontend Developer, etc.). VS Code's `chat.subagents.allowInvocationsFromSubagents` setting controls whether agents can invoke other agents, and it defaults to `false`. Without this setting enabled, orchestrator agents silently perform all work themselves — the delegation model breaks without any visible error. This is a critical UX and architecture concern: the product's core value proposition depends on a VS Code setting the user may not know exists.

#### Decision
Hybrid opt-in approach that respects user autonomy (aligns with NFR-USE-1):

1. **On extension activation**, check `chat.subagents.allowInvocationsFromSubagents`
2. **If `false`**, show an information notification:
   > "Agent Forge works best with sub-agent nesting enabled. Enable it now?"
   
   With two action buttons: **"Yes"** and **"Not Now"**
3. **If "Yes"**: call `vscode.workspace.getConfiguration('chat.subagents').update('allowInvocationsFromSubagents', true, ConfigurationTarget.Global)` to enable the setting
4. **If "Not Now"**: suppress the notification for the remainder of the session. Store a `subAgentPromptDismissed` flag in the extension's `context.globalState` with a session timestamp — do not persist across VS Code restarts so the user is reminded on next session
5. **Register a command** `Agent Forge: Enable Sub-Agent Nesting` in the command palette (via `packages/extension/src/commands.ts`) for manual toggling at any time
6. **Never silently change** the setting — all changes require explicit user action

**Implementation locations:**
- Notification check: `packages/extension/src/extension.ts` → `activate()` function, after command registration
- Setting read: `vscode.workspace.getConfiguration('chat.subagents').get<boolean>('allowInvocationsFromSubagents')`
- Setting write: `vscode.workspace.getConfiguration('chat.subagents').update('allowInvocationsFromSubagents', true, vscode.ConfigurationTarget.Global)`
- Command registration: `packages/extension/src/commands.ts` → new `handleEnableSubAgentNesting` handler
- Session state: `context.globalState.update('subAgentPromptDismissedAt', Date.now())`

**Note on activation events:** This check runs inside `activate()` which is already lazy-loaded per ADR-006 (triggered by `onCommand`). The notification does not affect startup time for users who never invoke Agent Forge commands.

#### Alternatives Considered
| Option | Pros | Cons |
|--------|------|------|
| Silently enable on activation | Zero friction | Violates user autonomy (NFR-USE-1). Users may not expect extensions to change editor settings. |
| Document in README only | No code needed | Users won't read it. Silent failure when nesting doesn't work. |
| Hard requirement (refuse to activate) | Guarantees correct config | Overly aggressive. Extension should degrade gracefully, not refuse to run. |
| **Notification with opt-in** | **Transparent, respects user choice, low friction** | **Users may dismiss and forget — mitigated by palette command** |

#### Consequences
- **Positive**: Users are informed about the dependency on their first interaction. The setting change is explicit and reversible. The palette command provides a discoverable path for users who dismissed the notification.
- **Negative**: Adds activation-time logic to the extension. Minimal complexity — one conditional check and one notification call.
- **Risks**: VS Code could rename or remove the `chat.subagents.allowInvocationsFromSubagents` setting in future versions. Mitigate by wrapping the check in a try-catch so the extension degrades gracefully if the setting doesn't exist.

---

## 7. Data Flow Diagrams

### Deploy Operation

```
┌─────────────────────────────────────────────────────────────┐
│                    User invokes "Deploy"                     │
│              (VS Code command or CLI command)                 │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  Extension/CLI: Resolve repo path                            │
│  (from settings, --repo flag, or CWD)                        │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  core/manifest.ts: loadManifest(repoPath)                    │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ 1. Read agent-forge.manifest.jsonc from repoPath      │   │
│  │ 2. Parse JSONC via jsonc-parser                        │   │
│  │ 3. Validate schema (version, editor, targets, entries)│   │
│  │ 4. Check for duplicate IDs                            │   │
│  │ 5. Return typed Manifest or throw                     │   │
│  └───────────────────────────────────────────────────────┘   │
└─────────────────┬───────────────────────────────────────────┘
                  │ Manifest
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  core/paths.ts: Resolve target paths                         │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ 1. Expand %APPDATA% → C:/Users/.../AppData/Roaming   │   │
│  │ 2. Expand %USERPROFILE% → C:/Users/...               │   │
│  │ 3. Normalize to forward slashes                       │   │
│  │ 4. Validate no path traversal                         │   │
│  └───────────────────────────────────────────────────────┘   │
└─────────────────┬───────────────────────────────────────────┘
                  │ Resolved paths
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  core/deploy.ts: For each manifest entry                     │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ For each agent/instruction/toolset:                    │   │
│  │   1. sourcePath = repoRoot + entry.file               │   │
│  │   2. targetPath = targets.prompts + basename          │   │
│  │   3. Hash source file (core/hash.ts)                  │   │
│  │   4. If target exists, hash target file               │   │
│  │   5. If hashes match → SKIP (already identical)       │   │
│  │   6. If hashes differ or target missing →             │   │
│  │      a. Create target directory if needed             │   │
│  │      b. Copy source → target                          │   │
│  │      c. Record as DEPLOYED                            │   │
│  │   7. If source missing → record as FAILED             │   │
│  │                                                        │   │
│  │ For each skill:                                        │   │
│  │   1. sourceDir = repoRoot + entry.dir                 │   │
│  │   2. targetDir = targets.skills + entry.id            │   │
│  │   3. Copy directory recursively (same hash logic)     │   │
│  └───────────────────────────────────────────────────────┘   │
└─────────────────┬───────────────────────────────────────────┘
                  │ DeployResult
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  Extension/CLI: Display results                              │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ Extension: Progress notification → summary message    │   │
│  │ CLI: Print stdout table                                │   │
│  │                                                        │   │
│  │ "Deployed: 12 | Skipped: 4 | Failed: 1 | Time: 1.2s"│   │
│  └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Status Operation

```
┌─────────────────────────────────────────────────────────────┐
│                    User invokes "Status"                      │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  core/manifest.ts: loadManifest(repoPath)                    │
│  (Same as deploy: parse + validate)                          │
└─────────────────┬───────────────────────────────────────────┘
                  │ Manifest
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  core/paths.ts: Resolve target paths                         │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  core/status.ts: Compare each managed file                   │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ For each manifest entry:                               │   │
│  │   1. Resolve source path (repo) and target path (OS)  │   │
│  │   2. Check if source exists in repo                    │   │
│  │      - No → status = MISSING_FROM_REPO                │   │
│  │   3. Check if target exists locally                    │   │
│  │      - No → status = MISSING_LOCALLY                  │   │
│  │   4. Both exist → hash both (core/hash.ts)            │   │
│  │      - Match → status = SYNCED                        │   │
│  │      - Differ → status = MODIFIED                     │   │
│  └───────────────────────────────────────────────────────┘   │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ Scan target directories for untracked files:           │   │
│  │   1. List *.agent.md in targets.prompts               │   │
│  │   2. List *.instructions.md in targets.prompts        │   │
│  │   3. List skill directories in targets.skills         │   │
│  │   4. Check for toolset files in targets.prompts       │   │
│  │   5. Any file not in manifest → status = UNTRACKED    │   │
│  └───────────────────────────────────────────────────────┘   │
└─────────────────┬───────────────────────────────────────────┘
                  │ StatusResult
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  Extension/CLI: Display grouped results                      │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ Agents:                                                │   │
│  │   ✓ software-architect     synced                     │   │
│  │   ✗ backend-developer      modified                   │   │
│  │   ! data-scientist          missing locally            │   │
│  │                                                        │   │
│  │ Instructions:                                          │   │
│  │   ✓ agent-communication    synced                     │   │
│  │                                                        │   │
│  │ Skills:                                                │   │
│  │   ✓ query-knowledge-base   synced                     │   │
│  │                                                        │   │
│  │ Untracked:                                             │   │
│  │   ? old-agent.agent.md                                │   │
│  │                                                        │   │
│  │ Summary: 3 synced, 1 modified, 1 missing, 1 untracked│   │
│  └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Component Dependency Diagram

```
┌──────────────────────┐     ┌──────────────────────┐
│  packages/extension  │     │     packages/cli     │
│                      │     │                      │
│  extension.ts        │     │  index.ts            │
│  commands.ts         │     │  commands/deploy.ts  │
│                      │     │  commands/restore.ts │
│  Depends on:         │     │  commands/wipe.ts    │
│  - VS Code API       │     │  commands/status.ts  │
│  - @agent-forge/core │     │                      │
└──────────┬───────────┘     │  Depends on:         │
           │                 │  - commander          │
           │                 │  - @agent-forge/core  │
           │                 └──────────┬────────────┘
           │                            │
           ▼                            ▼
┌──────────────────────────────────────────────────┐
│                 packages/core                     │
│                                                   │
│  manifest.ts ──→ types.ts                        │
│  paths.ts    ──→ errors.ts                       │
│  deploy.ts   ──→ manifest.ts, paths.ts, hash.ts │
│  restore.ts  ──→ manifest.ts, paths.ts           │
│  wipe.ts     ──→ manifest.ts, paths.ts           │
│  status.ts   ──→ manifest.ts, paths.ts, hash.ts │
│  hash.ts     ──→ (Node.js crypto only)           │
│                                                   │
│  Depends on:                                      │
│  - jsonc-parser                                   │
│  - simple-git                                     │
│  - Node.js built-ins (crypto, fs, path)           │
└──────────────────────────────────────────────────┘
```

---

## 8. Dependency Summary

| Package | Dependency | Version | Purpose |
|---------|-----------|---------|---------|
| `core` | `jsonc-parser` | ^3.x | Parse JSONC manifest |
| `core` | `simple-git` | ^3.x | `git show HEAD:<path>` for restore |
| `cli` | `commander` | ^12.x | CLI argument parsing |
| `extension` | `@types/vscode` | ^1.85 | VS Code extension API types (devDependency) |
| Root | `typescript` | ^5.x | Compiler (devDependency) |
| Root | `@vscode/vsce` | latest | VSIX packaging (devDependency) |

No external runtime services. No HTTP servers. No databases. No Docker.

---

## 9. Open Question Resolutions

| ID | Question | Resolution |
|----|----------|------------|
| OQ-MANIFEST-1 | JSONC or strict JSON? | **JSONC** — see ADR-002 |
| OQ-MANIFEST-2 | Multi-OS targets in one manifest? | **No.** Single manifest per editor/OS. Multi-OS handled by branches (deferred). |
| OQ-MANIFEST-3 | Model override frontmatter format? | **Deferred to v1.1.** MVP deploys files as-is. |
| OQ-LIFECYCLE-1 | Deploy declarative or additive? | **Additive** — see ADR-008 |
| OQ-LIFECYCLE-2 | Restore from commits or snapshots? | **HEAD only** for MVP. Snapshot selection deferred. |
| OQ-LIFECYCLE-3 | Hash, timestamp, or both? | **SHA-256 hash only** — see ADR-003 |
| OQ-INTERFACE-1 | Status UI: webview or output channel? | **Output channel.** Simpler, sufficient for text-based status. |
| OQ-INTERFACE-2 | CLI: compiled binary or Node.js script? | **Node.js script** with `bin` entry. Node.js is already a prerequisite. |
| OQ-INSTALL-1 | CLI install location? | **`%USERPROFILE%\.agent-forge\bin`**, added to PATH by install script. |
| OQ-INSTALL-2 | Auto-deploy after install? | **No.** Install and deploy are separate concerns. User runs deploy explicitly. |

---

## 10. Architectural Risks and Tradeoffs

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Path traversal via manifest manipulation** | Low (single user, self-managed) | High (could delete/overwrite arbitrary files) | `paths.ts` validates all resolved paths against allowed base directories. Reject `..` segments post-normalization. |
| **Partial deploy leaves inconsistent state** | Medium (file permission issues, disk errors) | Medium (some files deployed, others not) | Per-file atomicity is sufficient. `status` command shows exact state. User can re-run deploy or restore. |
| **`simple-git` requires Git on PATH** | Low (Git is a stated prerequisite) | High (restore operation completely broken) | Check for Git availability at operation start. Throw `GitOperationError` with install instructions. |
| **npm workspace linking complexity** | Medium (first-time setup) | Low (build errors, not runtime) | `install.ps1` runs `npm install` at root, which handles workspace linking. Document in README. |
| **Skill directory copy is not atomic** | Medium (large skill dirs, interruption) | Low (partial skill copy) | Copy to temp location first, then rename. Or accept partial copy since re-deploy fixes it. Accepted risk for MVP. |
| **Untracked file scanning may be slow** | Low (target dirs are small) | Low (status takes longer) | Scan only known file patterns (.agent.md, .instructions.md, SKILL.md). Not a recursive deep scan. |
| **Windows-only MVP limits portability** | Certain (by design) | Low (single user, Windows machines) | Path module abstracts OS-specific logic. Forward-slash normalization internally. macOS/Linux deferred but seams exist. |
| **No dry-run mode in MVP** | Certain (deferred feature) | Medium (user cannot preview before deploy) | `status` provides a preview of what differs. True dry-run deferred to post-MVP. |
