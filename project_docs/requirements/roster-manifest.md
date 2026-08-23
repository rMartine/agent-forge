# Roster Manifest v3

`agent-forge.manifest.jsonc` is the validated dual-runtime deployment contract.

## Root contract

- `schemaVersion: 3`
- `platforms: ["vscode", "codex"]`
- `scope: "user"`
- runtime-specific targets plus shared state path
- capability, model, and MCP provider catalog paths
- 24 canonical `agents`
- Copilot `instructions`, `skills`, and optional `hooks`
- Codex selected agents and skill bundles

Manifest v2 is rejected for deployment. State v1 has a separate guarded migration path.

## Canonical agent entry

Each canonical entry declares source, Copilot visibility, capability and model profiles, required/optional skills, explicit first-level subagents, handoffs, and capabilities. Existing 24 IDs remain stable.

## Codex agent entry

`CodexAgentManifestEntry` declares:

- `id` and `sourceAgent`
- `sandboxMode`: `read-only` or `workspace-write`
- `modelProfile: inherit`
- required skill bundles
- authoritative instruction overlay
- required/optional capability families for Doctor reporting

Exactly 16 entries are selected. Only Software Architect and Cybersecurity Engineer are read-only. Rendered agents have no delegation, tool, handoff, visibility, or model-pin fields.

## Codex bundle entry

`CodexSkillBundleEntry` declares a prefixed deployment name, `SKILL.md` entrypoint, trigger-complete description, component skills, and flattened reference expectations. Exactly five bundles are produced from the 17 canonical modules.

## Invariants

- 24 canonical IDs, nine Copilot entries, and the existing depth-one Copilot graph
- 16 Codex IDs, no Codex custom-agent delegation, inherited model choice
- five unique `agent-forge-*` bundles and no unresolved `$skill-id`
- no duplicate ID within one runtime or discovery chain
- no project-scoped Codex copies
- all source, skill, bundle, handoff, capability, and instruction references resolve

The normative schema is `schemas/agent-forge-manifest.schema.json`.
