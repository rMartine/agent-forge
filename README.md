# Agent Forge

Agent Forge maintains one catalog and generates matching agent rosters for three clients. The catalog contains four rosters, 45 agents (41 specialists and four optional coordinators), and shared skill and hook policies.

| Edition | Client | Delivery |
|---|---|---|
| Codex | Codex Desktop and the Codex extension for VS Code | Managed profile deployment |
| GitHub Copilot | VS Code | Managed profile deployment |
| OpenCode V2 | OpenCode | Generated and contract-validated artifact; installation is not included |

Every agent may delegate useful analysis or implementation subtasks, including to agents in another roster. Delegation preserves each descendant's role, permissions, and assignment limits. Coordinators remain optional entry points; they do not own exclusive access to specialists. A client must support the relevant subagent behavior for delegation to run.

## Source of truth

- [`config/roster-catalog.json`](config/roster-catalog.json) defines roster and agent metadata, models, skills, capabilities, and delegation policy.
- [`rosters/`](rosters/) contains the canonical agent instructions.
- [`agent-forge.manifest.jsonc`](agent-forge.manifest.jsonc) holds transport and deployment settings. It does not duplicate the catalog.
- `packages/core/src/rosterAdapters.ts` resolves catalog entries and renders each client format. The adapters share the logical agent, skill, and hook inventories; client-specific events and unsupported behavior are recorded in generated coverage.

Start with [architecture and catalog](docs/architecture.md), [development and checks](docs/development.md), [installation and recovery](docs/installation-and-recovery.md), or [client compatibility](docs/compatibility.md).

## Quick start

Requirements: Node.js 22 or later and npm. From the repository root:

```powershell
npm ci
npm run build
npm run prepare:skills
npm test
node packages/cli/dist/index.js --repo . validate --strict --target all
```

`prepare:skills` retrieves only the pinned resources declared in `config/external-skills.json` and verifies their hashes and adaptations. It writes the ignored local cache. After generation, export all three editions to a new, dedicated directory:

```powershell
node packages/cli/dist/index.js --repo . export --target all --output ..\agent-forge-export
```

Export generates files without installing or changing a user profile. For profile installation, migration, deployment, and recovery, follow [installation and recovery](docs/installation-and-recovery.md).

## Current limits

Model IDs and reasoning preferences come from the canonical catalog and are retained. If a client does not advertise a configured model, Agent Forge reports that gap rather than silently substituting another model. Native hook events and actor identity differ by client; consult generated coverage and [client compatibility](docs/compatibility.md). OpenCode artifacts target V2; the OpenCode client has not been installed or exercised as part of this project.
