# Lessons Learned

## Runtime assumptions must be tested

The original hierarchy required nested subagent invocation even though VS Code disables it by default. Lifecycle handoffs and depth-one worker invocation now work without that setting.

## Discovery scope, not file format alone, creates duplicate identities

VS Code discovers `.claude/agents`, workspace overrides can rediscover canonical sources, and Codex walks project/user customization locations. Canonical source directories must not also be runtime discovery roots when global deployment is active.

## Prompt restrictions are not authorization

Broad MCP wildcards and prose restrictions do not enforce provider permissions. Capability resolution now emits exact locally present tool IDs and preserves external OAuth, scopes, trust prompts, and user approval as the security boundary.

## Deployment needs ownership, not mirroring

Raw copying and broad deletion cannot distinguish managed files from user customizations. The ownership ledger, content hashes, backups, collision gate, and modified-file preservation are required P0 behavior.

## Optional infrastructure must stay optional

The knowledge workflow previously implied a mandatory PostgreSQL container. Local Markdown is now the ordinary path; PostgreSQL is a progressive reference only when an existing knowledge service is relevant.

## Source and deployed configuration have different lifecycles

Tool/model availability varies by VS Code profile and Copilot plan. Runtime overlays belong on rendered copies so local selection can change without dirtying the repository.

## Cross-runtime reuse needs compilation, not copied prompts

Copilot Markdown frontmatter encodes tools, handoffs, visibility, and subagent invocation that do not belong in Codex TOML. A dedicated renderer can preserve role knowledge while discarding runtime-only controls and enforcing Codex no-delegation overlays.

## Progressive skill packaging controls context cost

Seventeen useful source workflows would consume too much Codex skill-description budget as independent entries. Five trigger-complete bundles preserve specialization while references load only when the task requires them.

## Immutable preview must contain the bytes being approved

A preview ID is meaningful only if apply reads the exact persisted content and hashes. Regenerating after confirmation creates a time-of-check/time-of-use gap and makes grouped rollback evidence unreliable.

## State migration is a transaction

Inferring legacy ownership is safe only when every old target proves its runtime. Back up the v1 ledger, reject ambiguous paths, and persist v2 only after the profile transaction succeeds.
