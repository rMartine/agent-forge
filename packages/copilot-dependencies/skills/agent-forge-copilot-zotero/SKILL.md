---
name: agent-forge-copilot-zotero
description: Search the local Zotero library, inspect collections and tags, export BibTeX and retrieve requested full text using a portable standard-library client.
---

# Local Zotero

Use the supplied Python standard-library helper. Zotero Desktop must be running
and its local API enabled; the API is at localhost port 23119. No API key is copied
or required for that local read interface. If unavailable, report the local API gate
and have the user enable it in Zotero settings; do not edit a running profile.

1. Probe readiness: `python scripts/zotero.py status`.
2. Search `python scripts/zotero.py search "query"`; inspect `collections`, `tags`
   or `items`. Pagination is automatic, 100 records per page. Report title, authors,
   year, Zotero item key and DOI when present; a Zotero key is not a BibTeX key.
3. Export all or selected items:
   `python scripts/zotero.py export-bibtex --key ABCD1234 --output references.bib`.
   Repeat `--key` for multiple items, omit it for the whole library. Inspect actual
   exported entry keys before inserting `\cite{key}` or Markdown `[@key]` into a
   draft. Update a `.bib` copy and preserve unrelated entries. Do not invent keys.
4. Retrieve attachment metadata with `children ITEMKEY`. Retrieve `fulltext KEY`
   only when the user requests full text. API extraction is not a license to read
   unrelated local attachment files. Record source item/page evidence when available.
5. To import authorized BibTeX/RIS, select the intended collection in Zotero, run
   `selected-target`, and inspect its returned library/collection. Then run
   `import records.bib --allow-write`. Import uses the Connector and the currently
   selected target; keep the selected target unchanged between those operations.
   The explicit flag records intent, not authorization: obtain authorization from
   the user's request. Never import merely as an installation check.
6. For failures distinguish closed port, disabled API, HTTP errors, absent items
   and malformed import data. Do not change Zotero database files directly.
7. Deliver output paths and verified citation metadata, noting incomplete fields.

Reference: https://www.zotero.org/support/dev/web_api/v3/basics
