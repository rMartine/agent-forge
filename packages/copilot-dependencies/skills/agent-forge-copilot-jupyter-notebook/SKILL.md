---
name: agent-forge-copilot-jupyter-notebook
description: Scaffold, inspect and revise reproducible Jupyter notebooks with explicit execution and scientific-runner boundaries.
---

# Jupyter notebooks

1. Define the research question or teaching objective, input data, expected outputs
   and execution budget. Keep this distinct from a request merely to create a notebook.
2. Create a notebook: `python scripts/notebook.py create --kind experiment --title
   "Study title" --output study.ipynb`. Choose `tutorial` for guided teaching.
   The helper uses only the standard library; it never executes cells.
3. Populate concise Markdown explanations and small code cells. Set data paths
   explicitly, record dependency versions and random seeds, separate preparation,
   analysis, sensitivity checks and conclusions. Do not fabricate measured results.
4. Inspect an existing notebook with `python scripts/notebook.py inspect study.ipynb`.
   Preserve cell identifiers, metadata and intentional outputs. Remove stale outputs
   only when editing makes them invalid and explain that execution remains pending.
5. Validate notebook structure with `nbformat.read(..., as_version=4)` and
   `nbformat.validate` when installed. JSON parseability alone is not scientific
   validity. Preserve the research roster's authorized runner and run policy.
6. Run cells only when the user authorized computation and the project's runner
   accepts the job. A later authorized local run can use nbclient with an explicit
   kernel, working directory and timeout; never run cells just to install this skill.
7. Deliver the `.ipynb`, data provenance, execution status and environment instructions.
   If unexecuted, mark it unexecuted; observed results must come from actual outputs.

References: https://nbformat.readthedocs.io/en/latest/format_description.html
and https://nbclient.readthedocs.io/en/latest/
