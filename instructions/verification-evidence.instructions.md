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
