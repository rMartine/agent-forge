---
name: agent-forge-copilot-documents
description: Create, read and edit Word DOCX files with local python-docx, preserving styles and reporting rendering limits.
---

# Word documents

Use the Python interpreter reported by `__COPILOT_RUNTIME__/dependencies/discover.mjs`.
Required library: python-docx. Keep the original document and edit a new copy.

1. Read the user's source material and identify audience, language, paper size,
   template, headings, tables and required citations. Inspect an existing file with
   `python scripts/document.py inspect input.docx`; output includes paragraphs,
   styles and table cells. Text extraction does not include every drawing or field.
2. For a new file, write a UTF-8 JSON brief with `title`, `paragraphs` (objects with
   `text` and optional `style`), and `tables` (rectangular arrays of strings).
   `python scripts/document.py create brief.json output.docx` creates the file.
   Use the included `assets/brief.json` as the format example.
3. For edits, use python-docx directly: `docx.Document(path)`, select paragraphs or
   table cells by observed content/index, update individual runs when formatting
   matters, and `save(new_path)`. Replacing `paragraph.text` discards run formatting;
   do that only when intentional. Do not reconstruct an existing file from plain
   extracted text. Keep headers, footers, sections, fields and embedded objects.
4. Set named styles for title/headings/body, page margins, table headings and
   repeatable metadata. Insert real hyperlinks/citations only from supplied or
   verified sources. Use explicit page breaks instead of blank-line spacing.
5. Reopen the saved file, inspect expected paragraphs/tables, and check that the
   ZIP contains `word/document.xml`. For visual checking use installed Word or
   LibreOffice export to PDF, then the PDF skill. State when rendering is unavailable.
6. Deliver the absolute DOCX path and any PDF preview. Report unsupported tracked
   changes, complex fields, macros, chart editing or content that could not be
   preserved. python-docx does not provide an Office layout engine.

API reference: https://python-docx.readthedocs.io/en/latest/
