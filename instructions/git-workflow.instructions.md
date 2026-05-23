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
- **Never write code before creating the branch** — the feature/hotfix branch MUST exist before any code changes. No exceptions. If you find yourself on `development` with uncommitted changes, stash them, create the branch, check it out, then pop the stash.
- **Always merge with `--no-ff`** — preserves branch history.
- **Delete feature branches after merge** — keep the branch list clean.
- **Conventional commits** — all commit messages follow the format: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `ci:`, `perf:`.

## Feature Flow

```
development ──┬── feature/xyz ──┬── development
              │   (work here)   │   (merge --no-ff)
```

0. **BEFORE writing any code**, create the feature branch. No exceptions.
1. Create `feature/<name>` from `development`.
2. Verify you are on the new branch (`git status` or GitKraken status).
3. Implement and commit on the feature branch.
4. Merge `feature/<name>` → `development` with `--no-ff`.
5. Delete the feature branch.

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

### Tool Resolution Protocol

Use GitKraken MCP tools first. Fall back to terminal `git` only for operations GitKraken does not support, or when the MCP server is unresponsive.

**GitKraken MCP — use for these operations:**
- Branch create, branch list
- Checkout
- Add, commit
- Push (basic, no flags)
- Status, diff, log, blame
- Stash save
- Worktree add, worktree list

**CLI `git` required — GitKraken MCP does not cover these:**
- `git merge` (ALL merges, including `--no-ff`)
- `git branch -d` / `git branch -D` (branch delete)
- `git pull`, `git fetch`
- `git tag` (create, list, delete)
- `git rebase`, `git cherry-pick`
- `git stash pop`, `git stash list`, `git stash drop`
- `git remote` management
- `git worktree remove`
- `git push --set-upstream` / `git push -u`

### Fallback Sequence

1. Attempt the operation with the GitKraken MCP tool.
2. If the tool errors or times out, retry once.
3. If it fails again, fall back to terminal `git`.
4. If `git` CLI is not available, follow the **Git CLI Not Found** protocol below.

### Git CLI Not Found

Before executing any terminal `git` command, verify git is installed:

```
git --version
```

- **If `git` is found:** proceed with the CLI command.
- **If `git` is not found:**
  1. Ask the user for permission to install git.
  2. If the user approves: install git and proceed.
  3. If the user declines: skip the git operation, log a warning (`⚠️ git not available — skipping version control for this step`), and continue without versioning.
- **Never auto-install git without explicit user consent.**

## Review Policy

Every branch merged to `development` or `main` requires an agent review from the appropriate reviewer before the merge executes. The reviewer is determined by the branch-type prefix.

### Reviewer Assignment

| Branch prefix       | Primary reviewer          | Secondary (if primary unavailable) |
|---------------------|---------------------------|-------------------------------------|
| `feature/*`         | `@principal-engineer`     | `@software-architect`               |
| `bugfix/*`          | `@principal-engineer`     | `@qa-engineer`                      |
| `hotfix/*`          | `@principal-engineer`     | `@cto`                              |
| `chore/*`           | `@principal-engineer`     | —                                   |
| `docs/*`            | `@technical-writer`       | `@principal-engineer`               |
| `refactor/*`        | `@software-architect`     | `@principal-engineer`               |
| `test/*`            | `@qa-engineer`            | `@principal-engineer`               |
| `infra/*`           | `@devops-engineer`        | `@principal-engineer`               |
| `security/*`        | `@cybersecurity-engineer` | `@principal-engineer`               |
| `design/*`          | `@ux-engineer`            | `@creative-director`                |
| `data/*`            | `@database-engineer`      | `@principal-engineer`               |
| `ml/*`              | `@ml-engineer`            | `@data-scientist`                   |

### Review Checklist (reviewer runs this before approving the merge)

- [ ] Branch compiles and tests pass locally (or CI green).
- [ ] Changes match the stated scope of the branch — no scope creep.
- [ ] No secrets, credentials, or PII in the diff.
- [ ] Conventional commit messages used throughout.
- [ ] No commented-out blocks of code left behind.
- [ ] Documentation updated where behavior changed.
- [ ] Knowledge base consulted if the branch touches a domain with prior incidents.
- [ ] If the branch introduces a new anti-pattern risk, file a KB entry via `@knowledge-engineer` before merging.

### Review Outcome

- **Approved** — reviewer merges the branch into `development` with `--no-ff`, deletes the source branch, and posts a one-line summary back to the orchestrator that requested the merge.
- **Changes requested** — reviewer returns a structured list of required changes to the author agent. Author fixes on the same branch and re-requests review.
- **Rejected** — reviewer escalates to `@cto` with rationale. Branch is not merged.

## Release Workflow (`development` -> `main`)

Cross-agent process for shipping `development` to production. Always user-approved.

1. **`@cto`** decides a release is due and opens the release workflow.
2. **`@cto`** delegates to **`@principal-engineer`**: confirm `development` is stable (full test suite green, no open blockers, all in-progress merges complete).
3. **`@principal-engineer`** returns: go/no-go with a list of merged items since the last release tag.
4. **`@cto`** delegates to **`@qa-engineer`**: run the release regression checklist on `development`.
5. **`@qa-engineer`** returns: pass/fail with evidence.
6. **`@cto`** delegates to **`@devops-engineer`**: run pre-release validation (`validate-env.*`, Docker Hub auth, DO target reachability, health checks defined, `deploy-prod.* --dry-run`).
7. **`@devops-engineer`** returns: pass/fail with evidence.
8. **`@cto`** delegates to **`@technical-writer`**: draft release notes from commit log since last tag.
9. **`@cto`** synthesizes steps 3, 5, 7, 8 into a release proposal (see `agents/cto.agent.md` -> Release Proposal) and presents to user.
10. **User approves** (mandatory). If the user does not approve, stop.
11. **`@cto`** (or the designated release owner) executes: tag `development` with the new version -> merge `development` -> `main` with `--no-ff` -> push -> `@devops-engineer` runs `deploy-prod.*` -> verify all per-app health checks.

If any health check fails after deploy, `@devops-engineer` initiates rollback per the rollback plan in the release proposal; `@cto` informs the user and routes remediation.

## Safety

- Agents **NEVER** merge to `main` without explicit user approval.
- Agents **NEVER** force-push to `main` or `development`.
- Agents **NEVER** rewrite history on shared branches (no rebase on `main` or `development`).
- Agents **NEVER** bypass the Review Policy - every merge to `development` or `main` has a reviewer.
