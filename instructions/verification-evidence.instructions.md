---
description: Proportional verification and evidence requirements
applyTo: "**/*.{ts,tsx,js,jsx,mjs,cjs,py,cs,java,kt,swift,sql,json,jsonc,yaml,yml,toml,ps1,sh}"
---

# Verification Evidence

- Identify the changed behavior and its highest-risk failure modes.
- Use the repository-selected package manager and authoritative build, typecheck, lint, test, migration, and smoke commands.
- Add or update tests when behavior changes.
- Report exact commands and distinguish passed, failed, skipped, and blocked checks.
- Do not describe a partial, mocked, or unavailable check as passing.
- Preserve verification output needed for the next handoff without committing logs or temporary artifacts.

Preserve the distinction between creating test infrastructure at product startup, checking an individual change, and meeting integration or release requirements. Record requirement origin and current applicability; an unknown origin is not proof that the requirement came from a template. Repeat or expand checks only when the change, a failure or a concrete unresolved concern requires it. A documentation-only instruction review does not itself authorize product test execution.
