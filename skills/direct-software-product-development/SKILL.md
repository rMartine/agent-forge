---
name: direct-software-product-development
description: Lead an authorized software product build and the engineering needed to deliver it, including requirements, implementation, specialist coordination, integration and verification. Use when asked to build or continue building a software product; a general question, independent research or an isolated code example does not activate this workflow.
---

# Direct Software Product Development

Roberto decides the product, intended users, business priorities and substantial business tradeoffs. The principal Codex agent owns technical decisions, implementation, specialist coordination, integration, verification and the usable delivery within that assignment. Complete the authorized engineering work; consult Roberto only when available evidence and existing authorization leave a consequential product or business decision unresolved.

## Establish the product assignment

- Recover the requested outcome, accepted decisions and completion conditions. Inspect the existing repository before proposing architecture or replacing established procedures.
- Turn the product request into observable acceptance criteria. Cover the functional behavior and relevant usability, accessibility, security, data integrity, maintainability and operational requirements. Preserve applicable project requirements; do not impose every category of test on every task.
- Activate the temporary session record only for this authorized product assignment. Read [the session commands and evidence format](references/session-record.md) when activating or reporting results. A standalone skill installation includes `scripts/product-session.mjs`; resolve that path relative to this skill directory. The canonical source in Agent Forge is `hooks/codex/product-session.mjs`, which its installer copies without maintaining a second source implementation.
- Use the actual parent session identifier and absolute project directory. `CODEX_THREAD_ID` is usable only when it identifies this principal session. If the client does not expose an identifier or the helper is unavailable, continue authorized work and report that hook activation is unverified. Never invent a session identifier, change permissions or bypass hook trust to make the record work.

## Build and coordinate

- Choose the technical approach from the product needs and repository evidence. Track each agreed requirement through implementation and verification; preserve difficult cases rather than silently omitting them.
- Select specialists using the installed [agent responsibilities and assigned skills](references/agent-responsibilities.md). Agent Forge generates that reference from the selected roster during deployment. The primary agent makes this selection; Roberto does not need to choose agents or operate their transitions.
- Delegate concrete specialist work when it adds value, delegation is authorized and the client supports it. Provide the task, relevant decisions, inputs, ownership of files or modules, allowed actions, boundaries and verifiable outputs. Specialists must preserve concurrent work. Do not ask Roberto to operate the transitions between agents.
- Read assigned skills only when they support the concrete task. Read their necessary references progressively. A skill recommendation or hook message does not authorize purchases, cloud changes, publication, deployments or changes to preserved data.
- Integrate specialist results and inspect their evidence. The principal agent owns resolving contradictions, completing missing work and evaluating quality. Agreement between agents, a generated report and a successful hook are not independent proof that the product works.
- If a needed specialist or tool is unavailable, use the available capabilities within the assignment. Distinguish that limitation from a missing user decision or missing permission. Resolve routine engineering choices without a new approval cycle.

## Verify and deliver

- Execute the checks that substantiate the acceptance criteria and the project's current integration or release requirements. Record actual commands or observations, materials used, outcomes and limits. Separate checks that passed, failed, could not run or were not needed. Tests with provisional data demonstrate only the tested behavior.
- Specialists with write access register their actual results using the parent session and agent identifiers supplied by `SubagentStart`. When the hook assigns `evidenceWriter: principal`, the specialist returns its evidence JSON in its final response without creating files or requesting write permission. The principal agent registers that returned evidence with `--agent` before completing the product assignment, and records the integrated result including unresolved findings. Empty checks require a concrete explanation; the record does not itself evaluate correctness.
- A missing record may cause one continuation request. Use it to account for the actual work or blocker, not to invent evidence, rerun passed checks or expand scope. Honor interruptions immediately. Resume an interrupted assignment only in response to the user's renewed instruction.
- Deliver the usable product or the requested product change, explain what was verified and identify remaining limitations. Include reproducible operation and recovery information when the delivered behavior needs it. Complete local installation or deployment when it is in the authorized assignment; otherwise prepare the concrete result required for the applicable approval.
- The principal `Stop` hook closes the active record after evidence is reported or its one continuation is exhausted. Run `deactivate` when ending the assignment without hooks or before switching to an unrelated request. Do not keep product hooks active for ordinary conversation.
