---
name: agent-forge-copilot-spreadsheets
description: Read, create and edit XLSX workbooks using openpyxl with explicit formula, units, formatting and recalculation controls.
---

# Spreadsheets

Use openpyxl with the interpreter reported by `__COPILOT_RUNTIME__/dependencies/discover.mjs`.
Keep inputs, assumptions, calculations and outputs identifiable. Record currency,
unit, date basis and source for each imported dataset.

1. Inspect first with `python scripts/workbook.py inspect source.xlsx --max-rows 30`.
   Load formulas using `data_only=False`; read a separate copy with `data_only=True`
   only to inspect existing cached results. Cached values can be stale.
2. Create a workbook with `python scripts/workbook.py create brief.json output.xlsx`
   using `assets/brief.json`. Each sheet has a name and rectangular `rows`; a string
   beginning with `=` is an intentional formula. Sanitize untrusted imported CSV
   strings beginning with `=`, `+`, `-` or `@` before placing them in formula cells.
3. For edits, use `openpyxl.load_workbook(input)` and save a new path. Preserve sheet
   names, formulas, defined names, validation, formats, merged cells and layout.
   Macro-enabled files require `keep_vba=True`; unsupported drawings/objects may be
   lost, so use Excel for those changes rather than silently discarding them.
4. Write formulas for derived values and label assumptions. Use appropriate decimal,
   percentage, currency and date number formats, frozen headers and sensible column
   widths. Do not hardcode a computed total in place of an existing formula.
5. Reopen to check ranges, formulas and types. openpyxl never evaluates formulas.
   Recalculate with installed Excel or LibreOffice only when available and permitted;
   otherwise clearly state that computed results were not refreshed. Do not present
   missing cached values as zero or as evaluated formulas.
6. Deliver the absolute path with assumptions, any uncalculated formulas and source
   references. For sensitive original data, report aggregates rather than all rows.

API reference: https://openpyxl.readthedocs.io/en/stable/
