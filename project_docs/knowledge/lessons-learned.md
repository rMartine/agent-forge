# Lessons Learned

This file catalogs lessons learned during development of Agent Forge. Entries are added by `@knowledge-engineer` after any significant error, incident, or architectural insight.

---

## 2026-04-08 — Disabled Sub-Agent Nesting Broke Architecture Silently

- **What happened**: VS Code's `chat.subagents.allowInvocationsFromSubagents` defaults to `false`. Agent Forge was designed around a multi-level org chart (CTO → Principal Engineer → Backend Developer), but this setting was never enabled. All work defaulted to `@principal-engineer` solo, specialists were never exercised, and quality degraded without any visible error.
- **Root cause**: No validation that the required platform setting was enabled. The system degraded silently — the architecture appeared functional while operating in a fundamentally broken state.
- **Fix applied**: Added opt-in notification on extension activation + palette command (`Agent Forge: Enable Sub-Agent Nesting`) to enable the setting with user consent.
- **Prevention**: Always validate critical platform prerequisites on activation. Silent degradation is worse than a loud error. Any capability the system depends on must be checked at startup and surfaced clearly if missing.
- **Category**: config

---

## 2026-04-08 — GitKraken MCP Server Covers Only 55% of Git Operations

- **What happened**: The `git-workflow.instructions.md` stated "prefer GitKraken MCP." GitKraken MCP lacks merge (the #1 most used operation in the workflow), branch delete, pull, fetch, tags, and stash pop. Agents following the instructions would silently fail on nearly half of all git operations.
- **Root cause**: Tool capability assessment was never performed before the instruction was written. The preference assumed full coverage of git operations without verifying the tool's actual scope.
- **Fix applied**: Created a detailed gap matrix of supported vs. unsupported GitKraken MCP operations. Updated `git-workflow.instructions.md` with an explicit tool resolution protocol that routes operations to either GitKraken MCP or CLI git based on actual capability.
- **Prevention**: Before codifying a tool preference in shared instructions, audit the tool's actual capabilities and create a gap matrix. Never endorse a tool as the default for a category of operations without verifying coverage of all common operations in that category.
- **Category**: tooling

---

## 2026-04-08 — Git Branch Created After Code Instead of Before

- **What happened**: Agents were observed writing code directly on `development` and creating the feature branch afterward. The git-workflow instructions listed "create branch" as step 1 but did not explicitly forbid coding without a branch.
- **Root cause**: Instructions stated the sequence but didn't enforce it as a hard rule. Agents optimize for speed and may skip setup steps when only the happy path is documented. Without an explicit prohibition, the wrong behavior is a valid interpretation.
- **Fix applied**: Added an explicit hard rule to `git-workflow.instructions.md`: "Never write code before creating the branch." Added Step 0 to the feature flow. Added a recovery path (stash → checkout new branch → pop stash) for when code has already been written on the wrong branch.
- **Prevention**: For critical sequencing, state both the DO and the explicit DON'T. Instructions must include prohibitions, not just the happy path. Recovery paths should be documented for foreseeable violations.
- **Category**: process

---

## 2026-04-08 — Knowledge Repository Infrastructure Never Deployed

- **What happened**: The knowledge-engineer agent was designed around a Docker-based PostgreSQL repository (`knowledge-repo/`), but the Docker stack was never created or deployed. The KE silently fell back to writing flat markdown files in `project_docs/knowledge/`. No agent flagged that the central KB was missing.
- **Root cause**: Infrastructure prerequisites were documented in the agent file but never bootstrapped. No startup check verified that the Docker stack was running.
- **Fix applied**: Created `knowledge-repo/` with `docker-compose.yml`, init SQL, bootstrapped the container. Migrated local entries to PostgreSQL.
- **Prevention**: Infrastructure dependencies in agent files must have a corresponding bootstrap step. Add health checks or startup verification for required external services.
- **Category**: infrastructure
- **KB entry**: type: lesson-learned, severity: high, domains: [infrastructure], tags: [docker, postgresql, knowledge-base, silent-degradation]

---

## 2026-04-08 — Logo Generated as Hand-Crafted SVG Instead of Image Model Pipeline

- **What happened**: The logo icon was changed by having the principal engineer hand-write SVG markup directly. The graphic-designer agent was never invoked. The intended pipeline (creative-director selects model → graphic-designer downloads via Ollama → generates image locally) was completely bypassed.
- **Root cause**: Sub-agents weren't working (setting disabled), so the PE did everything solo. Additionally, the graphic-designer agent lacked explicit Ollama-first workflow, and the creative-director agent had no model selection step in the ideation process.
- **Fix applied**: Added Step 7 "Select image model" to creative-director ideation process. Updated graphic-designer stack to prefer Ollama, added model download section, and model management now references creative-director's selection. Added Ollama prerequisite check to extension activation.
- **Prevention**: Creative assets must go through the proper pipeline (CD → GD with model). Never bypass specialist agents by having generalists produce creative output directly.
- **Category**: process
- **KB entry**: type: lesson-learned, severity: medium, domains: [infrastructure], tags: [ollama, image-generation, process, agent-bypass, logo]
