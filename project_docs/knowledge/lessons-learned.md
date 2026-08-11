# Lessons Learned

## Runtime assumptions must be tested

The original hierarchy required nested subagent invocation even though VS Code disables it by default. Lifecycle handoffs and depth-one worker invocation now work without that setting.

## File-format portability can create duplicate identities

VS Code discovers `.claude/agents`; keeping parallel Copilot and Claude definitions caused overlapping names and divergent policy. A single canonical VS Code roster is safer and easier to evaluate.

## Prompt restrictions are not authorization

Broad MCP wildcards and prose restrictions do not enforce provider permissions. Capability resolution now emits exact locally present tool IDs and preserves external OAuth, scopes, trust prompts, and user approval as the security boundary.

## Deployment needs ownership, not mirroring

Raw copying and broad deletion cannot distinguish managed files from user customizations. The ownership ledger, content hashes, backups, collision gate, and modified-file preservation are required P0 behavior.

## Optional infrastructure must stay optional

The knowledge workflow previously implied a mandatory PostgreSQL container. Local Markdown is now the ordinary path; PostgreSQL is a progressive reference only when an existing knowledge service is relevant.

## Source and deployed configuration have different lifecycles

Tool/model availability varies by VS Code profile and Copilot plan. Runtime overlays belong on rendered copies so local selection can change without dirtying the repository.
