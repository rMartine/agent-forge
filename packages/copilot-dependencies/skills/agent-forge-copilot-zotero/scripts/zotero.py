"""Local Zotero API reads and explicitly requested Connector imports; stdlib only."""
import argparse
import json
import re
import sys
import uuid
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

BASE = "http://127.0.0.1:23119"


def request(route, params=None, body=None, content_type=None):
    url = BASE + route + ("?" + urlencode(params, doseq=True) if params else "")
    headers = {"Zotero-API-Version": "3", "Accept": "application/json, text/plain, */*"}
    if content_type:
        headers["Content-Type"] = content_type
    req = Request(url, data=body, headers=headers)
    with urlopen(req, timeout=15) as response:
        return response.read().decode("utf-8"), response.headers


def paged(route, params=None):
    result, offset = [], 0
    while True:
        text, _ = request(route, {**(params or {}), "limit": 100, "start": offset})
        items = json.loads(text)
        if not isinstance(items, list):
            raise ValueError("Expected a Zotero list response")
        result.extend(items)
        if len(items) < 100:
            return result
        offset += len(items)


def key(value):
    if not re.fullmatch(r"[A-Z0-9]{8}", value):
        raise argparse.ArgumentTypeError("Expected an eight-character Zotero item key")
    return value


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    for command in ("status", "items", "collections", "tags", "selected-target"):
        sub.add_parser(command)
    search = sub.add_parser("search")
    search.add_argument("query")
    for command in ("children", "fulltext"):
        p = sub.add_parser(command)
        p.add_argument("key", type=key)
    export = sub.add_parser("export-bibtex")
    export.add_argument("--key", action="append", type=key)
    export.add_argument("--output", required=True, type=Path)
    imp = sub.add_parser("import")
    imp.add_argument("input", type=Path)
    imp.add_argument("--allow-write", action="store_true")
    args = parser.parse_args()
    route = "/api/users/0/"
    if args.command == "status":
        request("/api/")
        result = {"localApi": "available", "baseUrl": BASE, "writeInterface": "connector"}
    elif args.command == "selected-target":
        text, _ = request("/connector/getSelectedCollection", body=b"{}", content_type="application/json")
        result = json.loads(text)
    elif args.command == "import":
        if not args.allow_write:
            parser.error("Import requires authorized intent and --allow-write")
        if args.input.suffix.lower() not in (".bib", ".ris"):
            parser.error("Import input must be .bib or .ris")
        text, _ = request("/connector/import", {"session": str(uuid.uuid4())}, args.input.read_bytes(), "text/plain")
        result = {"response": text, "target": "currently selected Zotero collection"}
    elif args.command == "export-bibtex":
        if args.output.exists():
            parser.error("Output already exists; choose a new output path")
        keys = args.key
        if not keys:
            text, _ = request(route + "items", {"format": "keys"})
            keys = [line for line in text.splitlines() if line]
        entries = []
        for offset in range(0, len(keys), 50):
            text, _ = request(route + "items", {"itemKey": ",".join(keys[offset:offset + 50]), "format": "bibtex", "limit": 100})
            entries.append(text)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text("\n".join(entries), encoding="utf-8")
        result = {"path": str(args.output.resolve()), "requestedItems": len(keys), "bibtexEntries": len(re.findall(r"(?m)^@\w+\s*\{", "\n".join(entries)))}
    elif args.command in ("children", "fulltext"):
        text, _ = request(route + f"items/{args.key}/{args.command}")
        result = json.loads(text)
    else:
        endpoint = "items" if args.command == "search" else args.command
        result = paged(route + endpoint, {"q": args.query} if args.command == "search" else None)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    try:
        main()
    except HTTPError as error:
        print(f"Zotero HTTP {error.code}: check local API and requested route", file=sys.stderr)
        sys.exit(1)
    except URLError:
        print("Zotero local API unavailable at 127.0.0.1:23119; check Desktop and local API setting", file=sys.stderr)
        sys.exit(1)
