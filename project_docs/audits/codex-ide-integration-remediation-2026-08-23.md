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

- Core build and 34 tests pass, including manifest v3, native TOML, 16/5 output, duplicate discovery, state migration, grouped rollback, immutable plan round-trip, collision, modified-file preservation, and Windows line-ending stability.
- CLI build and seven tests pass, including target selection and destructive confirmation enforcement.
- Extension build, test-host TypeScript compilation, extension manifest tests, and the isolated VS Code 1.104.0 extension-host suite pass.
- PowerShell wrappers pass AST parsing.
- Evaluation coverage exists for all 24 Copilot agents, all 17 source skills, all 16 Codex agents, all five bundles, six Codex lifecycles, and seven Codex failure modes.

## Live deployment evidence

- Immutable plan: `2026-08-23T21-29-41-905Z-f6bab6` at source commit `3f1a89c9773356c82f0e8024f8beefcaea321aa2`.
- The plan contained 105 artifacts: 57 Copilot artifacts and 48 Codex artifacts. It contained zero cleanup actions, diagnostics, duplicate targets, forbidden paths, or rendered-content hash mismatches.
- Pre-apply comparison found 51 byte-identical Copilot artifacts, six intentionally refined Copilot skill entrypoints, and 48 new Codex artifacts.
- Apply changed or created 54 files, skipped the 51 byte-identical files, and reported zero failures.
- Post-apply verification found zero plan-to-profile hash mismatches. Both `vscode` and `codex` state-v2 active deployment pointers reference the immutable plan and report `synced`.
- Copilot has 24 agent files and 24 unique IDs. Codex has 16 TOML agents, exactly two read-only agents, 14 workspace-write agents, no model pins, and only the four native fields.
- `.agents/skills` contains only the five prefixed Agent Forge bundles. All 54 pre-existing personal `.codex/skills` remain present.
- Global `AGENTS.md` remains SHA-256 `1FD06962B2AF7BE360FB7096E5D9F52C67DBDFBD7BBFCE02B6360B9A6D42C831`; `config.toml` remains SHA-256 `9BC44B27A543DE9DDE36E9FCF303166EF0EB4C3670EC1FC7C263480E1B643C6A`.
- Twenty-six unmanaged legacy VS Code prompt artifacts were moved to the recoverable archive `.agent-forge/legacy-prompts-backup/2026-08-23-dual-runtime-refactor`; the live legacy prompt directory is empty.
- A fresh Codex v0.149.0 read-only process detected all five bundles and successfully invoked `software-architect`, `qa-engineer`, and `cybersecurity-engineer`. Pre-existing MCP shutdown warnings were observed, but no MCP or secret configuration was changed.

Publishing, pushing, provider configuration, and deletion of unmanaged user customizations remain out of scope.
