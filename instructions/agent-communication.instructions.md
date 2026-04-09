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

## Handoff Protocol

When delegating to another agent or handing off results:

1. **State the goal** — What needs to be accomplished.
2. **Provide context** — Relevant files, decisions, and constraints.
3. **Specify output** — What the receiving agent should produce.
4. **Note dependencies** — What must happen before or after this task.

## Chain of Command

- `@cto` routes to division leads only — never directly to specialists.
- `@principal-engineer` routes to engineering specialists (backend, frontend, database, devops, mobile, dotnet, ml, data-scientist, qa).
- Specialists do not delegate to other specialists — they escalate to `@principal-engineer` if cross-domain work is needed.

## QA Access

`@qa-engineer` can be invoked by any agent that needs tests written, test suites run, or test quality reviewed. QA is a shared service, not restricted to one chain.
