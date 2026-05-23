# Agent Modifications Log

This file tracks all modifications made to agent `.agent.md` files. Every change must be logged here — whether made by `@knowledge-engineer` (modifying another agent) or by an agent modifying its own configuration.

## Log Format

```
## [Date] — [Agent Name]
- **Change**: [What was added or modified]
- **Reason**: [Why the change was made]
- **Made by**: [Which agent made the change]
```

---

<!-- Append new entries below this line -->

## 2025-01 — Roster-wide orchestration overhaul (branch: feature/roster-orchestration-overhaul)

- **Change**: Rewrote `config/common.toolsets.jsonc` into four toolsets: `all-builtins` (default for all specialists), `orchestrator` (adds `agent` tool for CTO/principal-engineer/creative-director), `devops` (adds DigitalOcean/Docker/GitHub MCP for devops-engineer), `knowledge` (adds Docker MCP for knowledge-engineer). All four include every built-in VS Code tool (read, edit, search, execute, web, browser, todo, vscode, ask, gitkraken/*).
- **Change**: Updated `agent-forge.manifest.jsonc` to populate the `toolset` field for every one of the 21 roster entries (previously all `null`).
- **Change**: Normalized the frontmatter of all 21 `agents/*.agent.md` files to reference toolset names (`tools: [all-builtins]` etc.) instead of inline tool arrays. Added `user-invocable: false` to six agents that were missing it (knowledge-engineer, technical-writer, project-manager, software-architect, requirements-engineer, cybersecurity-engineer). Added `disable-model-invocation: true` to CTO so it cannot be invoked as a sub-agent. Added missing members to `agents:` allowlists on CTO (devops-engineer) and principal-engineer (cybersecurity-engineer, ux-engineer). Added `qa-engineer` to handoffs on all implementation specialists (backend, frontend, mobile, desktop-app, dotnet, ml).
- **Change**: Rewrote `instructions/agent-communication.instructions.md` to clearly distinguish Delegation (programmatic, via `agent` tool and `agents:` allowlist) from Handoffs (UX suggestion buttons, post-response). Added Clarification Escalation protocol. Added mandatory delegation directive. Restricted QA access to CTO + principal-engineer only.
- **Change**: Expanded `agents/cto.agent.md` Operating Mode with Session Bootstrap (KB container health check, Todo.txt open/close, lessons-learned consult), mandatory delegation directive in every delegation prompt, Release Proposal protocol, and Session Closeout.
- **Change**: Expanded `agents/devops-engineer.agent.md` with a Monorepo Environment & Deployment Discipline section (global `.env.*` files, `run-dev.*`/`deploy-prod.*`/`validate-env.*` scripts, Docker Hub private registry + DigitalOcean deploy pipeline, Script Audit & Consolidation Checklist, Pre-Release Validation).
- **Change**: Expanded `agents/knowledge-engineer.agent.md` with a Periodic Self-Improvement Pass procedure that audits the full roster, instructions, and manifest for inconsistencies.
- **Change**: Restructured `Todo.txt` into `In Progress` / `Pending` / `Implemented` sections. Migrated all existing items into Pending with notes on where each is now codified.
- **Change**: Added `Review Policy` section to `instructions/git-workflow.instructions.md` (branch-prefix -> reviewer mapping table, review checklist, review outcome protocol). Added `Release Workflow` section (11-step cross-agent release process).
- **Reason**: The prior configuration had several routing bugs: inconsistent `user-invocable` flags, missing members in orchestrator allowlists, ambiguous `handoffs:` vs `agents:` semantics, QA reachable from anywhere (breaking the chain of command), no documented release workflow, Todo.txt unstructured, no branch-review policy, and no session-level protocol for syncing the knowledge base. This overhaul addresses all of these in a single coordinated change so the roster behaves consistently and the full CTO->specialist->merge->deploy chain is explicit.
- **Made by**: `@cto` (planning + orchestration), via delegation to `@principal-engineer` for implementation across configuration, agent bodies, and instruction files. Logged here at session closeout.
