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
