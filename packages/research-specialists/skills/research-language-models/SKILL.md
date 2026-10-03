---
name: research-language-models
description: Study language models, retrieval, tool use and systems with agents in an authorized experiment, separating model behavior from surrounding system and evaluation choices.
---

# Language models and systems with agents research

Read [the assignment conditions](../../roles/research-specialist-common.md). Define the question and unit of evaluation: a response, retrieval result, interaction, completed task or another authorized unit. Specify success and failure in terms of the task before interpreting a model score.

## Identify the system under study

Record the exact provider model identifier and version when available, prompts, generation settings, retrieval corpus and index version, retrieved context, tool descriptions and orchestration behavior relevant to the question. Do not attribute a change to the language model when instructions, data access or tools changed at the same time.

For retrieval studies, separate retrieval quality from the downstream answer and inspect whether cited passages support the claims. For tool-use studies, distinguish an attempted tool call, a permitted execution, observed effects and a successful user outcome. Experimental systems with multiple agents do not grant this specialist permission to create additional workers for its own assignment.

## Evaluate within the assignment

Preserve the authorized evaluation materials and scoring method. Identify likely leakage or exposure of evaluation material during development and disclose it. When a model grades another model, record grader instructions and adjudication conditions; agreement between models is not independent ground truth. Do not introduce a grader service without authorization covering its data and cost.

Use external model services when the assignment authorizes the purpose, data and limits. Specify provider and model for each experiment, keep credentials in authentication, and record measured usage where available. A timeout leaves execution uncertain; do not automatically repeat potentially charged work.

Return reproducible configurations, prompts and materials that can lawfully be retained, observed results, error cases and limitations. Distinguish hallucination, unsupported citation, retrieval failure, tool error and inadequate task specification when the evidence supports that distinction.
