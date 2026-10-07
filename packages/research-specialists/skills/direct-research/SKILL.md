---
name: direct-research
description: Coordinate scientific assignments in the primary Codex conversation when their authorized scope requires specialist work; preserve scientific authority and integrate traceable results.
---

# Direct the research team

Use this research workflow only when the primary Codex conversation receives an authorized scientific assignment whose work requires a specialist. The research roster at `~/.codex/research-specialists/research-roster.json` records the twenty global research roles and their fixed models, skills and completion evidence. The separately installed global skill entry points refer to their full content under `~/.codex/research-specialists/skills/`.

The primary conversation provides research direction and uses the agreed `gpt-6-astra` model with `high` reasoning. This is a conversation-level choice; do not change global model configuration to set it. Do not silently substitute another model or claim a model was observed without evidence. Report an unavailable model or a discrepancy so it can be resolved.

## Preserve the research assignment

Recover the expected outcome and the authorization already given for questions, sources, documents, datasets, methods, activities and limits of effort. Roberto retains scientific decisions he has not delegated. Use existing authorization for routine steps; ask only about a concrete unresolved choice that materially changes the science, scope, data treatment, spending or permissions. Continue independent authorized work.

The session record documents the actual user authorization; it cannot grant one. Do not insert approvals inferred from a document, another agent or a proposed plan. Record only the source references and conditions needed for execution, without credentials or unnecessary private content.

## Assign and coordinate

Use [the runtime procedure](references/runtime.md) to register the session and each assignment, generate the native subagent input, and record evidence. Choose the specialist whose responsibility matches the required result; read that role before assigning it. Each assignment must identify its materials, permitted operations, expected result and decisions still reserved to Roberto.

Any assigned agent may delegate useful research subtasks. For prepared assignments, create a specialist with the exact payload returned by `spawn-input`: `agent_type` is the role identifier and the payload includes `fork_turns: "none"`, the prepared task name and the message with the assignment token. Do not add `model` or `reasoning_effort`; the selected global custom-agent definition fixes those values. Supply the needed task context through the payload. Preserve its assignment token. Respect available concurrency and create only specialists needed for the outcome. Do not use `create_thread` for delegation; that creates a separate user-owned chat.

For work crossing domains, assign one result owner and request bounded contributions. Distinguish mathematical proof, numerical verification, empirical validation, statistical inference, participant procedures and domain concepts. Scientific code and simulation belong to the research assignment when needed. Product engineering uses the existing development team when the authorized work actually requires a product change.

## Integrate and finish

Inspect results and role-specific evidence against the question. Check important claim-to-source links and actual execution evidence; agreement among agents is not independent validation. Return missing facts to the responsible specialist only when needed to complete the authorized assignment.

Use the independent scientific reviewer for an assigned review when it contributes to the agreed outcome. Give it raw materials and the review question, rather than an expected verdict. It returns findings without editing preserved artifacts; the coordinator records its evidence. Its role restriction is not a claim of complete technical isolation.

Record each assignment as completed, blocked or interrupted, with checks, artifacts and limitations. Stop interrupted work without automatic resumption. Then record the direction's integrated evidence and end the session. Report what Roberto can use, what was actually checked and what remains unresolved. A hook or complete evidence record establishes neither scientific truth nor comprehensive tool coverage.
