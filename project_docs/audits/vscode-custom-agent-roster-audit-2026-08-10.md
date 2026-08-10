# VS Code Custom Agent Roster Audit

**Audit date:** 2026-08-10
**Audited commit:** `a959a4d`
**Audit branch:** `codex/vscode-agent-audit`
**Target runtime:** GitHub Copilot custom agents in Visual Studio Code
**Audit status:** Complete; remediation not yet implemented

## 1. Executive assessment

The roster has a strong domain taxonomy and generally clear specialist boundaries, but it is **not ready for reliable deployment to current VS Code as-is**.

The source inventory is internally consistent: all 24 manifest entries resolve to files, every tool-profile reference exists, and all 29 delegation edges and 49 handoff edges point to real agents. The main risks are outside that structural layer:

1. The installer deploys `.agent.md` files to `%APPDATA%/Code/User/prompts`, while current VS Code documents `~/.copilot/agents` as the user-level custom-agent location. Agent Host explicitly reads user agents from `~/.copilot/agents`.
2. The required CTO → Principal Engineer → specialist hierarchy depends on nested subagents, but VS Code disables nested subagent invocation by default. The current script deployment does not enable that setting, and the repository's extension command that would enable it is not installed by the current installer.
3. All 24 Copilot agents have parallel Claude-format definitions with the same names under `.claude/agents`. Current VS Code also discovers Claude-format agents there, so this repository can load overlapping definitions with different tools, skills, and model policies.
4. Tool access is over-broad for most roles and under-specified for the roles that require MCP. Missing tools are ignored by VS Code, so bad MCP names can degrade silently.
5. No Copilot agent declares a model. All agents inherit the current picker selection, while the parallel Claude roster uses a separate Sonnet/Haiku/inherit policy.
6. Only three user-facing entry points exist. Twenty-one specialists are hidden and depend on correct coordinator behavior.
7. Several bodies reference capabilities that are not deployed for VS Code: `frontend-design`, `pptx`, `mcp__canva__*`, Claude-in-Chrome tools, and Docker MCP assumptions.
8. The shared governance layer encourages agents to modify their own definitions and tool access. That is unsafe for a centrally managed user-level roster and makes behavior non-reproducible.

**Readiness verdict:** `NO-GO` for broad deployment until the P0 items in section 11 are resolved. The roster is suitable for a controlled pilot after those changes and a diagnostics-based smoke test.

## 2. Scope and evidence

This audit covers:

- 24 Copilot source agents under `agents/`
- 24 Claude-format derived agents under `.claude/agents/`
- `agent-forge.manifest.jsonc`
- `config/common.toolsets.jsonc`
- three skills under `skills/`
- five shared instruction files under `instructions/`
- PowerShell deployment and MCP scripts
- handoff and subagent topology
- current official VS Code custom-agent, subagent, skill, tool, and MCP behavior

Evidence was gathered from repository files, a read-only graph validator, manifest/file consistency checks, installer dry-run behavior, and current official VS Code documentation.

### 2.1 Baseline metrics

| Measure | Result |
|---|---:|
| Copilot `.agent.md` files | 24 |
| Manifest agent entries | 24 |
| Missing or unmanifested Copilot agents | 0 |
| Claude-format agents with overlapping names | 24 |
| User-visible Copilot entry points | 3 |
| Hidden/subagent-only Copilot agents | 21 |
| Orchestrator agents | 3 |
| Delegation edges | 29 |
| Invalid delegation targets | 0 |
| Handoff edges | 49 |
| Invalid handoff targets | 0 |
| Agents with a Copilot `model` field | 0 |
| Tool profiles | 4 |
| Deployable skills | 3 |
| Shared instruction files | 5 |
| Prompt files / agent hooks / roster eval suites | 0 / 0 / 0 |

## 3. Current system design

### 3.1 Source-of-truth model

`agents/*.agent.md` is intended to be the Copilot source of truth. The manifest assigns each agent a category, nullable model, and one of four symbolic tool profiles. `scripts/install.ps1` expands the symbolic profile into a flat VS Code tool list before copying each agent.

The repository also keeps a Claude Code representation under `.claude/agents`. The conversion script adds Claude-specific model, skill, and MCP mappings. These two representations now overlap inside VS Code because VS Code can discover both formats.

