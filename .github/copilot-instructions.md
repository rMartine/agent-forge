# Agent Forge Repository Instructions

Agent Forge is a dual-runtime VS Code Copilot and OpenAI Codex roster compiler and deployment tool.

- Treat `agents/*.agent.md` as the canonical agent source.
- Treat `skills/*` as canonical workflow modules; Codex bundles are rendered outputs, not editable source copies.
- Keep stable agent IDs aligned with `agent-forge.manifest.jsonc`.
- Do not add or generate `.claude/agents`.
- Do not add project `.codex/agents`, project `.agents/skills`, or workspace discovery overrides for the canonical roster.
- Route deployment behavior through `packages/core`; CLI, extension, and PowerShell code are adapters.
- Never write to real `~/.copilot`, `~/.codex`, or `~/.agents` profile paths from tests.
- Keep model IDs in user policy and MCP tool IDs in the capability catalog.
- Preserve global `~/.codex/AGENTS.md`, `~/.codex/config.toml`, personal `~/.codex/skills`, and every unmanaged customization.
- Require immutable-plan or deployment-ID confirmation for deploy, cleanup, rollback, wipe, provider installation, and external operations.
- Run the root build, tests, roster validation, and staged diff checks before committing.
