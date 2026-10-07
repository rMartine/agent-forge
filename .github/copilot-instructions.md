# Agent Forge repository instructions

- The source of truth for agent metadata is `config/roster-catalog.json`; canonical instructions are in `rosters/<roster>/<agent-id>.md`.
- The root `agent-forge.manifest.jsonc` contains transport and deployment settings. Do not duplicate roster definitions in it.
- Generate Codex, Copilot, and OpenCode artifacts through the shared core adapters. Do not add a format-specific parallel catalog or convert one client's rendered files into another client's source.
- All roster agents may delegate useful subtasks when their host supports it. Preserve the child's role, assignment scope, permissions, and inherited client restrictions. Delegation does not authorize an otherwise restricted action.
- Preserve model and reasoning assignments. Report unavailable model mappings instead of substituting silently.
- Do not install additional discoverable copies of these agents or skills into workspace-local `.codex/agents`, `.agents/skills`, or `.claude/agents` directories.
- Keep installation, hooks, ownership, rollback, and cleanup behind `packages/core`; CLI and extension code are adapters.
- Never write tests into real user profile paths. Use isolated profiles.
- Keep licenses and third-party provenance alongside the resources they cover. Do not commit profile receipts, client data, credentials, or generated exports.
- Before a profile mutation, review the exact immutable plan and use its ID for confirmation. Preserve user customizations and foreign hook groups.
