---
description: "Use when: creating branches, committing code, merging, version control, git operations, feature branching, hotfixes, releases, pull requests, code integration"
---

# Git Workflow

Two-environment branching strategy: Dev and Prod. No staging.

## Branches

| Branch | Environment | Purpose |
|--------|-------------|---------|
| `main` | Production | Stable, deployed code. Protected. |
| `development` | Development | Integration branch. All feature work merges here first. |
| `feature/*` | — | Short-lived branches from `development` for new work. |
| `hotfix/*` | — | Emergency branches from `main` for production-critical fixes. |

## Rules

- **Never commit directly to `main` or `development`** — always through a branch.
- **Always merge with `--no-ff`** — preserves branch history.
- **Delete feature branches after merge** — keep the branch list clean.
- **Conventional commits** — all commit messages follow the format: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `ci:`, `perf:`.

## Feature Flow

```
development ──┬── feature/xyz ──┬── development
              │   (work here)   │   (merge --no-ff)
```

1. Create `feature/<name>` from `development`.
2. Implement and commit on the feature branch.
3. Merge `feature/<name>` → `development` with `--no-ff`.
4. Delete the feature branch.

## Hotfix Flow

```
main ──┬── hotfix/xyz ──┬── main ──── (also merge to development)
       │   (fix here)   │
```

1. Create `hotfix/<name>` from `main`.
2. Apply fix and commit.
3. Merge `hotfix/<name>` → `main` with `--no-ff`. **Requires user approval.**
4. Merge `hotfix/<name>` → `development` with `--no-ff`.
5. Delete the hotfix branch.

## Release Flow

```
development ──── main
(merge --no-ff, requires user approval)
```

1. `@principal-engineer` confirms `development` is stable (tests pass, no blockers).
2. `@cto` requests user approval to merge `development` → `main`.
3. Merge with `--no-ff`. **User MUST approve before this merge executes.**
4. Tag the release on `main` with a version number.

## Agent Responsibilities

| Agent | Git Responsibility |
|-------|--------------------|
| `@cto` | Approves releases (`development` → `main`). Always confirms with user first. |
| `@principal-engineer` | Creates feature branches from `development`. Merges completed features to `development`. |
| `@qa-engineer` | Verifies on `development` before release approval. |
| `@devops-engineer` | Manages deployment configs per branch. |
| All coding agents | Commit work to the current feature branch. Never merge. |

## Tools

- **Preferred**: GitKraken MCP tools (`gitkraken/*`) for all git operations.
- **Fallback**: Terminal `git` commands when GitKraken MCP is unavailable.
- Check GitKraken availability first. If tools are not responding, fall back to terminal.

## Safety

- Agents **NEVER** merge to `main` without explicit user approval.
- Agents **NEVER** force-push to `main` or `development`.
- Agents **NEVER** rewrite history on shared branches (no rebase on `main` or `development`).
