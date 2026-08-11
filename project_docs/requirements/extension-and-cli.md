# Extension and CLI Requirements

Both adapters import `@agent-forge/core`; neither implements rendering, ownership, transaction, or rollback logic independently.

## CLI surface

```text
validate --strict --target vscode
doctor --profile full [--json]
preview --scope user --profile full
deploy --scope user --profile full
status [--json]
rollback [--deployment <id>]
wipe --managed-only --confirm <deployment-id>
mcp setup [--provider <name>] [--preview-only]
```

`restore` warns and delegates to rollback for one compatibility release. Destructive operations have no noninteractive bypass.

## Extension surface

The extension requires VS Code `^1.104.0` and exposes Validate, Doctor, Preview, Deploy, Status, Rollback, Wipe, MCP Setup, and Refresh. It publishes core diagnostics into the Problems collection and shows managed file state in the roster tree.

The extension:

- resolves VS Code Language Model tool names and available chat models;
- accepts explicit additional exact tool/model IDs in settings;
- previews before deployment;
- uses modal or typed confirmation for mutations;
- never enables nested subagents;
- never downloads models or Python packages;
- never rewrites source agent files;
- has no `autoConfirm` setting.

Core diagnostics remain authoritative even when a VS Code diagnostics API is unavailable.