### 3.2 Current entry points

Only these agents appear in the picker by default:

| Entry point | Invocation behavior | Intended responsibility |
|---|---|---|
| `cto` | User-visible; `disable-model-invocation: true` | Single strategic front door and top-level router |
| `principal-engineer` | User-visible; subagent-capable | Implementation coordinator and code-quality owner |
| `creative-director` | User-visible; subagent-capable | Product vision, brand, scope, and design coordinator |

Every other agent uses `user-invocable: false` and is therefore hidden from the picker.

### 3.3 Delegation topology

| Coordinator | Allowed subagents | Count |
|---|---|---:|
| `cto` | creative-director, requirements-engineer, software-architect, project-manager, principal-engineer, cybersecurity-engineer, knowledge-engineer, technical-writer, qa-engineer, devops-engineer | 10 |
| `principal-engineer` | backend-developer, frontend-developer, mobile-engineer, dotnet-engineer, desktop-app-engineer, database-engineer, devops-engineer, qa-engineer, ml-engineer, data-scientist, cybersecurity-engineer, ux-engineer, technical-writer, knowledge-engineer, xr-engineer, digital-twin-engineer, agentic-systems-engineer | 17 |
| `creative-director` | ux-engineer, graphic-designer | 2 |

This is a coherent organizational graph, but the CTO path has a runtime flaw. When the user selects CTO, CTO can invoke Principal Engineer as a subagent; Principal Engineer is then a nested subagent and cannot invoke its specialists unless `chat.subagents.allowInvocationsFromSubagents` is enabled. The VS Code default is `false`.

### 3.4 Handoff topology

Handoffs are structurally valid and default to user-controlled submission because no handoff sets `send: true`. That is a good safety default. However:

- CTO has no handoffs and relies entirely on programmatic delegation.
- Handoff prompts are mostly generic and do not name an artifact, acceptance gate, relevant paths, or expected verification evidence.
- Seven implementation specialists hand off directly to QA, while shared governance says QA access should flow through CTO or Principal Engineer. Handoffs are user actions rather than subagent calls, but the written policy does not make this distinction clear enough.
- QA's “back to originating specialist” handoff actually targets Principal Engineer. The label and target disagree.
- No handoff selects a model, so the destination uses its own model or the current picker selection.
- Agent names are case-sensitive. Current lowercase identifiers are consistent, but duplicate Claude/Copilot identities make resolution ambiguous inside this repository.

## 4. Per-agent audit

Legend: **Picker** means visible in the VS Code agent picker; **Hidden** means `user-invocable: false`; **Inherit** means no Copilot `model` field; **no explicit skills** means the three installed skills are globally discoverable but not role-bound.

### 4.1 Leadership and architecture

| Agent | Existing role and boundary | Entry/model | Routes | Tools/skills | Disposition and recommendation |
|---|---|---|---|---|---|
| `cto` | Strategic intake, decomposition, organizational routing, release proposals, and synthesis. Must not code, design systems, or manage backlog. | Picker; cannot be model-invoked; Inherit | Delegates to 10 leads; no handoffs | `orchestrator`; no explicit skills | **Redesign.** It is too operational for a router: every turn attempts KB health checks, Todo mutation, and lesson retrieval. Make it a read-mostly router with handoffs to visible leads. Remove mandatory Docker/Todo writes and the required nested implementation path. |
| `principal-engineer` | Implementation lead, code-quality owner, technical triage, Git coordination, and specialist coordinator. Defers architecture to Software Architect. | Picker; Inherit | Delegates to 17 specialists; no handoffs | `orchestrator`; no explicit skills | **Keep, major refinement.** Make this the primary implementation entry so it remains a main agent and can invoke workers one level deep. Move repository Git policy out of the persona. Fix Python and non-React routing contradictions. Require exact verification evidence at completion. |
| `project-manager` | Backlog, prioritization, sprint/status artifacts, risks, capacity, and stakeholder reporting. Must not make technical decisions. | Hidden; Inherit | Handoffs to Principal and Architect | `all-builtins`; no explicit skills | **Keep, refine.** Consider an optional visible entry. Use planning/document tools, not unrestricted code edit/terminal. Move templates to a delivery-planning skill. |
| `software-architect` | Architecture, ADRs, boundaries, platform selection, data residency, integration, and migration planning. | Hidden; Inherit | Handoffs to Principal and DevOps | `all-builtins`; no explicit skills | **Keep and promote.** Architecture is a natural user-selected phase. Use read/search/web plus documentation editing, require repository evidence, add threat-boundary and operability checks, and keep implementation outside the role. |

