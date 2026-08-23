# Build and Install

## Prerequisites

- Node.js 20+ and npm
- VS Code 1.104+ with GitHub Copilot for the Copilot target
- OpenAI Codex IDE extension (`openai.chatgpt`) for the Codex target
- provider authentication only for capability families required by the selected VS Code profile

Codex agents inherit the user's model, MCP, permissions, sandbox, and approval policy. Agent Forge does not provision Codex MCP servers.

## Reproducible verification

```powershell
npm ci
npm run build
npm test
npm run test:extension-host
node packages/cli/dist/index.js --repo . validate --strict --target all
```

`npm ci` is authoritative for `package-lock.json`. Core and CLI `dist`, extension `out`, isolated profiles, and deployment fixtures are ignored. Tests inject temporary `USERPROFILE` and never write real `.copilot`, `.codex`, or `.agents` directories.

## Doctor and immutable preview

```powershell
node packages/cli/dist/index.js --repo . doctor --target codex
node packages/cli/dist/index.js --repo . doctor --target all --profile full
node packages/cli/dist/index.js --repo . preview --target all --scope user --profile full
```

Preview persists `~/.agent-forge/plans/<id>.json` with exact rendered bytes and hashes. It may contain no secrets. A plan with error diagnostics remains non-deployable.

VS Code full readiness requires exact installed tool IDs via the extension or `AGENT_FORGE_AVAILABLE_TOOLS`. Optional model mappings use `AGENT_FORGE_AVAILABLE_MODELS`; an unavailable mapping falls back to inheritance.

## Install

```powershell
node packages/cli/dist/index.js --repo . deploy --target all --plan <id> --confirm <id>
node packages/cli/dist/index.js --repo . status --target all
```

The plan and confirmation IDs must match. Apply loads the persisted plan and never renders again. A grouped failure restores both runtimes and leaves the previous ledger active.

`scripts/install.ps1 -Target all` performs dependency install, build, validate, doctor, and preview. `-Deploy` prompts for the exact generated plan ID. `-UsePrebuilt` is accepted only when the compiled CLI exists.

## Cleanup, rollback, and wipe

```powershell
agent-forge cleanup --target all --managed-only
agent-forge cleanup --target all --managed-only --plan <cleanup-id> --confirm <cleanup-id>
agent-forge rollback --target codex --deployment <id>
agent-forge wipe --target vscode --managed-only --confirm <active-id>
```

Cleanup considers stale ledger-owned files only. Rollback and wipe compare current content hashes and preserve modified or unmanaged customizations.

## Live profile verification

Before approval:

1. hash `~/.codex/AGENTS.md` and `~/.codex/config.toml`;
2. inventory existing `~/.codex/skills`, `~/.codex/agents`, and `~/.agents/skills`;
3. inspect all plan cleanup actions;
4. apply the exact confirmed plan;
5. verify 24 Copilot agents, 16 Codex agents, and five prefixed Codex bundles;
6. verify state reports both runtimes synchronized;
7. confirm the protected hashes and personal skill inventory are unchanged.

Publishing the extension, pushing Git branches, provider installation, cloud mutation, or deletion of unmanaged files requires separate authorization.
