# Architecture and catalog

## Canonical inventory

Agent Forge has four rosters and 45 agents: 41 specialists and four optional coordinators. `config/roster-catalog.json` records their stable IDs, model and reasoning preferences, read/write intent, skills, evidence expectations, and delegation policy. Each agent's instructions live under `rosters/<roster>/<agent-id>.md`.

Skills and hook policies are resolved from the same catalog and its declared resources. Counts are calculated from the source rather than enforced as fixed schema limits. Source attribution and licenses for adapted third-party material remain with their respective resource files and provenance records.

The root `agent-forge.manifest.jsonc` is schema version 6. It describes repository-relative catalog and runtime roots, target locations, capability catalogs, and deployment state. It is a transport/deployment manifest, not a second agent roster. The loader validates it and loads the canonical catalog once for each operation.

## Editions and adapters

The shared renderer takes an `ArtifactEdition` (`codex`, `vscode`, or `opencode`) and emits client-native artifacts from the same resolved catalog. There is no Codex-to-Copilot conversion hop. `export --target all` renders all editions in one command and does not write to user profiles. Deployment is a separate plan-based operation and supports Codex and VS Code.

The logical inventories share agent IDs, skills, and hook policies. Adapters translate names, prompt fields, model identifiers, permissions, and native hook events. `runtime/catalog.json` in an export records a fingerprint and per-client coverage, including known gaps. A matching inventory does not imply that every client can execute every native event.

Codex's edition targets both Codex Desktop and the Codex extension for VS Code. GitHub Copilot is a separate VS Code edition because it has a different discovery and runtime contract. OpenCode output uses the documented V2 agent and plugin formats; it is generated for validation, not installed.

## Delegation and permissions

All 45 agents are eligible to delegate. The rendered shared instruction asks an agent to delegate when useful and to define each child's task and integrate its result. Delegation can be nested, parallel, and cross-roster where the host allows it. The catalog does not impose an Agent Forge depth or concurrency cap.

Delegation does not grant permissions. A child retains its own role, inherited client boundary, and task restrictions. A read-only agent can delegate read-only analysis; that does not give a descendant write access. Native permissions and concurrency controls remain those of the client.

## Hook ownership

Hook policy is canonical; each adapter maps it to the events and fields supported by its host. Runtime state associates a root session, parent, instance, and assignment when the event exposes those identifiers. Missing native identity is declared as a coverage gap rather than inferred. A child ending does not end the root session.

Deployment manages Agent Forge-owned hook groups and preserves foreign groups. Installation does not approve native hook trust or change user permissions. See [installation and recovery](installation-and-recovery.md) for the operational process and [compatibility](compatibility.md) for observed limitations.
