# Roster Manifest v4

[agent-forge.manifest.jsonc](../../agent-forge.manifest.jsonc) is the validated deployment contract for Copilot and Codex. Its current inventory contains 24 canonical agents and 13 source skill modules for Copilot, and selects 16 Codex specialists. Codex receives 12 discoverable skills: five bundles from the shared modules, one skill for the primary conversation agent to direct product development, and six curated external skills. These numbers describe the current selection; they are not fixed-count validation rules for Codex.

## Root contract and compatibility

The root contract declares `schemaVersion: 4`, `platforms: ["vscode", "codex"]`, `scope: "user"`, runtime-specific targets, the shared deployment-state path, and capability, model and MCP provider catalog paths. It also declares canonical agents, Copilot instructions and source skills, optional Copilot hook artifacts, selected Codex agents and bundles, and the additional Codex product-development configuration.

Manifest v3 remains readable and deployable without the v4-only fields. `codex.productDevelopment` and `codex.externalSkillCatalog` require v4; they are not silently added to an older manifest. Manifest v2 is rejected for deployment. Deployment state remains schema v2, with its separate guarded migration from state v1. The exported TypeScript type retains the name `DeploymentManifestV3` while accepting manifest versions 3 and 4.

## Agent responsibilities and entries

A canonical agent entry declares its source, Copilot visibility, capability and model profiles, required and optional skills, explicit first-level subagents, handoffs and capabilities. The existing Copilot graph retains nine directly invocable agents, only `creative-director` and `principal-engineer` as delegators, no cycles and no nested delegation beyond that first level. Changing the Codex selection does not remove those applicable Copilot requirements.

`CodexAgentManifestEntry` declares the following complete entry contract:

- `id` and `sourceAgent` identify a unique specialist and an existing canonical source.
- Optional `displayName` supplies a readable name for hook messages and their generated reference. It does not change the specialist identifier or add unsupported fields to native Codex agent files. Existing manifests without it use the identifier.
- `sandboxMode` is `read-only` or `workspace-write`; `modelProfile` is `inherit`.
- `requiredSkillBundles` names existing bundles; `instructionOverlay` defines the specialist's Codex responsibility.
- `requiredCapabilities` and `optionalCapabilities` name capability families for diagnostics.
- Optional `completionEvidence` describes the outputs and observations appropriate to that responsibility.

The primary conversation agent directs the product, selects specialists, integrates results and assesses delivery using `agent-forge-build-software-products`. The selected `principal-engineer` is an implementation and integration specialist; it does not take over that direction. Codex specialists do not delegate. In the current selection, `software-architect` and `cybersecurity-engineer` are read-only and the other specialists have workspace-write access. Rendered TOML contains only `name`, `description`, `developer_instructions` and `sandbox_mode`; it introduces no tool grants, handoffs, visibility fields or model pins.

All selected agents participate only in assigned software-product work. General questions, independent research and isolated code examples do not activate this workflow. The [complete responsibility matrix](../architecture/codex-product-agents.md) specifies when each specialist participates, its inputs, outputs, skills and verification evidence.

## Skills, sources and hooks

`CodexSkillBundleEntry` declares a prefixed deployment name, `SKILL.md` entrypoint, description with clear activation conditions, component skill IDs and expected flattened references. References must resolve against the declared source modules; bundle generation is not tied to a count of five or an obsolete count of 17 source modules.

`codex.productDevelopment` declares `source`, `deploymentName`, `hooksSource` and `hooksTarget`. It generates the direction skill, its helper scripts, an agent-responsibility reference and `product-roles.json` from the selected manifest entries. The generated hook configuration matches each selected specialist for `SubagentStart` and `SubagentStop`, and registers `Stop`, `Interrupt` and `SessionEnd`. Evidence from read-only specialists is registered by the primary conversation agent. Hook groups share the user's `hooks.json`; ownership is limited to the groups recorded by Agent Forge, not the entire file.

`codex.externalSkillCatalog` identifies [config/external-skills.json](../../config/external-skills.json), whose version-1 contract declares source directory URLs from skills.sh, original GitHub repositories, immutable commit revisions, licenses, source paths, file hashes, deployment names, agent assignments and activation descriptions. Optional exact `adaptations` specify `path`, `find`, `replace` and `reason`; every replacement must match once. The current catalog has 140 original resources and 67 adaptations across six skills. Those counts are evidence of this selection, not limits on future reviewed selections.

External files are prepared in an ignored cache, checked against SHA-256 hashes, adapted without changing the cached originals and captured as exact bytes in the deployment plan. Licenses, reference resources and source records accompany each skill. Apply uses the saved plan; it does not fetch a different upstream version. An absent cache file or a hash mismatch prevents resolving that skill unless the explicit preview download option can retrieve the pinned, matching bytes.

## Validation and ownership requirements

- Require nonempty canonical and Codex agent collections, stable unique identifiers and valid references; do not require exactly 16 Codex agents or five bundles.
- Require unique deployed skill names across bundles, product direction and external skills, and no unresolved `$skill-id` references.
- Preserve the Copilot visibility and delegation graph requirements, inherited Codex model choice and absence of specialist delegation.
- Resolve every source, instruction, capability, handoff, bundle component and external-agent assignment. Validate external paths, revisions, hashes, included license files and exact adaptation matches.
- Reject duplicate discovery within one runtime and do not create project-scoped `.codex/agents` or `.agents/skills` copies.
- Preserve user-owned configuration, permissions and unrelated hook groups. A modified managed artifact must not be silently overwritten or adopted.
- Permit explicit reconciliation only for complete files already owned by the selected active runtime deployment. Preserve observed bytes, absences and the prior ledger in backups; do not adopt unmanaged paths or reconcile shared hook groups through this mechanism.

The normative schema is [schemas/agent-forge-manifest.schema.json](../../schemas/agent-forge-manifest.schema.json). Runtime validators additionally check relationships, source content, cache integrity and ownership. Tests that verify fixture presence or shape are structural coverage; they do not establish observed agent behavior or compatibility with either client.
