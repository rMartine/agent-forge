---
name: verify-implementation
description: Select and run proportional verification for a code, configuration, migration, documentation, or infrastructure change. Use after implementation, during QA, before handoff, or when claims need concrete build, test, lint, typecheck, or smoke-test evidence.
---

# Verify Implementation

1. Identify the changed behavior and its highest-risk failure modes.
2. Discover the repository's intended package manager and verification commands.
3. Determine the source, project, phase and execution condition of each applicable requirement. Run the checks required for the change and current phase; preserve distinct startup infrastructure, integration and release requirements. Do not remove an extensive suite because of cost or impose it on every task.
4. Add or update regression checks when required by the changed behavior and project rules. A documentation-only review does not authorize running the documented procedures or product test suites.
5. Inspect command exit codes and relevant output; partial commands are not proof.
6. Distinguish passed, failed, skipped, and blocked checks.
7. Return commands, results, uncovered risk, and reproducible next steps.