### 4.2 Engineering

| Agent | Existing role and boundary | Entry/model | Routes | Tools/skills | Disposition and recommendation |
|---|---|---|---|---|---|
| `backend-developer` | Node.js/TypeScript APIs, workers, queues, contracts, and tests. Explicitly excludes Python, Go, and .NET. | Hidden; Inherit | Handoffs to Principal, QA, Database | `all-builtins`; no explicit skills | **Keep but rename or broaden.** `node-backend-developer` matches reality. Otherwise add Python/Go coverage or specialists. Align Principal routing. |
| `frontend-developer` | React, Next.js, Tailwind, server actions, forms, i18n, and web UI. Explicitly excludes Vue, Svelte, Solid, Angular, and vanilla JS. | Hidden; Inherit | Handoffs to Principal and QA | `all-builtins`; no explicit skills | **Keep but rename or broaden.** `react-frontend-developer` is more honest. Align Principal routing and clarify browser E2E ownership with QA. |
| `database-engineer` | PostgreSQL, Drizzle schemas, migrations, indexes, seeds, catalogs, and query design. | Hidden; Inherit | Handoff to Principal | `all-builtins`; no explicit skills | **Keep, refine.** Require repository-first database/ORM detection. Add approval for destructive migration/data operations and require backup/rollback evidence. |
| `devops-engineer` | Containers, env policy, scripts, registries, cloud provisioning, observability, health checks, and deployment. | Hidden; Inherit | Handoff to Principal | `devops`; no explicit skills | **Keep, fix before deployment.** Tool profile references unprovisioned/legacy MCP names. Make it a visible operations entry, prefer CLI through `execute`, add only verified MCPs, and move blanket “no GitHub Actions” policy to the target repository. Preserve cloud-cost and production approval gates. |
| `dotnet-engineer` | Full .NET stack: WPF, Avalonia, MAUI, WinUI, ASP.NET, Blazor, EF Core, packaging, and performance. | Hidden; Inherit | Handoffs to Principal and QA | `all-builtins`; no explicit skills | **Keep.** Clear boundary against non-.NET desktop. Add target-framework detection and platform-specific build/package verification. |
| `desktop-app-engineer` | Non-.NET desktop across C++/Qt, Rust/Tauri, Python/Qt, Go/Fyne, GTK, packaging, and system integration. | Hidden; Inherit | Handoffs to Principal and QA | `all-builtins`; no explicit skills | **Keep, monitor breadth.** Split by runtime only if evals show quality loss. Add OS-specific test and packaging gates. |
| `mobile-engineer` | Expo/React Native primary plus Swift, Kotlin, Flutter, store submission, device APIs, performance, offline, auth, and push. | Hidden; Inherit | Handoffs to Principal and QA | `all-builtins`; no explicit skills | **Refine or split.** Prefer an Expo-first agent for the dominant workflow, with native and store-release skills/agents when needed. Add platform build and device validation gates. |
| `ml-engineer` | Training, fine-tuning, evaluation, optimization, serving, ONNX, and GPU profiling. Description excludes agent orchestration/RAG/MCP. | Hidden; Inherit | Handoffs to Principal and QA | `all-builtins`; no explicit skills | **Fix contradiction.** The body still claims “LLM-powered AI agents” and has an “LLM / AI Agents” section. Remove agent-application work; add reproducibility, lineage, baseline, and model-card requirements. |
| `data-scientist` | EDA, statistics, visualization, insights, notebooks, dashboards, cleaning, and lightweight ML. | Hidden; Inherit | Handoffs to Principal and ML | `all-builtins`; no explicit skills | **Keep.** Use a notebook/data profile without unrestricted application edits. Add PII handling and reproducible-output requirements. |
| `cybersecurity-engineer` | Audit-only security review, scanning, threat modeling, compliance, incidents, and structured findings. Must not fix. | Hidden; Inherit | Handoff to Principal | `all-builtins`; no explicit skills | **Keep and expose as optional review entry.** Full edit tools contradict audit-only scope. Use read/search/web and scoped scanner execution. Add confidence and false-positive handling. |
| `qa-engineer` | Unit/integration/E2E, regression, coverage, contracts, fixtures, visual/a11y/performance tests, and defects. | Hidden; Inherit | Two handoffs to Principal | `all-builtins`; no explicit skills | **Keep and expose as review entry.** Grant test edit, execute, read/search, and browser/Playwright; prohibit general product-code edits. Repair the misleading return-handoff label. Require failing-then-passing evidence. |
| `xr-engineer` | Unity, Unreal, WebXR, spatial input, headset SDKs, rendering budgets, 3D pipelines, and distribution. | Hidden; Inherit | Handoffs to Principal, QA, DevOps | `all-builtins`; no explicit skills | **Keep, refine.** Move engine templates into skills. Add a hardware/platform matrix and report headset validation as blocked when hardware is unavailable. |
| `digital-twin-engineer` | Twin semantics, IoT/OT ingestion, protocols, time-series state, simulation, synchronization, and control safety. | Hidden; Inherit | Handoffs to Principal, XR, ML, Database, Security | `all-builtins`; no explicit skills | **Keep, refine.** Preserve read-mostly/control approval and mandatory security review for control-class outputs. Move protocol recipes into skills. |
| `agentic-systems-engineer` | Agent graphs, RAG, MCP, memory, evals, observability, routing, cost/latency, and human approvals. Defers training to ML. | Hidden; Inherit | Handoffs to Principal, ML, Security, DevOps | `all-builtins`; no explicit skills | **Keep, refine.** Strong definition. Clarify it may recommend model classes while ML owns training/serving. Make prompt/version traces and eval results required deliverables. |

