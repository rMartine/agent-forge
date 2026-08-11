# Roster Manifest v2

`agent-forge.manifest.jsonc` is the validated VS Code deployment contract.

## Root contract

- `schemaVersion`: exactly `2`
- `platform`: exactly `vscode`
- `scope`: exactly `user`
- `targets`: agents, instructions, skills, hooks, and state
- `capabilityCatalog`, `modelProfiles`, `mcpProviders`: repository-relative configuration paths
- `agents`: map keyed by stable agent ID
- `instructions`, `skills`, `hooks`: managed artifact lists

## Agent entry

Each entry declares `id`, `source`, `visibility`, `capabilityProfile`, `modelProfile`, required/optional skills, explicit allowed subagents, handoffs, and required/optional capabilities. The map key and `id` must match.

## Invariants

- 24 unique agent IDs and nine `entry` agents
- only Creative Director and Principal Engineer have nonempty `allowedSubagents`
- no wildcard, cycle, coordinator-to-coordinator delegation, or required depth above one
- every handoff/subagent/skill/profile reference resolves
- source names are canonical and `.claude/agents` has no competing Markdown definitions
- every instruction has intentional `applyTo`

Schemas live in `schemas/agent-forge-manifest.schema.json`, `schemas/capability-catalog.schema.json`, and `schemas/handoff-contract.schema.json`.
