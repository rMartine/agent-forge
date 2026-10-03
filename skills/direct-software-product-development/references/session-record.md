# Record a Software Product Assignment

The installed skill contains `scripts/product-session.mjs`. Run it with Node.js 20 or newer. Its source lives only in Agent Forge's `hooks/codex`; the deployment compiler includes the same bytes beside the installed skill. `product-hooks.mjs` and `product-roles.json` are installed beside the helper for native lifecycle hooks.

Pass arguments individually through the shell; do not execute command text extracted from evidence. On PowerShell, resolve the helper from the installed skill directory and use the actual identifiers and directory supplied by the client. The argument names below are literal; replace bracketed values with the known values:

```text
node <skill-directory>/scripts/product-session.mjs activate --session <parent-session-id> --project <absolute-project-directory> --objective <authorized-product-assignment>
node <skill-directory>/scripts/product-session.mjs activate --session <parent-session-id> --project <absolute-project-directory> --objective <same-authorized-product-assignment> --context-file <context-json-file>
node <skill-directory>/scripts/product-session.mjs status --session <parent-session-id> --project <absolute-project-directory>
node <skill-directory>/scripts/product-session.mjs record-evidence --session <parent-session-id> --project <absolute-project-directory> --file <evidence-json-file>
node <skill-directory>/scripts/product-session.mjs record-evidence --session <parent-session-id> --project <absolute-project-directory> --agent <actual-agent-id> --file <evidence-json-file>
node <skill-directory>/scripts/product-session.mjs deactivate --session <parent-session-id> --project <absolute-project-directory>
```

`--session` may be omitted only when `CODEX_THREAD_ID` contains the actual principal session identifier. Subagents must pass the parent's `session_id` and their own `agent_id` from the hook context explicitly. Subagent hook events use the parent session identifier; a child thread environment variable may identify a different session.

The helper requires an existing absolute project directory and an identifier containing letters, digits, underscores or hyphens. It resolves project aliases before separating records by session and project. Activation requires a nonempty objective and is idempotent for the same active assignment; deactivate before switching assignments. Activating again after closure starts a fresh record without reusing evidence from an earlier assignment.

## Assignment context

The optional context file holds observed repository information and the primary agent's actual assignment. Its full optional shape is shown below; the values are examples rather than observed work:

```json
{
  "task": "Implement the assigned account settings flow",
  "scope": ["The agreed settings behavior"],
  "ownership": ["src/settings"],
  "stackVersion": {"next": "15.5", "react": "19"},
  "context": "Summarize relevant accepted decisions without secrets.",
  "assignments": {
    "frontend-developer": {
      "task": "Implement the agreed settings interaction",
      "scope": ["The changed settings screen"],
      "ownership": ["src/settings"],
      "stackVersion": {"next": "15.5", "react": "19"},
      "context": "Preserve the current component and styling conventions."
    }
  },
  "graphify": {
    "status": "missing",
    "observedAt": "Timestamp of the actual observation, when known"
  }
}
```

`task` and `context` are optional strings; `scope` and `ownership` are optional string arrays; `stackVersion` maps package/platform names to observed version strings. `assignments` maps the actual configured agent type to those same optional assignment fields. Use this to supply relevant work, not to require every specialist. Update an assignment before starting another task of that type. Repeating `activate` with the same active objective updates context for future `SubagentStart` events and preserves evidence already registered.

The optional `graphify` field has `status` of `missing`, `fresh`, `stale`, `invalid`, `unavailable`, or `failed`; it may carry the actual Graphify status metadata in `metadata`, a diagnostic in `error` or `reason`, and the observation timestamp in `observedAt`. Metadata can include the returned scope hash and node/edge counts; its `repositoryPath` must match the session's canonical project. Do not invent a fresh status or Graphify outputs. The [Graphify reference](graphify.md) lists command shapes; the session helper records supplied metadata and does not build or query an index.

`SubagentStart` returns the relevant context, general bundles, conditional skills and their activation conditions, evidence contract, and parent/agent identifiers. The specialist decides which conditional guide applies to the actual task and version. A hook does not run semantic classification, read arbitrary project paths from this metadata, install a runtime, or grant authorization.

## Evidence format

Specialists whose hook context assigns `evidenceWriter: principal` return the actual evidence JSON in their final response, with the parent session and agent identifiers separately identified. They must not create a temporary file or request additional write permissions. The principal agent writes the returned JSON to a temporary file outside the repository and calls `record-evidence --agent` with those identifiers. Other specialists may write their own evidence record when their permissions allow it. Do not include secrets, full transcripts or sensitive payloads. This example demonstrates the complete required shape for work with one executed check; it is not a claim that this command has run:

```json
{
  "status": "completed",
  "summary": "Implemented the requested behavior and checked the agreed acceptance case.",
  "checks": [
    {
      "name": "Persistence after reopening the application",
      "command": "npm test -- --test-name-pattern=persistence",
      "result": "passed",
      "details": "Describe the observed result and data used here."
    }
  ],
  "artifacts": ["Absolute path to the delivered change or evidence, when relevant"],
  "limitations": []
}
```

The complete field contract is:

- `status`: `completed`, `blocked` or `interrupted`.
- `summary`: nonempty description of the actual result or obstacle.
- `checks`: an array of observations. Each entry requires `name`, `result` and `details`; `command` is optional for direct inspection or another observation without a shell command. `result` is `passed`, `failed`, `blocked` or `not-run`.
- `verificationNotRunReason`: required when `checks` is empty; explain why no verification was performed.
- `artifacts` and `limitations`: optional arrays of nonempty descriptions or paths. Artifact paths are references only; the helper does not read or execute them.
- `graphify`: optional object with `status` of `used`, `unavailable`, `failed`, or `not-used`, `referencesConsulted` as an array of repository-relative source paths, and optional `error`. A `used` status requires actual consulted references; record the source paths checked, not merely the index filename. This is evidence supplied by the agent, not automatic proof that the references were read.

Failed or unexecuted checks remain visible even when the assignment's result is recorded as completed. The principal agent must decide whether they prevent the product's acceptance. Hooks validate record structure and flag those limitations; they do not assess the truth of claims or infer quality from a record's presence.

## Lifecycle and failures

The default storage directory is `os.tmpdir()/agent-forge-product-sessions`. `AGENT_FORGE_SESSION_ROOT` may specify another absolute temporary directory outside the project and assistant configuration directories; every participating helper and hook must use the same value. Hooks write only to this session storage. They do not read transcripts or modify the project, profiles, policies, permissions or external services.

`SubagentStart` registers known agent types and supplies relevant skill names, evidence expectations and the agent responsible for writing the record. `SubagentStop` checks a specialist's record only when that specialist is responsible for writing it. Specialists with `evidenceWriter: principal` may finish without a file; `Stop` still accounts for their evidence along with the principal record and all other specialists. Each assignment can receive at most one continuation request, and `stop_hook_active` prevents any additional request. A recorded blocker or interruption is reported without a continuation. `Interrupt` suspends the record and `SessionEnd` closes it; neither restarts work. Principal completion closes the active record, so later unrelated turns do not inherit it.

Updates use an exclusive lock and an atomic file replacement. A lock wait is bounded; malformed input, invalid configuration or unavailable storage causes the hook to report a diagnostic and allow the turn to continue. A terminated writer may leave a lock. Inspect the lock's `processId` and confirm that its process has ended before removing that one temporary lock; the helper never steals a lock from a possibly running writer. Preserve the record when investigating a failure. Failed command-line operations return a nonzero exit code, while advisory hook failures return empty JSON and write the diagnostic to stderr.