### 4.3 Design, documentation, and knowledge

| Agent | Existing role and boundary | Entry/model | Routes | Tools/skills | Disposition and recommendation |
|---|---|---|---|---|---|
| `creative-director` | Product concept, positioning, brand, naming, MVP scope, prioritization, and visual direction. | Picker; Inherit | Delegates to UX/Graphic; handoffs to Requirements, Architect, PM | `orchestrator`; no explicit skills | **Keep, refine.** Its one-level design delegation works when directly selected. Reduce implementation tools, separate strategy from production procedures, and require feasibility evidence before locking scope. |
| `graphic-designer` | Raster generation, Canva, HTML/CSS posters, stock imagery, branding, mockups, and asset logging. | Hidden; Inherit | Handoffs to UX and Creative | `all-builtins`; uses `search-stock-images`; references missing `frontend-design`, `pptx`, and unavailable `mcp__canva__*` | **Fix before use.** Split image generation, Canva, presentations, and stock workflows into skills. Use VS Code MCP naming (`canva/*`) after provisioning. Use a vision-capable chat model for visual review. |
| `ux-engineer` | Design systems, accessibility, interaction, prototypes, tokens, usability, responsive behavior, and specifications; avoids production code. | Hidden; Inherit | Handoffs to Principal, Creative, Graphic | `all-builtins`; references missing `frontend-design` and unavailable Canva tools | **Keep, fix capabilities.** Add a verified design/prototype skill and scoped Canva access or remove those promises. Use browser plus prototype/document editing rather than full Git/terminal access. |
| `technical-writer` | README, API docs, guides, changelog, runbooks, onboarding, OpenAPI, troubleshooting, and release notes. Must not fix code. | Hidden; Inherit | Handoff to Principal | `all-builtins`; no explicit skills | **Keep.** Use read/search and documentation editing; allow execute only for doc validation. Add source-verification and link-check gates. |
| `knowledge-engineer` | Institutional memory, KB querying, post-mortems, Docker/Postgres KB management, and roster self-improvement. | Hidden; Inherit | Handoff to Principal | `knowledge`; overlaps global `query-knowledge-base` | **Redesign.** It contains stale “18 of 21” port facts, assumes unprovisioned Docker MCP, and can modify other agents. Split read-only retrieval from curated writes. Replace autonomous edits with maintainer-reviewed patches. |
| `requirements-engineer` | Interviews, user stories, acceptance criteria, NFRs, dependencies, open questions, and MVP scoping. | Hidden; Inherit | Handoffs to Architect, PM, Creative | `all-builtins`; no explicit skills | **Keep and promote, or merge with product discovery.** Use ask/read/search/web and document edit, not code execution. Add traceability from requirement to validator. |

