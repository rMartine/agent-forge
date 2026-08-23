# Agent Modifications

## 2026-08-10 VS Code roster refactor

- Preserved all 24 stable IDs and made nine lifecycle roles visible.
- Removed all parallel `.claude/agents` definitions and conversion scripts.
- Replaced CTO-first nested orchestration with user-controlled phase handoffs.
- Limited the `agent` tool to Creative Director and Principal Engineer with explicit worker lists.
- Rewrote role bodies around scope, outputs, evidence, approval boundaries, and the shared handoff envelope.
- Separated ML pipeline ownership from generic agent/RAG ownership.
- Made DevOps user-controlled for production and cloud mutation.
- Replaced source toolset aliases with manifest capability profiles resolved at deployment.
- Added model profiles that inherit unless the locally available model inventory validates a configured mapping.
- Prohibited autonomous edits to roster definitions, skills, manifest, tools, and governance.

Canonical role source is now exclusively `agents/*.agent.md`. Rendered runtime overlays are never written back to source.

## 2026-08-23 Codex IDE integration

- Preserved the 24 canonical IDs and selected 16 bounded Codex specialist agents.
- Kept Software Architect and Cybersecurity Engineer read-only; other Codex specialists use workspace-write.
- Removed delegation from every rendered Codex custom agent and kept lifecycle routing with the primary Codex agent.
- Rewrote individual source-skill references to five prefixed, progressively disclosed Codex bundles.
- Discarded Copilot-only tools, handoffs, visibility, invocation, and model fields during TOML rendering.
- Kept model, MCP, permissions, approvals, global `AGENTS.md`, and personal skills user-owned.
- Added runtime-separated duplicate detection, immutable deployment plans, state v2, and grouped rollback.
