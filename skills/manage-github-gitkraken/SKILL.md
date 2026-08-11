---
name: manage-github-gitkraken
description: Perform safe Git history, staging, commit, branch, issue, pull-request, and repository workflows through validated GitKraken or GitHub capabilities. Use when work requires source-control evidence or an explicitly authorized external GitHub mutation.
---

# Manage GitHub and GitKraken

1. Inspect branch, status, upstream, remotes, and relevant history before mutation.
2. Preserve unrelated work; stage explicit paths or hunks.
3. Review the staged diff, run whitespace checks, and scan for secrets and generated artifacts.
4. Use coherent Conventional Commits unless the repository defines a stricter convention.
5. Treat push, merge, PR creation, release, branch deletion, and force operations as separately authorized external actions.
6. Prefer read-only GitKraken and GitHub tools for discovery.
7. Never rewrite published history or force-push.