## 5. Role coverage, overlaps, and gaps

### 5.1 Strong boundaries

- .NET versus non-.NET desktop ownership is explicit.
- Data Scientist versus ML Engineer is mostly clear.
- ML Engineer versus Agentic Systems Engineer is clear in frontmatter.
- Digital Twin Engineer versus XR Engineer correctly separates operational state from visualization.
- UX Engineer versus production platform engineers is explicit.
- Cybersecurity Engineer and Technical Writer correctly identify themselves as audit/documentation roles rather than remediation agents.

### 5.2 Contradictions and routing defects

| Finding | Impact | Recommended fix |
|---|---|---|
| Principal routes Node.js/Python services to Backend, but Backend is Node/TypeScript-only. | Python backend work is rejected or misrouted to Data Science/ML. | Rename to `node-backend-developer` and add Python backend coverage, or broaden the role. |
| Principal routes React/Vue/Angular to Frontend, but Frontend is React/Next-only. | Non-React work is routed to an incompatible role. | Rename to `react-frontend-developer` or broaden with stack-specific skills. |
| ML frontmatter excludes agent applications, but its body claims LLM-agent ownership. | ML and Agentic Systems can both claim the same work. | Remove agent-application sections from ML. |
| QA “back to originating specialist” handoff targets Principal. | UI label misrepresents the action. | Rename to “Return defect to Principal for routing” or target a real specialist. |
| CTO is “the single entry,” but Principal and Creative are also visible. | Written mental model and picker disagree. | Document multiple entries or make only the true router visible; phase-specific entries are recommended. |
| QA policy says specialists escalate through PE/CTO, while seven specialists offer direct QA handoffs. | Governance appears contradictory. | Explicitly distinguish user handoffs from subagent delegation, or route QA buttons to PE. |

### 5.3 Missing or weak capabilities

- No dedicated Python backend/web-service role.
- No Go backend role.
- No non-React web role despite Principal promising broader coverage.
- No lightweight correctness/maintainability reviewer before specialized QA/security review.
- No executable prompt/agent evaluation harness.
- No owner for VS Code customization diagnostics and deployment verification.
- No consistent per-agent data-sensitivity classification.

Do not add an agent for every gap. Prefer a skill when the gap is a procedure inside an existing responsibility; add an agent only when it needs a distinct persona, tool boundary, model policy, or independent review perspective.

## 6. Handoff and workflow redesign

### 6.1 Recommended entry topology

Avoid making success depend on nested subagents. Keep one-level coordinator/worker delegation and use user-controlled handoffs between phases.

Recommended visible entries:

1. `cto` — optional strategic router and synthesis.
2. `creative-director` — product/brand discovery.
3. `requirements-engineer` — requirements and acceptance criteria.
4. `software-architect` — architecture and ADRs.
5. `principal-engineer` — implementation coordinator and primary coding entry.
6. `qa-engineer` — testing/review entry.
7. `cybersecurity-engineer` — security review entry.
8. `devops-engineer` — operations/deployment entry.

```text
User
  ├─ CTO (optional router)
  ├─ Creative Director → UX / Graphic Designer
  ├─ Requirements Engineer
  ├─ Software Architect
  ├─ Principal Engineer → implementation specialists
  ├─ QA Engineer
  ├─ Cybersecurity Engineer
  └─ DevOps Engineer

Phase transitions use handoff buttons.
Worker execution uses one-level subagents.
No required coordinator → coordinator → worker recursion.
```

CTO should hand off to Principal Engineer rather than invoke it as a subagent for implementation. Principal then runs as the main agent and can invoke workers without recursive nesting.

### 6.2 Handoff contract

Every handoff should include the artifact/decision, relevant paths, unresolved questions, acceptance criteria, evidence already gathered, and expected destination output. Keep `send: false` unless automatic submission is intentionally safe.

```yaml
handoffs:
  - label: Implement approved design
    agent: principal-engineer
    prompt: >-
      Implement project_docs/architecture/ADR-004.md. Preserve its constraints,
      add the required tests, and report exact verification commands and results.
    send: false
```

