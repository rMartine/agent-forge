---
name: verify-implementation
description: Select and run proportional verification for a code, configuration, migration, documentation, or infrastructure change. Use after implementation, during QA, before handoff, or when claims need concrete build, test, lint, typecheck, or smoke-test evidence.
---

# Verify Implementation

1. Identify the changed behavior and its highest-risk failure modes.
2. Discover the repository's intended package manager and verification commands.
3. Run the smallest fast check first, then the authoritative suite required by risk.
4. Add or update tests that fail without the change and pass with it.
5. Inspect command exit codes and relevant output; partial commands are not proof.
6. Distinguish passed, failed, skipped, and blocked checks.
7. Return commands, results, uncovered risk, and reproducible next steps.
