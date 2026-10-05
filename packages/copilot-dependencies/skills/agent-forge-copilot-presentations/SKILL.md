---
name: agent-forge-copilot-presentations
description: Create, inspect and edit PowerPoint PPTX decks locally with python-pptx and an optional Office or LibreOffice renderer.
---

# PowerPoint presentations

Use python-pptx with the interpreter reported by `__COPILOT_RUNTIME__/dependencies/discover.mjs`.
Read the complete brief, supplied assets and any template before constructing slides.

1. Define audience, conclusion, slide count/aspect ratio and speaker-note needs.
   Outline one claim per slide and its supporting evidence. Select the roster's
   shared design style when specified. Keep data and citations traceable.
2. Inspect an existing deck: `python scripts/presentation.py inspect input.pptx`.
   The report includes slide size, text shapes, shape positions and notes. Reuse
   a supplied template via `pptx.Presentation(template_path)` rather than recreating
   its visual identity. Preserve objects outside the requested changes.
3. Create an initial deck from `assets/brief.json` using
   `python scripts/presentation.py create brief.json output.pptx`.
   This is an editable starting deck, not an automatic final design.
4. Refine with python-pptx: shapes/text frames, `add_picture`, `add_table`, and charts.
   Use `pptx.util.Inches/Pt`, explicit font sizes and theme colors. Keep text within
   boxes; avoid body text below 18 pt for projected presentations. Reserve footer
   space for source citations. Use supplied images or authorized acquired assets.
5. Maintain an assets/source ledger and speaker notes. Check all shape bounds
   against slide dimensions, chart labels and editable text. Do not flatten slides
   into screenshots unless the user requests that output.
6. Save a new PPTX. For visual verification use installed PowerPoint or LibreOffice
   to export PDF; inspect every slide using the PDF skill. Report unavailable
   rendering and unsupported animations or embedded object changes explicitly.
7. Deliver the absolute PPTX path, available preview and any open content gaps.

API reference: https://python-pptx.readthedocs.io/en/latest/
