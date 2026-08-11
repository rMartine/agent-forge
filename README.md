# Agent Forge

Agent Forge is a VS Code-only roster and deployment system for 24 GitHub Copilot custom agents. The repository is the canonical source; the core package validates, renders, previews, atomically installs, audits, rolls back, and removes only its own managed files.

## Runtime contract

- Agents: `~/.copilot/agents`
- Skills: `~/.copilot/skills`
- Instructions: `~/.copilot/instructions`
- Optional hooks: `~/.copilot/hooks`
- Ownership ledger and backups: `~/.agent-forge`
- Minimum VS Code: 1.104.0

The roster has nine visible lifecycle entries and fifteen hidden workers. Only Creative Director and Principal Engineer may invoke explicitly named first-level workers. All cross-phase handoffs use `send: false`, so the user controls the transition. No workflow requires nested subagents.

## Build and verify

```powershell
npm ci
npm run build
npm test
node packages/cli/dist/index.js --repo . validate --strict --target vscode
```

Full preview and deployment require exact locally available MCP tool IDs. Supply inventories as comma-separated environment variables or configure them through the extension:

```powershell
$env:AGENT_FORGE_AVAILABLE_TOOLS = 'gitkraken/git_status,gitkraken/git_add_or_commit,canva/design_create'
$env:AGENT_FORGE_AVAILABLE_MODELS = 'locally-available-model-id'
node packages/cli/dist/index.js --repo . doctor --profile full
node packages/cli/dist/index.js --repo . preview --scope user --profile full
node packages/cli/dist/index.js --repo . deploy --scope user --profile full
```

Deployment remains blocked when required capabilities are absent. Empty model mappings intentionally inherit the current Copilot selection.

## CLI

```text
agent-forge validate --strict --target vscode [--json]
agent-forge doctor --profile full [--json]
agent-forge preview --scope user --profile full [--json]
agent-forge deploy --scope user --profile full
agent-forge status [--json]
agent-forge rollback [--deployment <id>]
agent-forge wipe --managed-only --confirm <deployment-id>
agent-forge mcp setup [--provider <name>] [--preview-only]
```

`restore` is a deprecated alias for rollback for one release. There is no `-y`, `--yes`, or extension `autoConfirm` path.

## MCP setup

Canva, GitKraken, and Docker have direct VS Code `servers` configurations. GitHub and DigitalOcean are enabled through the configured Docker MCP Toolkit surface. `mcp setup` previews each change, requests approval per direct provider, and uses VS Code's official `--add-mcp` merge interface. It never writes Claude configuration or secret values.

## Repository layout

- `agents/`: the only canonical agent definitions
- `skills/`: progressively loaded Agent Skills and one-level references
- `instructions/`: automatically applied safety and quality policies
- `config/`: capability, model, and MCP provider catalogs
- `schemas/`: deployment and handoff contracts
- `packages/core/`: authoritative validation and transaction engine
- `packages/cli/`: thin command adapter
- `packages/extension/`: thin VS Code UI and diagnostics adapter
- `evals/`: role, skill, lifecycle, and failure fixtures
- `project_docs/`: architecture, requirements, audit, and remediation evidence

See [architecture](project_docs/architecture/architecture.md), [build and install](project_docs/requirements/build-and-install.md), and the [remediation report](project_docs/audits/vscode-roster-remediation-2026-08-10.md).
