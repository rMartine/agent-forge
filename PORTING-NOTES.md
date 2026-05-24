# Porting Notes: Copilot → Claude Code

This document records the design decisions made when porting the agent roster from GitHub Copilot custom-agent format to Claude Code subagent format. Read this before adding or editing any agent under `.claude/agents/`.

## TL;DR

| Aspect | Copilot (source) | Claude Code (target) | Notes |
|---|---|---|---|
| Location | `agents/*.agent.md` | `.claude/agents/<division>/*.md` | Claude Code scans `.claude/agents/` recursively; subfolders organize but do not change identity |
| Identity | filename | `name:` frontmatter field | Must be unique across the whole tree |
| Trigger | `description:` | `description:` | Same intent, same field |
| Tools | `tools: [toolset-name]` | `tools: Read, Edit, ...` | Comma-separated string of explicit tool names. Toolsets do not exist in CC |
| Allowlist (delegation) | `agents: [a, b, c]` | `tools: Agent(a, b, c), ...` | Only effective when the agent runs as the main thread (`claude --agent <name>`) |
| Handoffs | `handoffs: [...]` | none | Folded into the system prompt body as "Next steps" guidance |
| User invocability | `user-invocable: false` | none | Implicit. The description should clearly signal it's a sub-task agent |
| Auto-invocation | `disable-model-invocation: true` | none | Implicit. The description for orchestrators should not match common task patterns |
| Model selection | none (picker only) | `model: sonnet \| opus \| haiku \| inherit` | Defaults to `inherit` if omitted |

## Critical architectural difference: orchestration

**Subagents in Claude Code cannot spawn other subagents.** Only the main session thread has the `Agent` tool. This breaks the multi-level Copilot orchestration model (CTO → principal-engineer → backend-developer).

### How we resolve it

Three patterns are available; we use **Pattern A** for orchestrators and **Pattern B** for specialists.

**Pattern A — orchestrator-as-main-session.**
For an orchestrator (CTO, principal-engineer, creative-director), launch Claude Code with that agent as the main thread:

```bash
claude --agent cto
```

The orchestrator's body becomes the session's system prompt, and it gains access to `Agent(...)` to spawn its direct reports. The `tools:` frontmatter uses `Agent(creative-director, requirements-engineer, ...)` to restrict which subagents it can spawn — equivalent to the Copilot `agents:` allowlist.

**Pattern B — specialist-as-subagent.**
Specialists (backend-developer, knowledge-engineer, etc.) are invoked via the Agent tool by whichever orchestrator is running. They do **not** delegate further; if cross-domain work is needed, they return a structured result asking the orchestrator to re-route. This is exactly the same escalation pattern documented in `instructions/agent-communication.instructions.md` — it carries over unchanged.

**Pattern C — agent teams (experimental).**
For sustained parallelism, `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` enables peer-to-peer messaging between named subagents via `SendMessage`. We are **not** adopting this in the initial port; it's a follow-up to consider once the basic port is validated.

## Tool name mapping

The Copilot toolset names in `config/common.toolsets.jsonc` translate as follows:

| Copilot tool | Claude Code tools | Notes |
|---|---|---|
| `read` | `Read` | |
| `edit` | `Edit, Write` | CC separates editing existing files from writing new ones |
| `search` | `Grep, Glob` | |
| `execute` | `Bash` | |
| `web` | `WebSearch, WebFetch` | |
| `browser` | `mcp__claude-in-chrome__*` | Requires Chrome MCP. Omitted for now |
| `todo` | `TodoWrite` | |
| `vscode` | — | No equivalent. Omitted |
| `ask` | — | CC handles user questions through the model directly |
| `agent` | `Agent` (or `Agent(name1, name2)` for allowlist) | Only effective when running as main thread |
| `gitkraken/*` | `mcp__gitkraken__*` | Requires the GitKraken MCP server. Optional |
| `com_digitaloc/*` | `mcp__digitalocean__*` | Requires DigitalOcean MCP |
| `com_docker_do/*` | `mcp__docker__*` | Requires Docker MCP |
| `com_github_gi/*` | `mcp__github__*` | Requires GitHub MCP |

The four Copilot toolsets become these Claude Code patterns:

- **`all-builtins`** → explicit list: `Read, Edit, Write, Grep, Glob, Bash, WebSearch, WebFetch, TodoWrite` (plus MCP tools if available)
- **`orchestrator`** → `all-builtins` plus `Agent(<allowed-subagents>)`
- **`devops`** → `all-builtins` plus `mcp__digitalocean__*, mcp__docker__*, mcp__github__*`
- **`knowledge`** → `all-builtins` plus `mcp__docker__*`

## Handoffs → "Next steps" prose

Copilot handoffs are buttons VS Code shows after the agent finishes. Claude Code has no equivalent. We translate each `handoffs:` entry into a "Next steps" section at the end of the agent's body, e.g.:

```markdown
## Next steps

When implementation is ready for review, return control with a summary so the
parent (principal-engineer) can hand off to qa-engineer.
```

This keeps the same routing intent, expressed as guidance to the parent rather than as a UX suggestion.

## Instructions → CLAUDE.md fragments

The Copilot `instructions/*.instructions.md` files are not portable as-is — Claude Code does not have an `instructions` concept. Their content becomes:

- **`agent-communication.instructions.md`** → preserved as `.claude/CLAUDE.md` (loaded by every session) so all agents share the protocol
- **`agent-self-governance.instructions.md`** → folded into `CLAUDE.md`
- **`git-workflow.instructions.md`** → folded into `CLAUDE.md`
- **`knowledge-base-protocol.instructions.md`** → preserved as a standalone reference, linked from CLAUDE.md
- **`project-conventions.instructions.md`** → folded into `CLAUDE.md`

## Model selection policy

The Copilot manifest sets `model: null` for every agent (deferred to the picker). For Claude Code we use `model: inherit` for almost all agents — same effect — except:

- Research / read-only / high-volume agents → `model: haiku` for cost (e.g., a future "research-scout" agent)
- Critical architectural / strategic agents → leave as `inherit` so the user's picker choice (typically Opus) applies

## What's intentionally NOT being ported (yet)

- The Knowledge Engineer's Docker-based Postgres KB stack works as-is — but the periodic self-improvement pass that reads `agents/*.agent.md` needs to be retargeted to `.claude/agents/**/*.md`. Logged for Fase 3.
- Hooks and skills from Copilot — Claude Code has its own hooks and skills systems with different schemas. Out of scope for initial port.
- The Agent Forge VS Code extension itself — it deploys to Copilot directories. Claude Code reads from `.claude/agents/` in-repo and from `~/.claude/agents/` for user-scope; no deployment step needed. The extension is unchanged on this branch.

## Recommended invocation patterns

```bash
# Run a normal session — Claude main thread can spawn any subagent
claude

# Run the whole session as CTO (orchestrator with allowlist)
claude --agent cto

# Run a one-off review with a specialist
claude --agent backend-developer
```

For day-to-day work, the recommended default is `claude --agent cto` so every user request goes through the same intake/routing flow defined in the Copilot CTO operating mode.
