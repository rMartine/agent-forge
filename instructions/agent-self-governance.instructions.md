---
description: "Use when: an agent needs a tool it doesn't have, installing MCP servers, updating own configuration, tool access limitations, self-improvement based on knowledge base findings, enabling existing MCP servers"
---

# Agent Self-Governance

Agents can adapt their own configuration and tooling to meet task requirements. All changes are additive, logged, and reversible.

## 1. Knowledge-Driven Self-Improvement

When `@knowledge-engineer` catalogs error patterns that reveal an agent's configuration needs updating (e.g., "backend-developer repeatedly fails because it lacks access to MCP server X"):

1. **KE identifies the gap** — the knowledge entry includes a recommendation for the affected agent.
2. **KE edits the target agent's `.agent.md`** — adds the missing tool to the `tools:` array in frontmatter.
3. **KE logs the change** — appends to `project_docs/knowledge/agent-modifications.md` with: agent name, change made, reason, and date.

Any agent can also add tools to its **own** `.agent.md` when it discovers a gap during task execution. The same logging rule applies.

### Governance Rules

- **Additive only** — agents may ADD tools or constraints. Never remove tools, change roles, descriptions, or models.
- **Log every change** — every self-modification is appended to `project_docs/knowledge/agent-modifications.md`.
- **No cross-agent changes except KE** — only `@knowledge-engineer` may edit OTHER agents' files. All other agents may only edit their own.

## 2. MCP Server Provisioning

When an agent determines it needs an MCP server to complete a task:

### Step 1 — Identify Need
The agent recognizes it needs external capabilities not available through built-in tools (e.g., a specific API integration, database connector, or service).

### Step 2 — Check VS Code MCP Gallery
Use `vscode` tools to search the MCP server gallery for available servers matching the need.

### Step 3a — Gallery Available
If a matching server exists in the VS Code gallery:
1. Install it using VS Code extension/MCP management tools.
2. Use `ask` to request any required configuration from the user (API keys, tokens, connection strings).
3. Self-enable: add `"server-name/*"` to own `tools:` array by editing own `.agent.md`.

### Step 3b — Gallery Unavailable
If no matching server exists in the gallery:
1. Check the Docker Desktop MCP server library for a containerized alternative.
2. Delegate to `@devops-engineer` to deploy and configure the MCP server container.
3. DevOps configures the server in the user-level `mcp.json`.
4. Use `ask` to request any credentials or config details from the user.
5. Self-enable: add `"server-name/*"` to own `tools:` array.

### Step 4 — Log
Append the MCP server installation to `project_docs/knowledge/agent-modifications.md`.

## 3. Self-Enabling Existing MCP Servers

When an MCP server is already configured in `mcp.json` but not listed in the agent's `tools:` array:

1. **Verify availability** — confirm the server is running and responsive.
2. **Self-enable** — edit own `.agent.md` to add `"server-name/*"` to the `tools:` array.
3. **Log the change** — append to `project_docs/knowledge/agent-modifications.md`.

This avoids needing the user to manually add tool access for every agent that needs an existing server.

## Modification Log Format

Append entries to `project_docs/knowledge/agent-modifications.md`:

```markdown
## [Date] — [Agent Modified]
- **Changed by**: [agent name]
- **Change**: Added `"server-name/*"` to tools
- **Reason**: [why the tool was needed]
```
