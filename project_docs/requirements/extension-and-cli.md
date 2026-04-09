# Extension & CLI Interface

## Overview

Agent Forge exposes all operations through two interfaces: a VS Code extension (primary) and a CLI tool (secondary). Both interfaces invoke the same underlying logic. The extension uses the VS Code command palette; the CLI uses terminal commands.

## User Stories

### Story 7: VS Code Command Palette

**As a** power user
**I want** to run Agent Forge operations from the VS Code command palette
**So that** I can manage my roster without leaving the editor

#### Acceptance Criteria

- [ ] Given the extension is installed, when the user opens the command palette, then the following commands are available:
  - `Agent Forge: Deploy`
  - `Agent Forge: Restore`
  - `Agent Forge: Wipe`
  - `Agent Forge: Status`
- [ ] Given the user runs any command, then progress is shown via VS Code's progress notification (spinner + message)
- [ ] Given an operation completes successfully, then a summary notification is shown (information level)
- [ ] Given an operation fails, then an error notification is shown with actionable detail
- [ ] Given `Wipe` is invoked, then a modal confirmation dialog is shown before proceeding
- [ ] Given `Restore` is invoked, then a modal confirmation dialog is shown before proceeding
- [ ] Given `Status` completes, then results are displayed in a VS Code output channel named "Agent Forge"
- [ ] Given the extension is installed, then a tree view named "Agent Forge Roster" is registered in the Explorer sidebar, showing managed artifacts grouped by type (Agents, Instructions, Skills, Toolsets, Prompts, Hooks)
- [ ] Given the tree view is visible and a repo path is configured, when the user clicks an artifact entry, then the corresponding file opens in the editor
- [ ] Given the tree view is visible, when the user invokes `Agent Forge: Refresh` (via palette or tree view toolbar), then the tree view re-reads status from the repo and updates

#### Edge Cases

- Extension activated but repo path not configured → prompt user to set repo path in settings on first command
- VS Code reloads mid-operation → operation must be atomic per file (partial deploy is valid, no corruption)

---

### Story 8: CLI Tool

**As a** power user
**I want** to run Agent Forge operations from any terminal
**So that** I can manage my roster in scripts, remote sessions, or when VS Code is not open

#### Acceptance Criteria

- [ ] Given the CLI is installed, when the user runs `agent-forge deploy`, then the deploy operation executes identically to the extension command
- [ ] Given the CLI is installed, when the user runs `agent-forge restore`, then the restore operation executes with a [y/N] confirmation prompt
- [ ] Given the CLI is installed, when the user runs `agent-forge wipe`, then the wipe operation executes with a [y/N] confirmation prompt
- [ ] Given the CLI is installed, when the user runs `agent-forge status`, then status output is printed to stdout in a human-readable table format
- [ ] Given the `--yes` or `-y` flag is passed, then confirmation prompts are skipped (for scripting)
- [ ] Given the `--repo` flag is passed with a path, then that path is used as the roster repo (overrides default)
- [ ] Given no `--repo` flag and no default configured, then the CLI checks the current working directory for a roster manifest
- [ ] Given the user runs `agent-forge --help`, then usage information and available commands are shown
- [ ] Given the user runs `agent-forge --version`, then the CLI version is printed
- [ ] Given an invalid command is passed, then helpful error output with available commands is shown

#### CLI Commands Summary

```
agent-forge deploy [--repo <path>] [--yes]
agent-forge restore [--repo <path>] [--yes]
agent-forge wipe [--yes]
agent-forge status [--repo <path>]
agent-forge --help
agent-forge --version
```

#### Edge Cases

- CLI run without Node.js available → clear error message (if CLI is compiled/bundled, this may not apply)
- Terminal has no color support → output degrades gracefully to plain text

---

### Story 9: Extension Settings

**As a** power user
**I want** to configure Agent Forge through VS Code settings
**So that** the extension knows where my roster repo is and how to behave

#### Acceptance Criteria

- [ ] Given the extension is installed, then the following settings are available in VS Code settings:
  - `agentForge.repoPath` (string) — Absolute path to the roster Git repository. Required.
  - `agentForge.autoConfirm` (boolean, default: false) — Skip confirmation for destructive operations
- [ ] Given `agentForge.repoPath` is not set, when any command is run, then the user is prompted to set it via a quick pick or input box
- [ ] Given `agentForge.repoPath` points to a directory without a valid manifest, then an error is shown: "No roster manifest found at {path}"

#### Edge Cases

- Path contains spaces or special characters → must be handled correctly
- Path uses forward slashes on Windows → normalize to OS-appropriate separators

## Open Questions

- **OQ-INTERFACE-1**: Should status output in the extension use a webview panel (richer UI, table format) or the output channel (simpler, text-based)?
- **OQ-INTERFACE-2**: Should the CLI be a standalone compiled binary (e.g., via `pkg` or `esbuild`) or a Node.js script requiring Node to be installed?
