---
description: Safe repository branching, staging, verification, and external Git controls
applyTo: "**"
---

# Git Workflow

- Inspect repository instructions, branch, status, upstream, remotes, and relevant history before mutation.
- Do not implement directly on main, master, or development.
- Preserve unrelated work and stage explicit paths or hunks.
- Before committing, review the staged diff, run `git diff --cached --check`, and scan for secrets, credentials, logs, caches, dependencies, and generated output.
- Use coherent Conventional Commits unless the repository defines a stricter convention.
- Push, merge, pull request, release, branch deletion, rebase, and history rewrite require the authority applicable to that repository. Never force-push by default.
