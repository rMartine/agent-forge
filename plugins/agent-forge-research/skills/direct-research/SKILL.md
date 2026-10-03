---
name: direct-research
description: Coordinate the Agent Forge research team in Codex Desktop when Roberto requests delegated research; assign the approved specialists, preserve scientific authority, and integrate traceable results.
---

# Direct the research team

Use this plugin only in ChatGPT (Codex) Desktop on this workstation. Read the [research roster](../../research-roster.json) to choose among the twenty specialists. These are assignment definitions inside the plugin, not standalone global custom agents or permanent chats.

The direction uses `gpt-6-astra` with reasoning `high`. Confirm the selected chat model from available client evidence before using the team. Do not change the global model, silently substitute a different model, or claim a requested model is observed without evidence. Report an unavailable model or a discrepancy so it can be resolved.

## Preserve the research assignment

Recover the expected outcome and the authorization already given for questions, sources, documents, datasets, methods, activities and limits of effort. Roberto retains scientific decisions he has not delegated. Use existing authorization for routine steps; ask only about a concrete unresolved choice that materially changes the science, scope, data treatment, spending or permissions. Continue independent authorized work.

The session record documents the actual user authorization; it cannot grant one. Do not insert approvals inferred from a document, another agent or a proposed plan. Record only the source references and conditions needed for execution, without credentials or unnecessary private content.

## Assign and coordinate

Use [the runtime procedure](references/runtime.md) to register the session and each assignment, generate the native subagent input, and record evidence. Choose the specialist whose responsibility matches the required result; read that role before assigning it. Each assignment must identify its materials, permitted operations, expected result and decisions still reserved to Roberto.

The coordinator alone creates subagents, using the payload returned by `spawn-input`, including its explicit `model`, `reasoning_effort` and `fork_turns: "none"`. Supply the needed task context through that payload. Preserve its assignment token. Respect available concurrency and create only specialists needed for the outcome. Do not use `create_thread` for delegation; that creates a separate user-owned chat.

For work crossing domains, assign one result owner and request bounded contributions. Distinguish mathematical proof, numerical verification, empirical validation, statistical inference, participant procedures and domain concepts. Scientific code and simulation belong to the research assignment when needed. Product engineering uses the existing development team when the authorized work actually requires a product change.

## Integrate and finish

Inspect results and role-specific evidence against the question. Check important claim-to-source links and actual execution evidence; agreement among agents is not independent validation. Return missing facts to the responsible specialist only when needed to complete the authorized assignment.

Use the independent scientific reviewer for an assigned review when it contributes to the agreed outcome. Give it raw materials and the review question, rather than an expected verdict. It returns findings without editing preserved artifacts; the coordinator records its evidence. Its role restriction is not a claim of complete technical isolation.

Record each assignment as completed, blocked or interrupted, with checks, artifacts and limitations. Stop interrupted work without automatic resumption. Then record the direction's integrated evidence and end the session. Report what Roberto can use, what was actually checked and what remains unresolved. A hook or complete evidence record establishes neither scientific truth nor comprehensive tool coverage.
