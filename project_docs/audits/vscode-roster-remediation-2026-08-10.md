# VS Code Roster Remediation

**Date:** 2026-08-10

**Branch:** `codex/vscode-roster-refactor`

**Source audit:** [VS Code custom-agent roster audit](vscode-custom-agent-roster-audit-2026-08-10.md)

**Repository remediation:** Implemented

**Broad live deployment:** Pending real-profile capability and customization gates

## Outcome

Agent Forge is now a VS Code-only custom-agent compiler and ownership-aware deployment system. The P0 repository defects in runtime paths, duplicate identity, required nesting, source mutation, divergent installers, and destructive lifecycle behavior are remediated. Broad deployment is still deliberately blocked until the target VS Code profile supplies the five required capability families and reports zero customization errors.

Current VS Code documentation confirms the personal agent location `~/.copilot/agents`, personal skill location `~/.copilot/skills`, handoffs with `send: false`, and MCP `servers` configuration: [custom agents](https://code.visualstudio.com/docs/agent-customization/custom-agents), [Agent Skills](https://code.visualstudio.com/docs/agent-customization/agent-skills), [MCP servers](https://code.visualstudio.com/docs/agent-customization/mcp-servers).

## Audit finding remediation

| Finding | Remediation | Evidence |
|---|---|---|
| Wrong user target | Artifact-specific `~/.copilot` targets | `agent-forge.manifest.jsonc`, `packages/core/src/paths.ts` |
| Nested orchestration dependency | CTO/coordinators hand off; only two depth-one delegators | `agents/`, `packages/core/src/validation.ts` |
| Duplicate Claude identities | `.claude/agents`, Claude docs, and conversion scripts removed | Git history and duplicate-ID validation |
| Broad/stale tool aliases | Capability catalog plus exact installed-ID intersection | `config/capability-catalog.jsonc`, `packages/core/src/capabilities.ts` |
| Silent missing capabilities | Required `AF004` errors in strict full preview/deploy | `packages/core/src/deploymentPlan.ts` |
| Hardcoded/unavailable models | Semantic profiles with inheritance fallback on deployed copies | `config/model-profiles.jsonc`, `packages/core/src/models.ts` |
| Unsafe self-governance | Safety instruction and `AF008` validation | `instructions/agent-safety.instructions.md` |
| Raw copy and broad deletion | Atomic transaction, state, backup, collision, rollback, managed wipe | `packages/core/src/transaction.ts`, `state.ts` |
| Divergent interfaces | Core is authoritative; CLI/extension/scripts are adapters | `packages/cli`, `packages/extension`, `scripts/` |
| Claude MCP installer | VS Code `servers` catalog and approved `--add-mcp` merge | `config/mcp-providers.jsonc`, `packages/core/src/mcp.ts` |
| Sparse quality gates | Package tests plus 24 agent, 17 skill, lifecycle and failure fixtures | `packages/*/test`, `evals/` |

## Roster result

Visible entries: CTO, Requirements Engineer, Creative Director, Software Architect, Project Manager, Principal Engineer, QA Engineer, Cybersecurity Engineer, and DevOps Engineer.

Hidden workers: Backend Developer, Frontend Developer, Database Engineer, .NET Engineer, Desktop App Engineer, Mobile Engineer, ML Engineer, Data Scientist, Agentic Systems Engineer, XR Engineer, Digital Twin Engineer, Graphic Designer, UX Engineer, Technical Writer, and Knowledge Engineer.

Creative Director may invoke only Graphic Designer and UX Engineer. Principal Engineer may invoke the named implementation, verification, security, documentation, and knowledge workers. Workers have no subagents. DevOps is never model-invoked for deployment.

## Relevant implementation files

### Contracts and policy

- `agent-forge.manifest.jsonc`
- `config/capability-catalog.jsonc`
- `config/model-profiles.jsonc`
- `config/mcp-providers.jsonc`
- `.mcp.json.example`
- `schemas/agent-forge-manifest.schema.json`
- `schemas/capability-catalog.schema.json`
- `schemas/handoff-contract.schema.json`

### Runtime

- `packages/core/src/types.ts`, `manifest.ts`, `validation.ts`, `diagnostics.ts`
- `packages/core/src/environment.ts`, `capabilities.ts`, `models.ts`, `mcp.ts`
- `packages/core/src/render.ts`, `deploymentPlan.ts`, `transaction.ts`, `state.ts`
- `packages/core/src/deploy.ts`, `restore.ts`, `status.ts`, `wipe.ts`
- `packages/core/src/paths.ts`, `hash.ts`, `errors.ts`, `scaffold.ts`, `index.ts`

### Adapters

- `packages/cli/src/index.ts`, `output.ts`, `commands/*`
- `packages/extension/src/extension.ts`, `commands.ts`, `rosterTreeView.ts`, `sidebarViewProvider.ts`
- `packages/extension/src/services/*`
- `scripts/install.ps1`, `uninstall.ps1`, `install-mcps.ps1`, `install-skills.ps1`

### Roster content and gates

- `agents/*.agent.md`
- `skills/*/SKILL.md` and `skills/*/references/*`
- `instructions/*.instructions.md`
- `evals/agents/*.yaml`, `evals/skills/*.yaml`, `evals/lifecycle/*.yaml`, `evals/failures/*.yaml`
- `packages/core/test/*.test.mjs`, `packages/cli/test/*.test.mjs`, `packages/extension/test/*.test.mjs`

## Verification completed

- `npm ci` completed from the lockfile; `npm audit` reports zero vulnerabilities after removing unused `simple-git` and upgrading `esbuild`.
- Core, CLI, and extension builds pass.
- Strict extension TypeScript check passes.
- `npm test` passes: 20 core, 4 CLI, and 1 extension manifest smoke test.
- The isolated VS Code 1.104 extension-host suite passes command, diagnostics, and deployment-preview tests.
- Canonical roster structural validation passes with 24 unique IDs and nine entries.
- Evaluation fixture coverage is enforced for every agent and skill.
- PowerShell wrappers pass AST syntax parsing.

## Remaining release gates

The repository is not authorized or proven for broad live deployment until:

1. Canva, GitKraken, Docker, GitHub, and DigitalOcean are configured and authenticated in the intended VS Code profile.
2. Actual tool IDs are captured and all required capabilities resolve exactly.
3. A strict preview completes without `AF004`, `AF010`, or other errors.
4. Installation is tested in an isolated VS Code profile.
5. VS Code Chat customization diagnostics reports zero errors.
6. Roster behavior evaluations run against that installed profile; repository extension-host integration already passes in an isolated profile.
7. The zero-vulnerability npm audit result remains clean in the release environment.

Live deployment, provider installation, push, merge, and publication remain separate explicitly authorized operations.

## Current-machine Doctor result

The final read-only full-profile Doctor correctly returns `ready: false` and blocks deployment:

- roster structure is valid with zero diagnostics;
- Docker-backed provider commands are detectable;
- the `code` CLI is not on this process PATH, so CLI version discovery emits `AF010`;
- GitKraken `gk` is not ready and emits blocking `AF004`;
- Canva still requires VS Code/OAuth configuration;
- no exact VS Code MCP tool inventory was supplied, so Canva, GitKraken, Docker admin, GitHub admin, and DigitalOcean admin capabilities remain unresolved.

These are target-profile provisioning conditions, not repository validation failures. The extension-host suite independently passed on VS Code 1.104.
