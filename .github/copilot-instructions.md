# Agent Forge Repository Instructions

Agent Forge is a VS Code-only custom-agent roster and deployment tool.

- Treat `agents/*.agent.md` as the canonical agent source.
- Keep stable agent IDs aligned with `agent-forge.manifest.jsonc`.
- Do not add or generate `.claude/agents`.
- Route deployment behavior through `packages/core`; CLI, extension, and PowerShell code are adapters.
- Never write to a real `~/.copilot` profile from tests.
- Keep model IDs in user policy and MCP tool IDs in the capability catalog.
- Preserve unmanaged customizations and require confirmation for rollback, wipe, provider installation, and external operations.
- Run the root build, tests, roster validation, and staged diff checks before committing.
