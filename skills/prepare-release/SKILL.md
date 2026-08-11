---
name: prepare-release
description: Assemble a release-readiness decision from requirements, change scope, tests, security, documentation, migration, deployment, monitoring, and rollback evidence. Use before publishing, deploying, merging a release branch, or preparing release notes.
---

# Prepare Release

1. Identify the exact version, commit, artifacts, environment, and user-visible changes.
2. Confirm requirement acceptance, build/tests, security disposition, documentation, migration safety, and rollback readiness.
3. Verify environment-variable names and operational dependencies without reading secret values.
4. Separate repository readiness from authorization to publish or deploy.
5. Block release for unresolved P0/P1 findings, missing rollback, failed required checks, or unknown artifact provenance.
6. Produce release notes, known risks, deployment steps, smoke checks, and rollback trigger.
