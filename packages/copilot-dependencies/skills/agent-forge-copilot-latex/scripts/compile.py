"""Compile an authorized LaTeX document using an existing local engine."""
import argparse
import shutil
import subprocess
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--engine", choices=["auto", "latexmk", "pdflatex", "tectonic"], default="auto")
    args = parser.parse_args()
    source = args.source.resolve(strict=True)
    if source.suffix.lower() != ".tex":
        parser.error("Source must be a .tex file")
    choices = ["latexmk", "pdflatex", "tectonic"] if args.engine == "auto" else [args.engine]
    engine = next((e for e in choices if shutil.which(e)), None)
    if engine is None:
        parser.error("No requested TeX engine is installed; preserve source and report unverified compilation")
    out = source.parent / "build"
    out.mkdir(exist_ok=True)
    arguments = {
        "latexmk": ["-pdf", "-interaction=nonstopmode", "-halt-on-error", "-no-shell-escape", f"-outdir={out}", str(source)],
        "pdflatex": ["-interaction=nonstopmode", "-halt-on-error", "-no-shell-escape", f"-output-directory={out}", str(source)],
        "tectonic": ["--untrusted", "--keep-logs", "--outdir", str(out), str(source)],
    }
    for _ in range(2 if engine == "pdflatex" else 1):
        result = subprocess.run([shutil.which(engine), *arguments[engine]], cwd=source.parent, timeout=180, check=False)
        if result.returncode:
            return result.returncode
    pdf = out / (source.stem + ".pdf")
    if not pdf.exists():
        return 1
    print(str(pdf))
    return 0


if __name__ == "__main__":
    sys.exit(main())
