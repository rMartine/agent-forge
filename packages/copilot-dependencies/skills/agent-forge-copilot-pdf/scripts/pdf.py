"""Local PDF inspection, extraction, rendering and basic creation."""
import argparse
import json
import textwrap
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    for command in ("inspect", "text", "render", "create"):
        p = sub.add_parser(command)
        p.add_argument("input", type=Path)
        if command != "inspect":
            p.add_argument("output", type=Path)
        if command == "render":
            p.add_argument("--dpi", type=int, default=144)
    args = parser.parse_args()
    import pymupdf
    if args.command != "inspect" and args.output.exists():
        parser.error("Output exists; choose a new output path")
    if args.command == "create":
        lines = []
        for paragraph in args.input.read_text(encoding="utf-8-sig").splitlines():
            lines.extend(textwrap.wrap(paragraph, width=85) or [""])
        with pymupdf.open() as doc:
            for start in range(0, max(1, len(lines)), 48):
                page = doc.new_page(width=595, height=842)
                page.insert_text((50, 60), "\n".join(lines[start:start + 48]), fontsize=11, lineheight=1.35)
            args.output.parent.mkdir(parents=True, exist_ok=True)
            doc.save(args.output)
        print(str(args.output.resolve()))
        return
    with pymupdf.open(args.input) as doc:
        if doc.needs_pass:
            parser.error("Encrypted file requires an authorized password; no password was requested or logged")
        if args.command == "inspect":
            print(json.dumps({"pages": len(doc), "metadata": doc.metadata, "textCharacters": [len(page.get_text()) for page in doc]}, ensure_ascii=False, indent=2))
        elif args.command == "text":
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text("\n".join(f"\n--- Page {i+1} ---\n{page.get_text(sort=True)}" for i, page in enumerate(doc)), encoding="utf-8")
            print(str(args.output.resolve()))
        else:
            if not 36 <= args.dpi <= 600:
                parser.error("DPI must be between 36 and 600")
            args.output.mkdir(parents=True)
            for i, page in enumerate(doc):
                page.get_pixmap(dpi=args.dpi).save(args.output / f"page-{i+1:04}.png")
            print(str(args.output.resolve()))


if __name__ == "__main__":
    main()
