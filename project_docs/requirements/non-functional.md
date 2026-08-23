# Non-Functional Requirements

## Safety and integrity

- Zero error-severity diagnostics before deployment.
- Atomic replacement and transaction rollback on interruption.
- Grouped atomic rollback when either runtime fails.
- Hash-based ownership; unmanaged and modified files are preserved.
- Backups and state are isolated under `~/.agent-forge`.
- No secret values, credentials, real environment files, or provider tokens in source/state.
- No autonomous roster, skill, tool, manifest, or governance self-modification.

## Compatibility

- VS Code 1.104.0 or later (`AF010` otherwise).
- Windows paths use `USERPROFILE` and optional `CODEX_HOME`; tests inject temporary profiles for `.copilot`, `.codex`, and `.agents`.
- Model policy defaults to inheritance when no validated mapping exists.
- Production behavior does not depend on preview hooks, nested subagents, or customization evaluations.

## Quality

- Strict TypeScript builds for core, CLI, and extension source.
- Package tests and evaluation fixture validation run with `npm test`.
- Every agent and skill has a forward evaluation fixture.
- All 16 Codex agents and five bundles have forward fixtures.
- Lifecycle and failure-mode fixtures are release gates.

## Usability and observability

- Every operation returns structured diagnostics and counts suitable for text, JSON, and extension UI.
- Diagnostic codes `AF001` through `AF012` remain stable.
- Preview persists exact rendered bytes for apply while text/JSON output lists paths and hashes without printing artifact bodies.
