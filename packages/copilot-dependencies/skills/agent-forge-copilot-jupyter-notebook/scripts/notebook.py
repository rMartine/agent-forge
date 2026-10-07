"""Scaffold or inspect nbformat 4 notebooks without executing cells."""
import argparse
import json
import uuid
from pathlib import Path


def cell(kind, source):
    result = {"id": uuid.uuid4().hex[:8], "cell_type": kind, "metadata": {}, "source": source.splitlines(keepends=True)}
    if kind == "code":
        result.update(execution_count=None, outputs=[])
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    create = sub.add_parser("create")
    create.add_argument("--kind", choices=["experiment", "tutorial"], required=True)
    create.add_argument("--title", required=True)
    create.add_argument("--output", type=Path, required=True)
    inspect = sub.add_parser("inspect")
    inspect.add_argument("input", type=Path)
    args = parser.parse_args()
    if args.command == "inspect":
        notebook = json.loads(args.input.read_text(encoding="utf-8-sig"))
        print(json.dumps({"nbformat": notebook.get("nbformat"), "metadata": notebook.get("metadata"), "cells": [{"index": i, "type": c.get("cell_type"), "source": "".join(c.get("source", [])), "execution_count": c.get("execution_count"), "output_count": len(c.get("outputs", []))} for i, c in enumerate(notebook.get("cells", []))]}, ensure_ascii=False, indent=2))
        return
    if args.output.exists():
        parser.error("Output exists; choose a new output path")
    sections = ["Question and assumptions", "Data and provenance", "Method", "Analysis", "Sensitivity and limitations", "Conclusions"] if args.kind == "experiment" else ["Learning objectives", "Prerequisites", "Worked example", "Guided exercise", "Independent practice", "Recap"]
    cells = [cell("markdown", f"# {args.title}\n\nExecution status: not executed.\n")]
    cells.extend([cell("markdown", "## Environment\nRecord the interpreter, versions and data paths.\n"), cell("code", "import platform\nprint(platform.python_version())\n")])
    for section in sections:
        cells.append(cell("markdown", f"## {section}\n\nComplete from the authorized brief.\n"))
    notebook = {"nbformat": 4, "nbformat_minor": 5, "metadata": {"kernelspec": {"name": "python3", "display_name": "Python 3", "language": "python"}, "language_info": {"name": "python"}}, "cells": cells}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(notebook, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(str(args.output.resolve()))


if __name__ == "__main__":
    main()
