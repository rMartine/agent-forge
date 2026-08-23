# Product Overview

## Purpose

Agent Forge makes specialized Copilot and OpenAI Codex rosters reproducible from one versioned source without overwriting unrelated user customizations.

## Users and outcomes

- Roster maintainers validate identities, delegation, tools, models, and skills before distribution.
- Developers select one of nine lifecycle entry agents and retain control over every phase handoff.
- Operators preview all profile changes, retain rollback evidence, and can remove only unchanged managed files.
- Codex users receive a focused specialist roster and five progressive skill bundles without duplicating project customizations.

## Supported runtimes

GitHub Copilot custom agents in VS Code 1.104.0 or later and OpenAI Codex IDE custom agents. Claude definitions and conversion remain unsupported because `.claude/agents` is VS Code-discoverable and would create duplicate identities.

## Managed artifacts

| Artifact | Source | User target |
|---|---|---|
| Agent | `agents/*.agent.md` | `~/.copilot/agents` |
| Skill | `skills/<id>/` | `~/.copilot/skills/<id>` |
| Instruction | `instructions/*.instructions.md` | `~/.copilot/instructions` |
| Optional hook | `hooks/` | `~/.copilot/hooks` |
| Codex agent | generated from selected `agents/*.agent.md` | `~/.codex/agents/*.toml` |
| Codex bundle | generated from `skills/<id>/` | `~/.agents/skills/agent-forge-*` |

Internal catalogs, schemas, evaluations, Codex configuration, global `AGENTS.md`, and personal `.codex/skills` are never copied or modified.

## Non-goals

- Running a hosted multi-agent service
- Requiring nested subagents
- Deploying every canonical role as a Codex custom agent
- Treating prompt text as a security sandbox
- Silently installing models, Python packages, providers, or secrets
- Managing arbitrary files that are not in the ownership ledger
- Editing Codex MCP configuration or personal/global instruction files
