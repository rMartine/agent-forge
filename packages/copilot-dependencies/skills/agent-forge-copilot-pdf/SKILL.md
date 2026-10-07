---
name: agent-forge-copilot-pdf
description: Inspect, extract, render, create, merge and redact PDF files with a local PyMuPDF installation.
---

# PDF files

Use PyMuPDF with the interpreter reported by `__COPILOT_RUNTIME__/dependencies/discover.mjs`.
Keep the original intact; PyMuPDF is separately installed under its own license.

1. Run `python scripts/pdf.py inspect input.pdf`. Establish page count, text layer,
   metadata, encryption and requested page range. Preserve page numbers when citing.
2. Extract text: `python scripts/pdf.py text input.pdf text.txt`. Extraction order
   may differ from reading order for multi-column pages; inspect the rendered page.
   Scanned pages require separately installed Tesseract and explicit OCR. Never
   infer missing text as if it was read. For requested OCR use
   `page.get_textpage_ocr()` and `page.get_text(textpage=...)`; record OCR uncertainty.
3. Render pages: `python scripts/pdf.py render input.pdf output-pages --dpi 144`.
   The directory must not exist. View resulting PNGs with available image tools.
4. Create a simple multi-page PDF from UTF-8 text:
   `python scripts/pdf.py create text.txt output.pdf`. For typographic documents,
   create DOCX or LaTeX and export with an available layout engine. The simple helper
   uses a built-in font; complex scripts need a suitable embedded font and layout.
5. Edit with `pymupdf.open`: `insert_pdf` for merges, `select` for rearrangement,
   `page.insert_text`/`insert_image` for additions. For redaction use
   `add_redact_annot` followed by `apply_redactions`, then save a new file with
   garbage collection; drawing a rectangle does not remove underlying information.
6. Check saved page count, extracted text and rendered pages for clipping, missing
   glyphs, unreadable tables and blank pages. Verify actual removal for redactions.
   Tell the user if fonts, forms, signatures, accessibility tags or encryption limit
   safe editing. Editing can invalidate a digital signature.
7. Deliver absolute file paths, page references and remaining limitations.

API reference: https://pymupdf.readthedocs.io/en/latest/
