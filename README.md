# Agent Forge

Agent Forge is a dual-runtime customization compiler and ownership-aware deployment system. One canonical set of 24 Markdown agents serves GitHub Copilot in VS Code; a focused 16-agent OpenAI Codex roster and five progressively disclosed Codex skill bundles are generated from those same sources.

## Runtime contract

| Runtime | Agents | Skills | Additional artifacts |
|---|---|---|---|
| VS Code Copilot | `~/.copilot/agents` (24) | `~/.copilot/skills` (17 modules) | `~/.copilot/instructions`, optional hooks |
| OpenAI Codex | `~/.codex/agents` (16 TOML files) | `~/.agents/skills/agent-forge-*` (5 bundles) | inherits model, MCP, permissions, and approval policy |

Ownership state, immutable plans, transaction backups, and rollback material live under `~/.agent-forge`. Agent Forge never writes `~/.codex/config.toml`, `~/.codex/AGENTS.md`, or personal `~/.codex/skills`.

The Copilot roster retains nine visible lifecycle agents and fifteen hidden workers. The Codex roster is a bounded specialist set: Software Architect and Cybersecurity Engineer are read-only; the other fourteen are workspace-write. Codex custom agents never delegate. The primary Codex agent retains lifecycle routing and invokes a named specialist only when useful.

## Build and verify

Los siguientes comandos son la secuencia documentada para preparar y realizar la verificación completa del proyecto desde su raíz. El asistente debe usar las actividades que correspondan al cambio autorizado y a las condiciones vigentes de integración o lanzamiento. La existencia de esta secuencia no exige instalar dependencias ni ejecutar todos sus comandos para cada edición o commit.

```powershell
npm ci
npm run build
npm test
npm run test:extension-host
node packages/cli/dist/index.js --repo . validate --strict --target all
```

All filesystem tests use temporary profiles. Build output, test profiles, user customizations, secrets, and deployment mirrors are not committed.

## Immutable deployment workflow

```powershell
# Diagnose one or both runtimes.
agent-forge doctor --target codex
agent-forge doctor --target all --profile full

# Persist a content-bearing immutable plan.
agent-forge preview --target all --scope user --profile full

# Apply exactly that plan; both values must match the preview ID.
agent-forge deploy --target all --plan <id> --confirm <id>

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

The five deployed skills are:

- `agent-forge-lifecycle`
- `agent-forge-engineering`
- `agent-forge-security-operations`
- `agent-forge-design`
- `agent-forge-agentic-knowledge`

The remaining canonical workflows stay available through these bundles and the primary Codex agent. No project-scoped Codex copies are generated.

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

## Consultor de tecnología e IA para logística

El [módulo independiente de consultoría](packages/consulting-specialist/README.md) incorpora un perfil nativo para soluciones, propuestas, respuestas y presentaciones de logística, aduanas y transporte. Tiene instalación, propiedad de archivos y grupos de hooks separados del compilador principal. Conserva contexto por cliente y proyecto, y hereda modelo y permisos. Su documentación distingue instalación, descubrimiento nativo y ejecución observada de hooks.
