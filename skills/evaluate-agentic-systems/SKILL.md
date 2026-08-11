---
name: evaluate-agentic-systems
description: Design and evaluate agent, RAG, MCP, tool-calling, and multi-agent workflows using typed state, approval boundaries, traces, and repeatable cases. Use when implementing or reviewing agent behavior, retrieval quality, tool selection, orchestration, or production readiness.
---

# Evaluate Agentic Systems

1. Choose the smallest reliable shape: structured prompt, tool-using agent, RAG, graph, then multi-agent only when justified.
2. Define inputs, state, outputs, tools, side effects, retries, approval points, and terminal failures.
3. Version prompts and model policy outside hardcoded source.
4. Validate model output before it drives SQL, shell, code, file, cloud, or destructive actions.
5. Create evals for routing, tool selection, argument construction, refusal, recovery, grounding, and permission boundaries.
6. Trace prompt version, model, tool calls, latency, inputs, outputs, errors, and reviewer decisions.
7. Release only with measured thresholds and inspectable failures.
