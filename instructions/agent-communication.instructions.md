---
description: "Use when: delegating work to other agents, receiving delegated work, handing off results, asking for clarification, managing context across agents, breaking down tasks"
---

# Agent Communication Protocol

## Clarification First

When a task is ambiguous or underspecified, ask **one focused clarifying question** before proceeding. Do not guess at requirements — a wrong assumption wastes more time than a question.

- Use the `ask` tool to present structured questions with selectable options when choices are finite. Reserve free-text questions for open-ended clarification only.
- **Prefer reasonable defaults** — if you can make a sensible choice and note the assumption (e.g., "Assumed REST over GraphQL — change if needed"), do that instead of interrupting the user.
- **Use `ask` directly** for blocking questions you cannot resolve from context or codebase inspection.
- **Escalate to parent** when the decision requires orchestration context that only the parent has (scope changes, cross-domain coordination, release approval).

## Clarification Escalation

When a sub-agent encounters a decision that requires its **parent's orchestration context** (not just a factual answer):

1. **Return to your parent** via `handoffs` with:
   - What you were trying to do
   - The specific question that needs resolution
   - What you will do with each possible answer
2. **The parent agent** resolves (from its own context or by asking the user), then re-delegates with the answer.

Only escalate for decisions that would be costly to reverse: data model choices, public API contracts, technology selections, or scope questions. For everything else, decide and note the assumption.

## Context Window Awareness

- User stories and tasks must be scoped to fit within a single agent's context window.
- When breaking down work, each unit should be completable without requiring the full project context.
- If a task is too large, break it into sequential subtasks and specify the handoff points.

## Delegation vs Handoffs (two distinct mechanisms)

The roster uses two separate VS Code custom-agent features that are easy to conflate. Read this carefully — most routing bugs come from confusing them.

### Delegation (runtime, programmatic)

**What it is:** An orchestrator agent invokes another agent as a sub-agent during its own execution, using the `agent` tool (`runSubagent`). The sub-agent runs, returns a result, and the parent continues.

**Requirements:**
- Parent must have the `agent` tool in its `tools:` (granted by the `orchestrator` toolset).
- Parent must list the sub-agent in its `agents:` frontmatter array.
- Sub-agent must NOT have `disable-model-invocation: true`.

**Who delegates:**
- `@cto` → division leads (creative-director, requirements-engineer, software-architect, project-manager, principal-engineer, cybersecurity-engineer, knowledge-engineer, technical-writer, qa-engineer, devops-engineer).
- `@principal-engineer` → engineering specialists (backend, frontend, mobile, dotnet, desktop-app, database, devops, qa, ml, data-scientist, cybersecurity, ux).
- `@creative-director` → design specialists (ux-engineer, graphic-designer).
- No one else delegates programmatically. Specialists escalate by returning a result that asks the parent to re-route.

### Handoffs (UX, post-response)

**What it is:** A list of suggestion buttons VS Code shows the user **after the agent has finished responding**. Clicking a button starts a new turn with that agent. Handoffs do NOT cause programmatic invocation — they only suggest the next user action.

**Use it for:** "What would you naturally want to do next?" — e.g. requirements-engineer hands off to software-architect (design the system) and project-manager (plan the sprint).

**Do NOT use it for:** Routing inside an orchestrator's own response. That requires delegation (see above).

## Delegation Template

When delegating, the parent's prompt to the sub-agent must include:

1. **Goal** — what needs to be accomplished, in one sentence.
2. **Context** — relevant files, prior decisions, constraints.
3. **Output** — what the sub-agent must return (artifact, file path, summary).
4. **Dependencies** — what ran before and what runs after this task.
5. **Directive** — *"Use the correct specialist on your team for each sub-task. Pass this directive down to anyone you spawn."*

The directive in (5) is mandatory for every delegation. It propagates the routing discipline through the chain.

## Chain of Command

- **CTO is the single user-facing entry point.** Every user request starts with `@cto` (or, when the user invokes a specialist directly, the specialist must escalate back to CTO if the work crosses its lane).
- `@cto` delegates to division leads only — never directly to specialists.
- `@principal-engineer` delegates to engineering specialists.
- `@creative-director` delegates to design specialists.
- Specialists do not delegate to other specialists. If cross-domain work is needed, return a result asking the parent to route the next step.

## Clarification Escalation

When a sub-agent encounters a decision that requires its parent's orchestration context (not just a factual answer):

1. Return a result to the parent explaining:
   - What you were trying to do
   - The specific question that needs resolution
   - What you will do with each possible answer
2. The parent agent resolves (from its own context or by asking the user), then re-delegates with the answer.

Only escalate for decisions that would be costly to reverse: data model choices, public API contracts, technology selections, scope changes. For everything else, decide and note the assumption.

## QA Access

`@qa-engineer` is reachable only through `@cto` (for cross-cutting test strategy) and `@principal-engineer` (for implementation testing and defect verification). All other agents that need tests must escalate up the chain rather than invoke QA directly. This keeps the test backlog visible to the engineering chain instead of fragmenting across specialists.
