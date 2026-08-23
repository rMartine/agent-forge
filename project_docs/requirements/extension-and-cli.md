# Extension and CLI Requirements

Both adapters import `@agent-forge/core`; neither owns rendering, collision policy, state migration, transaction, rollback, or cleanup behavior.

## CLI surface

```text
validate --strict --target vscode|codex|all [--json]
doctor --target vscode|codex|all --profile full [--json]
preview --target vscode|codex|all --scope user --profile full [--json]
deploy --target vscode|codex|all --plan <id> --confirm <id>
status --target vscode|codex|all [--json]
cleanup --target vscode|codex|all --managed-only [--plan <id> --confirm <id>]
rollback --target vscode|codex [--deployment <id>]
wipe --target vscode|codex --managed-only --confirm <active-id>
mcp setup [--provider <name>] [--preview-only]
```

`preview` persists a content-bearing plan; JSON output omits rendered bytes. `deploy` loads and applies the exact plan. Calling cleanup without a plan creates and persists its immutable preview; the second invocation applies only when plan and confirmation IDs match.

`restore` remains a deprecated VS Code rollback alias for one compatibility release. There is no noninteractive destructive bypass.

## Extension surface

The extension requires VS Code `^1.104.0`, detects `openai.chatgpt`, and provides:

- dual-runtime Validate, Doctor, Preview, Deploy, Status, Cleanup, and managed file views;
- Codex-specific Doctor, Preview, Deploy, Status, Cleanup, and Rollback commands;
- VS Code rollback, managed wipe, and MCP setup;
- Problems diagnostics from core;
- a Codex roster view showing 16 selections, sandbox mode, inherited model policy, required bundles, and five bundle entries.

Profile mutations require the exact immutable plan/deployment ID typed by the user. Codex deployment is blocked when `openai.chatgpt` is unavailable. MCP setup remains VS Code-only.

The extension never enables nested subagents, downloads models or Python packages, rewrites source agents, changes Codex MCP configuration, modifies global `AGENTS.md`, or exposes `autoConfirm`.