## 7. Tool audit

### 7.1 Existing profiles

| Profile | Agents | Expanded capability |
|---|---:|---|
| `all-builtins` | 19 | read, edit, search, execute, web, browser, todo, vscode, ask, GitKraken MCP |
| `orchestrator` | 3 | all-builtins plus agent/subagent invocation |
| `devops` | 1 | all-builtins plus DigitalOcean, Docker Desktop, and GitHub MCP globs |
| `knowledge` | 1 | all-builtins plus Docker Desktop MCP glob |

### 7.2 Findings

1. Least privilege is absent: planning, audit, documentation, and strategy roles receive edit, execute, browser, VS Code mutation, and Git MCP access.
2. The repository does not provision the VS Code servers referenced by `gitkraken/*`, `com_digitaloc/*`, `com_docker_do/*`, or `com_github_gi/*`. The MCP installer targets Claude Code, not VS Code.
3. Graphic Designer and UX promise Claude-style `mcp__canva__*`, but Copilot grants no Canva server. Current VS Code uses configured server names such as `canva/*`.
4. Claude intentionally removed Docker MCP in favor of CLI, while Copilot toolsets still reference Docker MCP.
5. QA has no deliberate Playwright mapping. Built-in browser tools may be sufficient and should be selected intentionally.
6. `ask` and `todo` should be validated against the target VS Code diagnostics/current identifiers (`vscode/askQuestions` and current todo tooling).
7. Every agent receives GitKraken, adding noise and mutation capability to read-only roles.

### 7.3 Recommended profiles

| Profile | Intended roles | Capability shape |
|---|---|---|
| `coordinator-readonly` | CTO, Creative | read, search, web, ask/todos, agent; optional document edit |
| `planning-docs` | Requirements, PM, Architect | read, search, web, ask, documentation edit; scoped execute |
| `implementer` | Platform/DB/ML/XR/Twin/Agentic workers | read, search, edit, execute, todos, ask; browser only where relevant |
| `test-engineer` | QA | read, search, test edit, execute, browser/Playwright; no unrestricted product-code edits |
| `audit-readonly` | Cybersecurity | read, search, web, scoped scanner execution; no edit |
| `design` | UX, Graphic | read, search, web, browser, prototype/asset edit, verified Canva MCP |
| `operations` | DevOps | read, search, edit, execute, web, only installed platform MCPs |
| `knowledge` | Knowledge | local read/search, optional DB query, edit only curated knowledge |
| `documentation` | Writer | read, search, documentation edit, link/build validation |

Use qualified tool names when a narrow tool is sufficient. Keep broad tool sets only where the role genuinely needs the whole group.

## 8. Skill audit

### 8.1 Existing deployable skills

| Skill | Relevant agents | Findings |
|---|---|---|
| `query-knowledge-base` | All agents; especially CTO, Principal, Architect, QA, Security, Knowledge | Good local-Markdown-first fallback with optional existing Postgres. Portable after replacing Claude-flavored tool terms. |
| `scaffold-project` | CTO, Principal, Architect, DevOps | Powerful and policy-heavy. Make user-invocable-only, confirm the target directory, and move stack choices to discovery. |
| `search-stock-images` | Graphic, UX | Useful and safety-conscious. Replace Claude-in-Chrome fallback with VS Code browser tools; keep download approval. |

All three omit `user-invocable` and `disable-model-invocation`, so they appear as slash commands and are eligible for automatic loading. `scaffold-project` should not auto-run because it creates a broad file structure.

### 8.2 Missing or broken references

| Reference | Used by | Status/recommendation |
|---|---|---|
| `frontend-design` | Graphic, UX | Missing from manifest and `skills/`; install/create a VS Code-compatible skill or remove the promise. |
| `pptx` | Graphic and Claude skill map | Not in Copilot deployment; install a valid presentation skill or remove. |
| namespaced operations/productivity/marketing skills | Claude port map | Not part of this VS Code inventory; verify each before any mapping. |
| `skill-creator` | Claude Agentic Systems map | Optional personal capability, not a roster dependency. |

