# Agent Forge — Claude Code Operating Manual

This file is loaded automatically into every Claude Code session in this repository. It consolidates the protocols that used to live in `instructions/*.instructions.md` (the Copilot side) and adapts them to Claude Code semantics.

For the design rationale and the Copilot → Claude Code mapping, see [`PORTING-NOTES.md`](./PORTING-NOTES.md).

## How to use this roster

The roster lives under `.claude/agents/` organized by division:

```
.claude/agents/
├── leadership/      cto.md, principal-engineer.md, project-manager.md
├── architecture/    software-architect.md
├── engineering/     backend-developer.md, frontend-developer.md, ... (11 agents)
├── design/          creative-director.md, ux-engineer.md, graphic-designer.md
└── documentation/   knowledge-engineer.md, requirements-engineer.md, technical-writer.md
```

Three invocation patterns:

```bash
# Default — main thread can spawn any subagent
claude

# Run a full session as the CTO orchestrator (recommended default)
claude --agent cto

# Run a session as a specialist for focused work
claude --agent backend-developer
```

The recommended default is `claude --agent cto` because every user request then flows through the same intake / routing / closeout protocol defined in the CTO's body.

## Orchestration model (read this first)

**Claude Code subagents cannot spawn other subagents.** Only the main session thread has the `Agent` tool. The roster works around this with two patterns:

- **Orchestrator agents** (`cto`, `principal-engineer`, `creative-director`) declare an `Agent(...)` allowlist in their `tools:` frontmatter. This is only effective when they run as the **main session** via `--agent <name>`. When they are spawned as subagents, they cannot delegate further and must instead return a structured routing plan for their caller to execute.
- **Specialist agents** (everyone else) are spawned by the orchestrator and execute focused, scoped work. If a specialist hits cross-domain work, it returns a result listing what to route where, and the orchestrator handles the next spawn.

The chain of command is unchanged from the Copilot side:

- `cto` → 10 division leads (cd, re, sa, pm, pe, cs, ke, tw, qae, devops)
- `principal-engineer` → engineering specialists
- `creative-director` → design specialists

## Agent communication protocol

### Clarification first

When a task is ambiguous, ask one focused clarifying question rather than guessing. Prefer reasonable defaults with a note ("Assumed REST over GraphQL — change if needed") over interrupting the user with low-stakes questions. Escalate only when the decision is costly to reverse (data model, public API contracts, technology selection, scope).

### Escalation back to the parent

A specialist that needs context only the orchestrator has should not invent it. Return a result that says:

1. What you were trying to do
2. The specific question that needs resolution
3. What you would do with each possible answer

The orchestrator resolves it (from context or by asking the user) and re-delegates with the answer attached.

### Delegation template

Every delegation prompt from an orchestrator to a specialist must include:

1. **Goal** — one sentence, what needs to be accomplished
2. **Context** — relevant files, prior decisions, constraints
3. **Output** — what the specialist must return (artifact, file path, summary)
4. **Dependencies** — what ran before and what runs after
5. **Routing directive** — *"You cannot spawn subagents. If cross-domain work surfaces, return a structured routing plan and the orchestrator will re-route."*

The routing directive is mandatory because of the Claude Code subagent-nesting constraint.

## Git workflow

Two-environment branching: `main` (production) and `development` (integration). No staging.

| Branch | Purpose |
|---|---|
| `main` | Stable, deployed code. Protected. |
| `development` | Integration branch. All feature work merges here first. |
| `feature/*` | Short-lived branches from `development`. |
| `hotfix/*` | Emergency branches from `main`. Hotfixes merge to `main` AND `development`. |

Rules:

- **Never commit directly to `main` or `development`** — always through a branch.
- **Never write code before creating the branch.** If you find yourself on `development` with uncommitted changes: stash → create branch → checkout → pop stash.
- **Always merge with `--no-ff`** to preserve branch history.
- **Conventional commits**: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `ci:`, `perf:`.
- **Releases (`development` → `main`)** require explicit user approval via the CTO's Release Proposal flow.

## Knowledge base protocol

The `knowledge-engineer` maintains a PostgreSQL-backed knowledge repository in Docker that all agents can consult. Each project keeps a local cache at `project_docs/knowledge/`.

Three touchpoints for every agent:

1. **Before starting work** — Check `project_docs/knowledge/` for entries relevant to the task domain. If the KB container is up, query it for broader cross-project patterns.
2. **On encountering an error** — Ask `knowledge-engineer` if this pattern is already cataloged before debugging from scratch.
3. **After solving a novel error** — Report it to `knowledge-engineer` with: what happened, root cause, fix, prevention.

## SDLC (mandatory across every project)

This roster works on multiple domains — logistics & customs, XR / Digital Twins, agentic platforms, data science, ML, general R&D. The roster itself stays **domain-agnostic**. Project-specific domain knowledge (glossary, vendor SDKs, business rules) lives in a `CLAUDE.local.md` at the project root — never inside agent definitions, never committed by default.

### Constants for every project

