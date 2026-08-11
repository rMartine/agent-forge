# Product Overview

## Purpose

Agent Forge makes a specialized Copilot roster reproducible across VS Code workspaces without overwriting unrelated user customizations. It manages current VS Code agents, skills, instructions, and optional hooks from one versioned source.

## Users and outcomes

- Roster maintainers validate identities, delegation, tools, models, and skills before distribution.
- Developers select one of nine lifecycle entry agents and retain control over every phase handoff.
- Operators preview all profile changes, retain rollback evidence, and can remove only unchanged managed files.

## Supported runtime

GitHub Copilot custom agents in VS Code 1.104.0 or later. Claude definitions and conversion are intentionally unsupported because `.claude/agents` is also VS Code-discoverable and would create duplicate identities.

## Managed artifacts

| Artifact | Source | User target |
|---|---|---|
| Agent | `agents/*.agent.md` | `~/.copilot/agents` |
| Skill | `skills/<id>/` | `~/.copilot/skills/<id>` |
| Instruction | `instructions/*.instructions.md` | `~/.copilot/instructions` |
| Optional hook | `hooks/` | `~/.copilot/hooks` |

Internal capability catalogs, schemas, and evaluations are not copied into VS Code discovery folders.

## Non-goals

- Running a hosted multi-agent service
- Requiring nested subagents
- Treating prompt text as a security sandbox
- Silently installing models, Python packages, providers, or secrets
- Managing arbitrary files that are not in the ownership ledger
