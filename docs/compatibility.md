# Client compatibility

All client editions are generated from the same four-roster catalog. Names, event payloads, and native permissions differ across clients, so parity means the same logical roster, skills, model intent, and hook policies with explicit adapter coverage. It does not mean identical execution semantics.

| Client | Edition | Delegation and limits | Hook behavior | Status |
|---|---|---|---|---|
| Codex Desktop | `codex` | The shared instructions request useful delegation. The Codex runtime controls available agents, nesting, and concurrency; Agent Forge does not add a depth limit. | Agent Forge-owned groups map common lifecycle and tool policies to Codex events. Changed hook trust remains a native client action. | Generated and deployable; live nested behavior must be verified in a fresh session. |
| Codex extension for VS Code | `codex` | Uses the Codex edition and Codex runtime. | Same Codex hook edition; extension UI does not certify that hooks were trusted or executed. | Generated and deployable; verify in the extension separately from Desktop. |
| GitHub Copilot in VS Code | `vscode` | Subagent invocations may depend on the selected harness and VS Code setting `chat.subagents.allowInvocationsFromSubagents`. The host owns nesting and concurrency limits. | Adapter translates supported Copilot or Local events. If actor or instance identity is absent, coverage reports the gap and the runtime avoids guessing. | Generated and deployable; verify Copilot and Local harnesses only where configured. |
| OpenCode | `opencode` | Agents are emitted using the OpenCode V2 agent contract with delegation enabled. Host model/provider support and concurrency behavior remain client-specific. | Generated V2 plugin contributes shared session context and a permission hook that only restricts access. Because custom children do not inherit their parent permissions, read-only agents can delegate only to canonical read-only profiles. Missing actor identity restricts actions conservatively. Lifecycle attribution remains unsupported; the bundled plugin must be loaded. | Export and contract-validated; OpenCode is not installed or live-tested. |

## Model mapping

The catalog's model IDs and reasoning preferences remain intact. A target whose model inventory does not contain an assigned model reports the missing capability. Agent Forge does not silently substitute another model. Client controls over reasoning effort may differ; a value in the catalog is intent unless the target format and host expose a corresponding setting.

## Delegation and security boundaries

Each agent can delegate when the client exposes subagent invocations. This includes coordinators, specialists, and agents whose own work is read-only. A read-only parent may request read-only analysis from a child; it must not route around its limits by assigning write actions. Descendants retain their own instructions and the inherited client permissions. Delegation never authorizes an external action or overrides provider scopes, workspace trust, approval policies, or the client's sandbox.

## Native references

- [Codex subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- [VS Code subagents](https://code.visualstudio.com/docs/agents/run/subagents)
- [OpenCode V2 agents](https://opencode.ai/v2/docs/agents)
- [OpenCode V2 plugins](https://opencode.ai/v2/docs/build/plugins)
