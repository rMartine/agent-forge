# Prompts and Hooks

## Prompts

Agent Forge does not manage legacy prompt files. `prompts/.gitkeep` and the obsolete shared prompts target were removed. Copilot agents, instructions and skills have distinct user locations. Codex agents, skills and native hook configuration have separate targets. The product-direction skill provides the primary conversation agent's procedure; it is not a legacy prompt file or an additional specialist.

Adding prompts later requires a manifest schema revision, a dedicated current VS Code prompt target, ownership coverage, collision tests, and diagnostics. It must not reuse a legacy `%APPDATA%/Code/User/prompts` abstraction.

## Hook sources and native events

The root `hooks` collection still describes optional Copilot artifacts targeting `~/.copilot/hooks`; it is empty in the current manifest. Codex product hooks are separately configured by manifest v4's `codex.productDevelopment`. Their maintained sources are [product-hooks.mjs](../../hooks/codex/product-hooks.mjs) and [product-session.mjs](../../hooks/codex/product-session.mjs). The direction skill receives those same scripts during generation, together with the roles and skill assignments derived from the manifest and external catalog.

The complete set of native events generated for this workflow is:

- `SubagentStart`: exact match on each selected agent type; registers the assignment and supplies its instructions, skill names, expected evidence and actual parent-session identifiers.
- `SubagentStop`: checks the evidence of a writing specialist. Read-only specialists return evidence in their response and the primary conversation agent registers it with `record-evidence --agent`.
- `Stop`: checks the primary conversation agent's record and accounts for missing specialist records, then closes the active product assignment.
- `Interrupt`: marks the active assignment interrupted without restarting it.
- `SessionEnd`: closes an existing session record, including one previously interrupted.

The configuration uses a ten-second timeout for start and stop events and three seconds for interruption and session closure. These are execution limits, not permission to continue after the user interrupts.

## Activation, evidence and failures

The primary conversation agent activates a temporary record only for an authorized software-product assignment, using its actual session identifier and the canonical absolute project directory. A missing or inactive record makes the product hooks inactive. Hook registration alone does not classify a conversation as product work. The primary agent deactivates the record when changing to an unrelated task; `Stop` also closes it after the evidence pass. If a client does not expose the necessary identifier, activation remains unverified rather than using an invented identifier.

The helper stores session records outside the repository and assistant configuration directories. It validates evidence structure, uses an exclusive lock and atomic replacement, and separates records by session and project. Artifact paths in evidence are references; the helper does not execute them or read their contents. Do not include secrets, full transcripts or sensitive payloads in the record.

Evidence records distinguish completed, blocked and interrupted work. Checks distinguish passed, failed, blocked and unexecuted observations; an empty set requires an explanation. A hook can request at most one continuation to account for missing evidence, and `stop_hook_active` prevents an additional request. A recorded blocker or interruption does not cause that continuation. Read-only specialists never need new write permissions to return their evidence.

Malformed input, invalid role configuration or unavailable storage produces a diagnostic and an empty hook result, allowing the turn to finish. Explicit helper commands return a nonzero exit code on failure. Lock acquisition is bounded; a stale lock requires evidence that its owning process ended before removing that specific temporary file. The scripts do not seize possibly active locks, loop indefinitely, modify product code or initiate external operations.

Hooks check that evidence is recorded and expose limitations; they do not establish that claims are true, that tests are sufficient or that the product meets its requirements. The primary conversation agent remains responsible for those judgments. Existing security, approval and ownership controls remain authoritative. No safety guarantee depends solely on a hook, and hook configuration is not a Windows security sandbox.

## Shared hook configuration and recovery

The current Codex destination is `~/.codex/hooks.json`. Agent Forge owns only its recorded event groups. Preview parses the existing document, verifies prior group fingerprints, retains other groups and top-level settings, and captures the resulting document plus the expected current file hash. Serialization may change formatting; preservation refers to unrelated configuration values and groups.

Apply verifies that the document has not changed since preview and reconstructs the expected ownership change from the ledger. Modified, removed or duplicated managed groups are conflicts. A desired group that already exists without matching ownership is an unmanaged collision. A new plan is required after concurrent document changes; Agent Forge does not assume ownership from matching text alone.

Status compares Agent Forge's owned groups independently of unrelated groups. Rollback restores the prior owned groups; cleanup and managed removal remove only the current owned groups while preserving later foreign additions. If Agent Forge originally created the file, removal deletes the file only when nothing besides the now-empty hook collection remains. Modified owned groups are preserved and reported instead of being replaced indiscriminately.

Explicit reconciliation of modified complete files does not apply to shared hook groups. Their recovery follows the group-ownership checks above. Backups and plan identifiers remain reviewable; the installer must not bypass drift by copying a fresh file over existing hooks.

## Client trust and verification

The client's review of trust for new or changed hooks remains required. Agent Forge does not approve its own hooks, alter Codex models, change sandbox policy or edit unrelated user configuration to bypass that review. Installing a configuration is distinct from observing the client execute it.

Required verification covers inactive conversations, known and unknown agent types, evidence from writing and read-only specialists, concurrency, malformed inputs, missing evidence, bounded continuation, interruption, session closure and preservation of unrelated groups through installation and recovery. Static fixtures and direct script tests establish only those tested conditions. Observed activation and behavior in new Desktop and VS Code sessions remain separate acceptance checks and must not be marked complete from fixture presence alone.
