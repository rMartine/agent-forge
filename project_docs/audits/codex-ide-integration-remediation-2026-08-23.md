# Codex IDE Integration Remediation

**Date:** 2026-08-23

**Implementation branch:** `codex/codex-ide-integration`

**Baseline:** clean `development` at `ca93b15`

**Scope:** preserve the 24-agent Copilot deployment; add a focused OpenAI Codex IDE roster; remove duplicate discovery; deploy only ledger-owned user-profile artifacts.

## Outcome

Agent Forge now compiles two runtime-specific products from one canonical roster:

| Runtime | Agents | Skills | Orchestration |
|---|---:|---:|---|
| VS Code Copilot | 24 Markdown agents | 17 canonical modules | nine entries, explicit depth-one workers, user-controlled handoffs |
| OpenAI Codex | 16 TOML agents | five `agent-forge-*` bundles | primary-agent routing; custom agents never delegate |

Codex agents inherit the active model, MCP configuration, permissions, sandbox approvals, and parent policy. Software Architect and Cybersecurity Engineer are read-only; all other selected specialists are workspace-write.

The following canonical roles are intentionally not separate Codex custom agents: CTO, Requirements Engineer, Creative Director, Project Manager, Graphic Designer, Data Scientist, XR Engineer, and Knowledge Engineer. Their reusable workflows remain available through the primary agent and the five skill bundles.

## Remediation matrix

| Finding | Remediation | Evidence |
|---|---|---|
| Parallel runtime formats could diverge | Manifest v3 selects runtime products from the same 24 sources | `agent-forge.manifest.jsonc`, manifest schema |
| Copilot frontmatter is invalid policy for Codex | Dedicated TOML renderer emits four native fields only | `renderCodex.ts`, `smol-toml` round-trip tests |
| Principal prompt could cause nested delegation | Authoritative Codex overlays prohibit custom-agent delegation | Codex manifest entries and rendered TOML tests |
| Seventeen Codex skills would consume excessive description budget | Five prefixed, progressively disclosed bundles | `skillBundles.ts`, bundle evaluations |
| Source skill links become invalid after packaging | References flatten one level and links/skill IDs rewrite | bundle renderer and plan tests |
| Workspace discovery duplicated globally deployed Copilot agents | Three custom discovery overrides removed; validator detects reintroduction | `.vscode/settings.json` cleanup, `validation.ts` |
| Codex project/user duplicates could shadow managed agents or bundles | Runtime-scoped duplicate discovery and unmanaged collision gate | `validation.ts`, `deploymentPlan.ts`, duplicate tests |
| v1 state could not represent two active runtimes | Guarded v1→v2 migration with backup and runtime-tagged records | `state.ts`, migration tests |
| Preview could differ from apply | Persisted rendered bytes and hashes; deploy loads exact plan | `deploymentPlan.ts`, CLI, round-trip test |
| Second-runtime failure could leave first runtime changed | One grouped transaction and reverse undo log | `transaction.ts`, grouped failure test |
| Roster upgrades could leave stale managed files | Hash-verified stale actions in deployment/cleanup plans | `cleanup.ts`, transaction state |
| Codex MCP or global instructions could be overwritten | Targets exclude `config.toml`, `AGENTS.md`, and `.codex/skills` | manifest targets, profile invariants |
| CLI/extension could diverge | Both call core plan/apply/status/rollback/cleanup APIs | package services and adapter tests |

## Codex roster

1. Software Architect — read-only architecture review
2. Principal Engineer — bounded integration worker
3. Backend Developer
4. Frontend Developer
5. Database Engineer
6. .NET Engineer
7. Desktop App Engineer
8. Mobile Engineer
9. ML Engineer
10. Agentic Systems Engineer
11. Digital Twin Engineer
12. QA Engineer
13. Cybersecurity Engineer — read-only review
14. DevOps Engineer — approval-gated external operations
15. UX Engineer
16. Technical Writer

No rendered Codex agent contains a model pin, tool allowlist, Copilot handoff, visibility flag, or custom-agent allowlist.

## Skill bundles

- `agent-forge-lifecycle`: discovery, requirements, ADRs, planning, handoffs, scaffolding, release preparation
- `agent-forge-engineering`: implementation verification and all specialist platform references
- `agent-forge-security-operations`: security review, Docker, DigitalOcean, GitHub, GitKraken
- `agent-forge-design`: Canva, UX/design production, stock-image provenance
- `agent-forge-agentic-knowledge`: agentic evaluation and knowledge workflows

Canonical source skills remain independently deployable to Copilot. Codex bundle output is generated at preview time and is never committed as a second source tree.

## Ownership and safety

- Runtime targets are user-profile only.
- The same ID across Copilot and Codex is valid.
- An unmanaged file at a planned target emits `AF009`.
- A changed managed file emits `AF012` and is preserved.
- Cleanup never includes unmanaged duplicates.
- Grouped apply rolls back earlier runtime changes when later work fails.
- State v1 migration rejects any target outside `.copilot`.
- Deploy and cleanup require exact immutable plan ID confirmation.
- Rollback and wipe are runtime-specific and preserve modified files.

## Verification evidence

- Core build and 33 tests pass, including manifest v3, native TOML, 16/5 output, duplicate discovery, state migration, grouped rollback, immutable plan round-trip, collision, and modified-file preservation.
- CLI build and seven tests pass, including target selection and destructive confirmation enforcement.
- Extension build, test-host TypeScript compilation, and extension manifest tests pass.
- PowerShell wrappers pass AST parsing.
- Evaluation coverage exists for all 24 Copilot agents, all 17 source skills, all 16 Codex agents, all five bundles, six Codex lifecycles, and seven Codex failure modes.

Live deployment evidence is appended only after an exact `--target all` plan is inspected and applied. Publishing, pushing, provider configuration, and unmanaged cleanup remain out of scope.
