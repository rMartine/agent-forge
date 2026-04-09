# Core Lifecycle Operations

## Overview

Agent Forge provides four core lifecycle operations that manage the sync between the Git repository (source of truth) and the local VS Code installation (deployment target). These operations form the MVP and must work identically from both the VS Code command palette and the CLI.

## User Stories

### Story 1: Deploy Roster

**As a** power user
**I want** to deploy my agent roster from the repo to my VS Code installation
**So that** my local environment matches my version-controlled roster definition

#### Acceptance Criteria

- [ ] Given a valid roster manifest and repo with agent files, when the user runs `deploy`, then all files listed in the manifest are copied to their target OS locations
- [ ] Given an agent file already exists locally with identical content, when the user runs `deploy`, then that file is skipped (no unnecessary write)
- [ ] Given an agent file already exists locally with different content, when the user runs `deploy`, then the local file is overwritten with the repo version
- [ ] Given the target directory does not exist, when the user runs `deploy`, then the directory is created before copying files
- [ ] Given the manifest references a file that does not exist in the repo, when the user runs `deploy`, then the operation reports an error for that file and continues deploying the rest
- [ ] Given deploy completes, then a summary is shown: files deployed, files skipped (identical), files failed, total time

#### Edge Cases

- Target folder has restrictive permissions → report clear error, do not silently fail
- Manifest is empty (no agents listed) → warn that nothing will be deployed, do not error
- Repo has uncommitted changes → deploy from working tree as-is (deploy reads files, not Git state)

---

### Story 2: Restore Roster

**As a** power user
**I want** to restore my local agent files to match the last committed repo state
**So that** I can undo local experiments or fixes that went wrong

#### Acceptance Criteria

- [ ] Given locally modified agent files, when the user runs `restore`, then all managed files are overwritten with the repo's committed versions
- [ ] Given locally added files that are NOT in the manifest, when the user runs `restore`, then those untracked files are left untouched (restore only manages manifest-listed files)
- [ ] Given a managed file was deleted locally, when the user runs `restore`, then the file is re-created from the repo
- [ ] Given restore completes, then a summary is shown: files restored, files already matching, files re-created

#### Edge Cases

- Repo has no commits → error: "No committed state to restore from"
- Manifest file itself is corrupted or missing in repo → error: "Cannot restore: manifest not found or invalid"

---

### Story 3: Wipe Roster

**As a** power user
**I want** to remove all managed agent files from my VS Code installation
**So that** I return to VS Code defaults with no custom agents, instructions, skills, or toolsets

#### Acceptance Criteria

- [ ] Given managed files exist in target folders, when the user runs `wipe`, then all files listed in the manifest are deleted from target OS locations
- [ ] Given skill directories are listed in the manifest, when the user runs `wipe`, then the entire skill directory (including subfiles) is deleted
- [ ] Given files exist locally that are NOT in the manifest, when the user runs `wipe`, then those files are left untouched
- [ ] Given wipe completes, then a summary is shown: files deleted, directories deleted, files not found (already missing)
- [ ] Given the user runs `wipe`, then a confirmation prompt is shown before any deletion ("This will remove N agent files, M instruction files, K skills. Continue? [y/N]")
- [ ] Given the target folders become empty after wipe, then the empty folders are left in place (do not delete OS-level VS Code config directories)

#### Edge Cases

- Some files are locked/in-use by VS Code → report which files could not be deleted, delete the rest
- User cancels confirmation → no files are deleted, operation aborted cleanly

---

### Story 4: Check Roster Status

**As a** power user
**I want** to see the differences between my repo roster and my local VS Code installation
**So that** I know what's changed, what's missing, and what's drifted before deciding to deploy or restore

#### Acceptance Criteria

- [ ] Given all local files match repo, when the user runs `status`, then the output shows "All files in sync"
- [ ] Given a local file differs from repo, when the user runs `status`, then that file is listed as "modified" with the direction of change (local newer vs repo newer based on timestamp)
- [ ] Given a manifest file is missing locally, when the user runs `status`, then that file is listed as "missing locally"
- [ ] Given a local file exists in the target folders but is not in the manifest, when the user runs `status`, then that file is listed as "untracked"
- [ ] Given a manifest file is missing from the repo, when the user runs `status`, then that file is listed as "missing from repo" (manifest error)
- [ ] Given status completes, then output is grouped by type: agents, instructions, skills, toolsets

#### Edge Cases

- Target folders don't exist yet → all manifest files shown as "missing locally", target path noted as not yet created
- Very large roster (50+ files) → output remains readable, consider summary counts at the top

---

## Shared Behavior (All Operations)

- All operations read the roster manifest to determine which files to manage
- All operations resolve OS-specific target paths from the manifest's `targets` configuration
- All operations must work identically from VS Code command palette and CLI
- All operations produce structured output (summary counts + per-file detail)
- Destructive operations (wipe, restore) require user confirmation; non-destructive operations (deploy, status) do not

## Open Questions

- ~~**OQ-LIFECYCLE-1**: Should `deploy` also clean up files that are locally present but no longer in the manifest?~~ **Resolved** — ADR-008: Additive deploy. Deploy only adds/updates; it does not delete removed entries. Use `wipe` + `deploy` for a clean slate.
- **OQ-LIFECYCLE-2**: Should `restore` use the last Git commit, or should there be a concept of "snapshots" / tagged versions the user can restore to?
- ~~**OQ-LIFECYCLE-3**: For `status`, should content diffing use file hash comparison, timestamp comparison, or both?~~ **Resolved** — ADR-003: SHA-256 content hashing. No timestamp comparison. Deployment uses a snapshot of the manifest at operation start; manifest changes during an active operation require a re-deploy.
