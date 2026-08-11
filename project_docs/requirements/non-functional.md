# Non-Functional Requirements

## Safety and integrity

- Zero error-severity diagnostics before deployment.
- Atomic replacement and transaction rollback on interruption.
- Hash-based ownership; unmanaged and modified files are preserved.
- Backups and state are isolated under `~/.agent-forge`.
- No secret values, credentials, real environment files, or provider tokens in source/state.
- No autonomous roster, skill, tool, manifest, or governance self-modification.

## Compatibility

- VS Code 1.104.0 or later (`AF010` otherwise).
- Windows paths use `USERPROFILE`; tests inject temporary profiles.
- Model policy defaults to inheritance when no validated mapping exists.
- Production behavior does not depend on preview hooks, nested subagents, or customization evaluations.

## Quality

- Strict TypeScript builds for core, CLI, and extension source.
- Package tests and evaluation fixture validation run with `npm test`.
- Every agent and skill has a forward evaluation fixture.
- Lifecycle and failure-mode fixtures are release gates.

## Usability and observability

- Every operation returns structured diagnostics and counts suitable for text, JSON, and extension UI.
- Diagnostic codes `AF001` through `AF012` remain stable.
- Preview lists target paths and hashes without artifact bodies or profile mutation.