Move long procedures from agent bodies into skills such as `agent-roster-audit`, `requirements-elicitation`, `adr-authoring`, `release-readiness`, `webapp-testing`, `security-review`, `expo-mobile-delivery`, `database-migration-safety`, `agentic-system-evaluation`, `digital-twin-control-safety`, `xr-device-validation`, `image-generation-local`, `canva-design-workflow`, and `documentation-release-pack`.

## 9. Model audit

### 9.1 Current state

- All 24 Copilot agents omit `model`; all manifest model fields are `null`; the installer injects none.
- Direct agents use the current picker model. Subagents follow VS Code's explicit-invocation → agent-frontmatter → parent-model priority.
- Claude copies use `inherit` for CTO, Principal, Creative, and Architect; `haiku` for Graphic, Knowledge, and Writer; `sonnet` for the rest.
- Claude identifiers and metadata are runtime-specific and are not the Copilot policy.

### 9.2 Findings and recommendation

Inheritance avoids stale identifiers but provides no predictable cost/quality policy. A cheap parent can prevent a subagent from using a more expensive model. Handoff model selection is unused. Graphic/UX visual review may require a vision-capable model separate from image-generation tools.

| Model class | Agents | Pilot policy |
|---|---|---|
| High-reasoning | CTO, Principal, Architect, Security, Agentic, Digital Twin | Picker inheritance or a maintained prioritized array after evals |
| Balanced coding | Platform workers, DB, DevOps, ML, QA, XR | Inherit during pilot; pin only after account-specific validation |
| Fast analysis/docs | PM, Requirements, Writer, Knowledge, routine Data Science | Use faster models only after quality/routing evals |
| Vision-capable | Graphic, UX visual review | Select image-understanding model; generation stays external |

Do not copy `sonnet`/`haiku` literals into Copilot files. First record the exact models available to the user's Copilot account and run routing/output evaluations.

## 10. Shared instructions and governance

- The five `.instructions.md` files have descriptions but no `applyTo`; do not assume automatic application across projects. Verify in Chat Customization Diagnostics.
- The installer uses a legacy prompts/user-data path rather than a verified current personal-instructions path or project-local `.github/instructions`.
- User-level agents invoked elsewhere do not automatically receive this repository's `CLAUDE.md`.
- Project branch, stack, deploy, and documentation policy belongs in target-repository instructions, not a global persona.
- `agent-self-governance` permits agents to change their own tools and Knowledge to edit other agents. This bypasses review and creates non-reproducible deployed/source drift.
- Additive-only tools conflict with least privilege because tools can never be removed.
- CTO performs Docker/Todo side effects for every request.
- Knowledge has stale 21-agent facts; Git policy is stale relative to main being 22 commits ahead of origin/development.

Recommended governance: agents propose configuration patches; a maintainer approves source changes; every change passes static validation, diagnostics, and smoke tests; tool removal is expected; personas, skills, project instructions, hooks, and MCP trust remain separate layers.

## 11. Prioritized recommendations

### P0 — Required before deployment

1. **Change the user-agent destination** to `%USERPROFILE%\.copilot\agents` and confirm Agent Host discovery there.
2. **Choose one VS Code identity source.** Prevent `.claude/agents` from shadowing/conflicting with Copilot agents when this repository is opened. Exclude Claude discovery for this workspace, use distinct names, or keep the derivation outside the VS Code workspace.
3. **Remove mandatory nested orchestration.** Make Principal Engineer a direct implementation entry and transition by handoff. If nesting remains, explicitly enable and test `chat.subagents.allowInvocationsFromSubagents` and document recursion/cost implications.
4. **Replace legacy MCP assumptions with verified VS Code tools.** Provision through current VS Code MCP configuration, then use `<server-name>/*` only where needed.
5. **Resolve broken capability promises.** Install or remove `frontend-design`, `pptx`, Canva, Claude-in-Chrome, and Docker MCP references.
6. **Eliminate autonomous agent self-modification.**
7. **Run Chat Customization Diagnostics** and require zero agent/skill/instruction errors.

### P1 — Required for a dependable pilot

1. Introduce least-privilege tool profiles.
2. Promote phase-specific visible entry points so users can avoid deep routing.
3. Add explicit `name`, concise `description`, `argument-hint`, and `target: vscode` where appropriate.
4. Fix role-routing contradictions and stale roster counts.
5. Rewrite handoffs with artifact and verification context.
6. Move project policy out of global agent bodies into target-repository instructions.
7. Split long procedures into progressive skills.
8. Make destructive scaffold/deployment skills user-invocable-only and retain approvals.
9. Create an uninstall/rollback path that preserves unrelated user agents and skills.

