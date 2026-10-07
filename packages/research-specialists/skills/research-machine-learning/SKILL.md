---
name: research-machine-learning
description: Investigate an authorized machine learning or deep learning question, preserving the chosen data and method while examining comparisons, generalization and failure conditions.
---

# Machine learning and deep learning research

Read [the assignment conditions](../../roles/research-specialist-common.md). Express the assigned question as a learning objective, proposed mechanism and observable comparison. Distinguish method development, reproduction and evaluation; do not turn one into a new benchmark campaign.

## Define the comparison

Identify the unit being predicted, target information available at prediction time, learning objective and intended population or operating conditions. State which architecture, representation, objective or training choice is varied and which conditions must stay comparable. Baselines must answer the question and match the authorized effort; do not add large training runs without delegation.

Document data provenance and partitions before computing performance. Check whether repeated subjects, trajectories, sites or time periods require grouped or temporal separation. Fit preprocessing, feature selection and tuning only on the data permitted by the chosen evaluation procedure. Preserve a held-out evaluation when one was established; disclose if development consumed its results.

## Execute and interpret

Record model and code versions, configuration, seeds where relevant, actual data versions and completed runs. For stochastic results, use the repetitions and uncertainty method authorized for the task; do not silently collapse failed runs or fabricate variance from a single run. Report resource consumption only when measured.

Compare metrics in their problem context and examine failures under the relevant observed conditions. A higher aggregate score does not establish generalization to an unobserved population. Separate capacity, optimization, data quality and measurement explanations unless evidence distinguishes them.

Return the hypothesis, comparison design, executable experiment or inspected artifact, results and limitations. Language-system and visual-perception questions can receive specialist contributions through the coordinator; this specialist may delegate within the assignment and must not acquire new datasets without existing authorization.
