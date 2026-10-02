# Agent Forge

Agent Forge compiles and deploys customizations for GitHub Copilot and OpenAI Codex while tracking the files and hook entries it owns. The current Codex design provides 16 specialists, a primary-agent skill for directing software product development, five workflow bundles and six reviewed external skills. Counts describe this release; validation checks consistency rather than a fixed roster size.

## Runtime contract

| Runtime | Agents | Skills | Additional artifacts |
|---|---|---|---|
| VS Code Copilot | `~/.copilot/agents` (24) | `~/.copilot/skills` (13 declared modules) | `~/.copilot/instructions`, optional hooks |
| Codex Desktop and Codex extension for VS Code | `~/.codex/agents` (16 TOML files) | `~/.agents/skills/agent-forge-*` (12 skills) | managed groups in `~/.codex/hooks.json`; inherits model, MCP, permissions and approval policy |

Ownership state, immutable plans, transaction backups, and rollback material live under `~/.agent-forge`. Agent Forge never writes `~/.codex/config.toml`, `~/.codex/AGENTS.md`, or personal `~/.codex/skills`.

The Copilot roster retains nine visible lifecycle agents and fifteen hidden workers. The Codex roster is a bounded specialist set: Software Architect and Cybersecurity Engineer are read-only; the other fourteen are workspace-write. Codex custom agents never delegate. The primary Codex agent retains lifecycle routing and invokes a named specialist only when useful.

## Build and verify

Los siguientes comandos son la secuencia documentada para preparar y realizar la verificación completa del proyecto desde su raíz. El asistente debe usar las actividades que correspondan al cambio autorizado y a las condiciones vigentes de integración o lanzamiento. La existencia de esta secuencia no exige instalar dependencias ni ejecutar todos sus comandos para cada edición o commit.

```powershell
npm ci
npm run build
npm run prepare:skills
npm test
npm run test:extension-host
node packages/cli/dist/index.js --repo . validate --strict --target all
```

All filesystem tests use temporary profiles. Build output, test profiles, user customizations, secrets, and deployment mirrors are not committed.

`prepare:skills` downloads only the reviewed, commit-pinned resources declared in `config/external-skills.json`, verifies their SHA-256 hashes and checks the exact adaptations. It writes an ignored repository cache, not the user profile. Subsequent preview and deployment can operate offline. A clean checkout needs this preparation before tests that render the complete installation.

## Immutable deployment workflow

```powershell
# Diagnose one or both runtimes.
agent-forge doctor --target codex
agent-forge doctor --target all --profile full

# Persist a content-bearing immutable plan.
agent-forge preview --target codex --scope user --download-skills

# Apply exactly that plan; both values must match the preview ID.
agent-forge deploy --target codex --plan <id> --confirm <id>

agent-forge status --target all --json
```

VS Code full-profile preview requires exact, locally available capability IDs. Codex inherits the user's active integrations and reports missing capability families without editing MCP configuration. Empty model profiles intentionally inherit the active model.

Managed cleanup is also plan-driven:

```powershell
agent-forge cleanup --target all --managed-only
agent-forge cleanup --target all --managed-only --plan <cleanup-id> --confirm <cleanup-id>
agent-forge rollback --target codex --deployment <id>
agent-forge wipe --target codex --managed-only --confirm <active-deployment-id>
```

There is no `-y`, `--yes`, `autoConfirm`, force-push, automatic provider installation, or unmanaged deletion path. `restore` remains a deprecated VS Code rollback alias for one release.

## Codex roster and bundles

The 16 Codex agents are Software Architect, Principal Engineer, Backend Developer, Frontend Developer, Database Engineer, .NET Engineer, Desktop App Engineer, Mobile Engineer, ML Engineer, Agentic Systems Engineer, Digital Twin Engineer, QA Engineer, Cybersecurity Engineer, DevOps Engineer, UX Engineer, and Technical Writer.

The five internal workflow bundles are:

- `agent-forge-lifecycle`
- `agent-forge-engineering`
- `agent-forge-security-operations`
- `agent-forge-design`
- `agent-forge-agentic-knowledge`

The remaining canonical workflows stay available through these bundles and the primary Codex agent. No project-scoped Codex copies are generated.

`agent-forge-build-software-products` activates only for an authorized product build and the engineering needed to deliver it. The principal agent in the conversation remains responsible for requirements, technical decisions, delegation, integration and verification. The `principal-engineer` specialist performs a bounded implementation or integration assignment; it does not replace that responsibility.

The six external skills and their licenses, immutable sources, resource lists, exact adaptations and agent assignments are recorded in [the selection report](project_docs/audits/codex-skill-selection.md). The complete role and hook matrix is in [the Codex design](project_docs/architecture/codex-product-agents.md).

Native `SubagentStart` and `SubagentStop` handlers match each specialist's agent type. `Stop` accounts for the primary result; `Interrupt` and `SessionEnd` close the temporary session record. Hooks are inactive unless the primary skill registers the actual session and project. Missing evidence allows at most one continuation per scope and never authorizes external deployment. Read-only specialists return evidence to the primary agent, which records it. Hooks check that evidence is present and structurally valid; the primary agent evaluates whether the product actually works.

New or changed hook commands require Codex's native trust review through `/hooks` in the Codex CLI using the same profile. Availability of that command in Desktop or the IDE interface is not assumed. Agent Forge installs the reviewed entries and preserves foreign entries, but does not bypass or manufacture trust. Open fresh client sessions after deployment. CLI or synthetic hook tests do not substitute for observation in both clients.

## Repository layout

- `agents/`: only canonical agent definitions
- `skills/`: canonical, runtime-neutral workflow modules and one-level references
- `instructions/`: Copilot automatic instructions
- `config/`, `schemas/`: capability, model, provider, manifest, and handoff contracts
- `packages/core/`: authoritative renderer, validator, plan, transaction, state, and cleanup engine
- `packages/cli/`, `packages/extension/`, `scripts/`: thin adapters
- `evals/`: Copilot and Codex role, skill, lifecycle, and failure fixtures
- `project_docs/`: architecture, requirements, audits, and delivery evidence

See [architecture](project_docs/architecture/architecture.md), [build and install](project_docs/requirements/build-and-install.md), and the [Codex remediation report](project_docs/audits/codex-ide-integration-remediation-2026-08-23.md).
