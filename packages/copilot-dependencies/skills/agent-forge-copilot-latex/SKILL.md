---
name: agent-forge-copilot-latex
description: Create, revise and compile local LaTeX sources in VS Code using an installed TeX engine and bibliography tools.
---

# LaTeX in VS Code

Keep the `.tex` source editable in VS Code. The native application compiler is not
available here. Discover installed `latexmk`, `pdflatex`, `tectonic` and Python with
`node __COPILOT_RUNTIME__/dependencies/discover.mjs`. Do not silently install TeX.

1. Read existing source, class, bibliography and build configuration. Preserve the
   user's macros and project layout. For a new standalone document start from
   `assets/document.tex`, substituting content, language and verified citations.
2. Use semantic sectioning, labels and references. Escape literal `%`, `&`, `_`,
   `#` and other TeX metacharacters in prose. Put data tables in `tabular` and math
   in appropriate math environments; do not represent equations as raster images.
3. Keep `.bib` entries based on verified sources; never invent DOI or page data.
   Use the Zotero skill when the user requests its library. Include every local
   figure, bibliography and style dependency in the deliverable directory.
4. Compile only during authorized document work:
   `python scripts/compile.py paper.tex --engine auto`.
   The helper selects latexmk, pdflatex or tectonic, disables shell escape where
   supported, writes artifacts under `build`, and reports the real return code.
   pdflatex runs twice for references but does not run a bibliography processor;
   use the project's BibTeX/Biber workflow or latexmk for that requirement.
   Tectonic may download TeX resources unless its cache is ready; request an offline
   workflow when network use is prohibited.
5. Read the log, fix source errors and rerun at most three repair attempts. Check
   undefined references, citations, missing fonts and overfull boxes. A saved source
   or an opened editor is not proof of successful compilation.
6. Inspect the compiled PDF with the PDF skill. Deliver the absolute `.tex`, `.bib`
   and PDF paths with any missing engine/packages or unresolved compilation issue.

Reference: https://www.latex-project.org/help/documentation/