1. **Mono-repo by default.** Every project is a mono-repo (`apps/`, `packages/`, `scripts/`, `project_docs/`) regardless of size. Single-app projects still live inside `apps/<app>/`.
2. **Two environments only.** Development (local) and Production. No staging. The deployment target for Production is selected by `software-architect` per project based on constraints (DigitalOcean, Vercel, Cloudflare Workers, Azure, AWS, Alibaba Cloud, Google Cloud, on-prem, etc.) — never assumed.
3. **Never hardcode anything that varies between environments.** All such values go through `.env` files. This includes URLs, ports, model IDs, region codes — not only secrets.
4. **`.env` file layout.**
   - `.env.development` and `.env.production` at the repo root contain every variable for every app in the mono-repo. **Both are gitignored.**
   - `.env.example` is committed and lists every variable name with a blank/placeholder value and a one-line comment about what it is for.
   - Per-app `.env` files inside `apps/<app>/` are **generated** by `run-dev.ps1` / `run-prod.ps1` from the global file. **Never hand-edited.**
   - Variable naming: `<APP_PREFIX>_<KEY>` so the script can fan out the right subset to each app (e.g. `WEB_DATABASE_URL`, `API_DATABASE_URL`).
5. **Mandatory scripts at the repo root.**

   | Script | Purpose |
   |---|---|
   | `run-dev.ps1` | Reads `.env.development`, fans variables out to each app's `.env`, then starts every app (docker compose up + per-app dev servers). |
   | `run-prod.ps1` | Reads `.env.production`, fans variables out, builds per-app images, pushes to the project's registry, then triggers the project's deploy target. |
   | `validate-env.ps1` | Greps the code for env references (`process.env.*`, `os.getenv(...)`, etc.) and verifies every reference exists in the relevant `.env.*` file. Exits non-zero on any missing variable. |

   PowerShell is the **primary** form because the user works on Windows. A `.sh` mirror is optional per project; ask before adding it.

### Secrets handling — ask for the variable NAME, not the VALUE

API keys for services like Mailgun, Doctl (DigitalOcean), Google Play Console, Alibaba Model Studio, Stripe, etc. are stored as **Windows system environment variables** on the user's machine, not in any file.

When an agent needs to use such a credential:

1. Ask the user for the **NAME** of the system environment variable that holds it (e.g. `"What's the env-var name on your system for your Mailgun key?"` → user answers `MAILGUN_API_KEY`).
2. Reference that NAME in `.env.development` / `.env.production` using PowerShell expansion or a marker convention (e.g. `MAILGUN_API_KEY=$env:MAILGUN_API_KEY` in the global env file, resolved by `run-dev.ps1` at script time).
3. **Never** print, log, or paste the actual secret value into chat, files, or commit history.

This rule is enforced by `devops-engineer` and applies to every agent that touches credentials.

### One-environment tolerance

The user may have **only the development** or **only the production** environment variable for a given service (e.g., one Mailgun account used for both). When this happens:

- `run-dev.ps1` and `run-prod.ps1` must accept missing variables and emit a clear warning ("MAILGUN_API_KEY not set for production — falling back to development value") rather than failing.
- The fallback policy is per-project — `software-architect` decides whether to fall back, fail, or stub. Document the choice in `project_docs/architecture/`.

### Domain context per project

Each project carries its domain context in `CLAUDE.local.md` at the project root:

- Glossary and acronyms
- External APIs / SDKs / protocols the project integrates with
- Business rules and exceptions specific to the client or vertical
- Anything that a fresh subagent would otherwise need to be re-explained

`CLAUDE.local.md` is gitignored by Claude Code conventions. Use `project_docs/domain/` for anything that needs to be shared with a future teammate.

### Deployment discipline

- Only the user runs `run-prod.ps1` against real cloud resources. Agents prepare the script, the configs, and the dry-run output, but **never push to production without explicit user approval** via the CTO's Release Proposal flow.
- One container per app. Never co-locate apps in a single container.
- Image tagging: `<git-sha>` always; `latest` only for the most recent successful prod deploy; semver `vX.Y.Z` for tagged releases.

## Self-governance

Agents may extend their own configuration **additively**:

- An agent may add tools to its own `.md` file if a task gap surfaces.
- Only `knowledge-engineer` may edit other agents' files (driven by cataloged patterns).
- Every self-modification is appended to `project_docs/knowledge/agent-modifications.md` with: agent name, change, reason, date.

Removals or role changes are not self-service — escalate to the user.

## What's different from the Copilot side

If you previously worked with the `agents/*.agent.md` files, these things changed:

- **`@agent-name` mentions in bodies** are now bare names: `principal-engineer` instead of `@principal-engineer`.
- **`handoffs:`** is gone (no UX equivalent in CC). It's folded into a "## Next steps" prose section.
- **`tools: [orchestrator]`** became `Agent(...) , Read, Edit, ...` with the allowlist inline.
- **`disable-model-invocation` / `user-invocable`** don't exist in CC. The agent's `description:` is now the only signal Claude uses to decide whether to auto-delegate.

When updating an agent, edit the file under `.claude/agents/<division>/<name>.md`. The Copilot files under `agents/` are still the source of truth for the Copilot deployment path — keep them in sync until a future refactor consolidates the two.
