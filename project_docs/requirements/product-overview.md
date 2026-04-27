# Agent Forge — Product Overview

## Purpose

Agent Forge is a VS Code extension (with CLI) that manages the lifecycle of a GitHub Copilot agent ecosystem. It treats the user's collection of custom agents, instructions, skills, and toolset configurations as a deployable product — version-controlled in a Git repository and synced to the correct OS locations on demand.

## Problem Statement

A power user's agent ecosystem (16+ agents, multiple skills, shared toolsets, instruction files) lives as loose files in OS-specific folders with no lifecycle management. There is no way to snapshot, restore, selectively remove, or adapt the roster when the platform evolves. A VS Code reinstall, machine swap, or bad edit means manual reconstruction.

## Target User

Single power user managing a large custom Copilot agent ecosystem across one or more machines. This is NOT a team tool, marketplace product, or community distribution platform.

## Success Metrics

1. **Restore time**: Full agent ecosystem deployed to a blank VS Code install in under 30 seconds.
2. **Confidence**: User modifies agents without fear of losing a working state.
3. **Machine parity**: Roster is identical across every machine the user works on.

## What This Product IS

- A lifecycle manager for agent files (deploy, restore, wipe, status)
- A Git-backed version control wrapper for the agent ecosystem
- A sideloaded VS Code extension with a CLI mirror
- A manifest-driven system that knows what agents exist, their categories, tools, and (optionally, v1.1) per-agent models

## What This Product Is NOT

- Not a marketplace or distribution platform
- Not a collaborative/team tool
- Not an agent authoring tool (agents are written elsewhere; this manages deployment)
- Not an editor plugin that modifies Copilot behavior at runtime
- Not published on the VS Code Marketplace (sideloaded only)

## Managed Artifact Types

| Type | File Pattern | Current Location (VS Code, Windows) |
|------|-------------|--------------------------------------|
| Agent | `*.agent.md` | `%APPDATA%/Code/User/prompts/` |
| Instruction | `*.instructions.md` | `%APPDATA%/Code/User/prompts/` |
| Toolset Config | `common.toolsets.jsonc` | `%APPDATA%/Code/User/prompts/` |
| Skill | Directory with `SKILL.md` | `%USERPROFILE%/.copilot/skills/` |

## Scope Tiers

### MVP (v1.0)

| Feature | Description |
|---------|-------------|
| Git repo as source of truth | All roster files stored in the agent-roster repository |
| Roster manifest | JSON/YAML config listing all agents with metadata |
| Deploy | Copy roster files from repo → target OS folders per manifest |
| Restore | Overwrite local files with repo state (discard local changes) |
| Wipe | Delete all managed files from target folders, return to VS Code defaults |
| Status | Diff between repo and local (added / modified / missing / untracked) |
| VS Code extension | Command palette integration for all operations |
| CLI mirror | Terminal commands for all operations |
| Sideloaded install | VSIX only, never published to marketplace |
| Build & install script | Single script builds extension + CLI and installs both |

### v1.1 (Post-MVP)

| Feature | Description |
|---------|-------------|
| Per-agent model override | Set model per agent in manifest, injected on deploy |
| Selective remove by category | Remove agents by category tag (e.g., "remove all ML agents") |
| Multi-editor branches | Branch-per-editor strategy (VS Code, Claude Code, Codex) |
| MCP tool management | Manual add/remove of MCP tools per agent |
| MCP tool suggestions | AI-powered tool recommendations per agent role |

### Deferred

| Feature | Description |
|---------|-------------|
| Import/snapshot | Capture current local state into repo |
| Dry-run mode | Preview changes without executing |
| Auto-sync on startup | Automatic deploy on VS Code launch |

## Dependencies

- Git (installed on user's system)
- VS Code (extension host)
- Node.js (extension + CLI runtime)
- Ollama Desktop (optional, for MCP tool suggestions in v1.1)
