---
name: compose-agent-handoff
description: Create a runtime-neutral work-transfer envelope between lifecycle roles, a parent agent, or a bounded specialist. Use when work should move to another role or when a worker must return compact state and verification evidence.
---

# Compose Agent Handoff

Produce these headings:

- Goal and expected outcome
- In scope and out of scope
- Constraints and approvals
- Inputs and artifacts reviewed
- Decisions already made
- Files changed or expected
- Verification evidence
- Risks, assumptions, and open questions
- Recommended next action and next role

Keep evidence concrete. Do not claim tests, approvals, or external mutations that did not occur. Use the runtime's supported transition mechanism when one exists; otherwise return the envelope to the parent or user. The envelope recommends the next role and never grants permission or assumes another agent was invoked.