### P2 — Quality and scale

1. Add an executable roster-evaluation suite.
2. Add prompt/model version metadata and source-generated change logs.
3. Add agent-scoped hooks for deterministic validation where useful.
4. Measure routing accuracy, task success, tool-call error rate, handoff acceptance, cost, and latency.
5. Split broad agents only when eval evidence shows quality loss.

## 12. Remediation sequence

### Phase 1 — Make deployment truthful

- update destinations
- define the canonical VS Code source
- remove duplicate identities
- add a current VS Code MCP example
- validate tool names
- add dry-run destination and file-count assertions

### Phase 2 — Make orchestration work by default

- add phase-specific visible entries
- change CTO implementation routing to a handoff
- keep Principal and Creative as one-level coordinators
- repair handoff labels/prompts
- remove reliance on recursive nesting

### Phase 3 — Reduce capability risk

- apply least-privilege profiles
- remove unresolved MCP globs
- remove self-modification
- separate project policy from persona
- add destructive-action approvals and scope checks

### Phase 4 — Refine roles and skills

- fix Python/non-React routing gaps
- fix ML/agentic overlap
- split procedures into skills
- install or remove missing design/document skills
- shorten descriptions and bodies

### Phase 5 — Evaluate and pilot

- run the static validator
- run VS Code diagnostics
- test every visible entry
- invoke every hidden agent through an allowed coordinator
- exercise every handoff
- verify model fallback and unavailable-tool behavior
- pilot on a disposable repository before global rollout

## 13. Deployment acceptance gates

The redesign is ready only when all gates pass:

| Gate | Required evidence |
|---|---|
| Structural integrity | Intended count, zero missing files/duplicate IDs/invalid routes |
| Discovery | Agent Customizations shows exactly one intended definition per agent name |
| Destination | User agents resolve from `~/.copilot/agents`; skills from `~/.copilot/skills` |
| Diagnostics | Zero agent, instruction, and skill load errors |
| Tools | Every declared built-in/MCP tool is available; unavailable tools are removed or explicitly optional |
| Orchestration | CTO-to-implementation workflow succeeds with nesting disabled |
| Hidden workers | Every hidden worker is invoked once by an allowed coordinator |
| Handoffs | Every button opens the intended agent/prompt without name ambiguity |
| Models | Direct/subagent selection matches policy and fallback is observed |
| Safety | Audit-only agents cannot edit product code; production/cloud/destructive actions request approval |
| Skills | Every referenced skill exists, loads, and respects invocation/approval policy |
| Rollback | Uninstall restores prior state without deleting unrelated customizations |
| Pilot | Disposable-repo discovery → architecture → implementation → QA completes without tool/routing failures |

## 14. Recommended first implementation scope

Keep the first remediation branch narrow and verifiable:

1. Correct the destination and add collision detection.
2. Add an explicit canonical-source policy for Copilot versus Claude files.
3. Redesign CTO → Principal as a handoff-driven transition.
4. Create least-privilege coordinator, implementer, reviewer, design, operations, and documentation profiles.
5. Remove or mark unresolved MCP and missing-skill references.
6. Add a static roster validator and VS Code diagnostics/smoke-test checklist.

Do not rewrite all 24 bodies in the same change. Stabilize discovery, tools, and orchestration first; refine roles in coherent groups with evals.

## 15. Official reference sources

- [Custom agents in VS Code](https://code.visualstudio.com/docs/agent-customization/custom-agents)
- [Subagents in VS Code](https://code.visualstudio.com/docs/agents/run/subagents)
- [Agent Skills in VS Code](https://code.visualstudio.com/docs/agent-customization/agent-skills)
- [AI features and built-in tools reference](https://code.visualstudio.com/docs/agents/reference/ai-features-cheat-sheet)
- [Add and manage MCP servers in VS Code](https://code.visualstudio.com/docs/agent-customization/mcp-servers)
- [Custom instructions in VS Code](https://code.visualstudio.com/docs/agent-customization/custom-instructions)
