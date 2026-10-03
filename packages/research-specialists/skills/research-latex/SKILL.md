---
name: research-latex
description: Create or revise scientific LaTeX deliverables in Codex Desktop, using its built-in editor for standalone documents and an authorized project environment for documents with multiple files.
---

# Scientific LaTeX documents

Read [the assignment conditions](../../roles/research-specialist-common.md). Inspect the existing document and requested format before choosing a template, bibliography workflow or compiler. Preserve document language, scientific content, citation keys and venue requirements unless the assignment calls for changes.

## Standalone documents

Create or edit the saved .tex source with file tools in the authorized output location. Discover and use Codex Desktop's `open_in_codex` tool to open the source editor and automatic PDF preview unless that file is already open or Roberto requests otherwise. Use `compile_latex_document` to obtain diagnostics; opening the editor alone does not establish successful compilation.

Correct source errors within the tool's documented repair limit, currently up to three repair attempts. If it reports busy, wait briefly and retry within its documented limit. Preserve the source and keep the editor available when compilation fails. Do not install a LaTeX plugin, TeX distribution or dependency solely for the built-in standalone editor.

## Existing projects with multiple files

Inspect the project's entry point, class, bibliography inputs and established compile command. The standalone compiler does not support additional project files. Use the existing authorized project environment and its build procedure; report missing capabilities rather than silently converting the manuscript into a different project structure or installing a toolchain.

Resolve included files and output paths inside the authorized project roots, including after resolving links. Do not use arbitrary absolute includes or parent-directory traversal. Use the adapted Nature consistency checker only within its authorized roots. Do not enable shell escape to satisfy an unknown package without sufficient authorization. Preserve source files and bibliography databases when cleaning generated artifacts.

## Scientific and visual checks

Verify equation numbering, cross-references, tables, figures, citation keys and bibliography correspondence to the extent affected by the change. A clean compilation does not verify the mathematics or the accuracy of citations. Inspect rendered pages when layout matters; report whether inspection was actually performed. Avoid adding unsupported scientific claims to fix an awkward paragraph.

Return the editable source location, output location when available, compiler result, checks performed and remaining diagnostics. Never report a successful PDF build from an exit code hidden by a shell pipeline or from a pre-existing PDF.
