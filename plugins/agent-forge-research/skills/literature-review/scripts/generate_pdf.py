#!/usr/bin/env python3
"""Render reviewed Markdown with Pandoc/XeLaTeX and optional local CSL bibliography."""

# Agent Forge adaptation: all external I/O uses the task authorization policy.
import sys as _policy_sys
from pathlib import Path as _PolicyPath
_policy_sys.path.insert(0, str(_PolicyPath(__file__).resolve().parents[3] / "scripts"))
from research_policy import (authorize_read, authorize_write, authorized_open,
    authorized_request, AuthorizedSession, credential, publish_file)
open = authorized_open


import argparse
import os
import subprocess
import tempfile
import re
from pathlib import Path


def check_dependencies():
    """Check both executables; TeX package availability still needs a real render."""
    available = True
    for name in ('pandoc', 'xelatex'):
        try:
            subprocess.run([name, '--version'], capture_output=True, check=True)
            print(f'[OK] {name} is installed')
        except (subprocess.CalledProcessError, OSError):
            print(f'[FAIL] {name} is NOT installed')
            available = False
    return available


def generate_pdf(markdown_file: str, output_pdf: str = None,
                 citation_style: str = None, template: str = None,
                 toc: bool = True, number_sections: bool = True,
                 bibliography: str = None) -> bool:
    """Render PDF. Style is a local CSL path/name; omitted uses Pandoc's default.

    A sibling .bib is detected automatically. Pandoc citation syntax [@key] is
    required for citeproc; manually typed reference text is not reformatted.
    """
    source = authorize_read(markdown_file)
    destination = authorize_write(output_pdf or source.with_suffix('.pdf'))
    if not source.is_file() or source == destination:
        print('[FAIL] Input must exist and output must differ from input')
        return False
    if not check_dependencies():
        return False
    cmd = ['pandoc', str(source), '-o', str(destination), '--pdf-engine=xelatex',
           '--sandbox', '--from=markdown-raw_tex-raw_html-yaml_metadata_block',
           '--pdf-engine-opt=-no-shell-escape',
           '--resource-path', str(source.parent),
           '-V', 'geometry:margin=1in', '-V', 'fontsize=11pt',
           '-V', 'colorlinks=true', '-V', 'linkcolor=blue', '-V', 'urlcolor=blue',
           '-V', 'citecolor=blue', '--citeproc']
    if toc:
        cmd.extend(['--toc', '--toc-depth=3'])
    if number_sections:
        cmd.append('--number-sections')
    bib = authorize_read(bibliography) if bibliography else source.with_suffix('.bib')
    if bibliography and not bib.is_file():
        print(f'[FAIL] Bibliography not found: {bib}')
        return False
    if bib.is_file():
        bib = authorize_read(bib)
        cmd.extend(['--bibliography', str(bib)])
    if citation_style:
        style = Path(citation_style if citation_style.endswith('.csl') else citation_style + '.csl')
        if not style.is_file():
            style = source.parent / style
        if not style.is_file():
            print('[FAIL] Supply an existing CSL file with --csl; style names are not downloaded automatically')
            return False
        cmd.extend(['--csl', str(authorize_read(style))])
    if template:
        if not Path(template).is_file():
            print(f'[FAIL] Template not found: {template}')
            return False
        template_path = authorize_read(template)
        template_text = template_path.read_text(encoding='utf-8')
        if re.search(r'\\(?:input|include|openin|openout|read|write|immediate|catcode|csname)\b', template_text):
            raise ValueError('Template contains file or dynamic TeX commands; use a separately reviewed compiler workflow')
        cmd.extend(['--template', str(template_path)])
    # Pandoc's sandbox and disabled raw TeX constrain document interpretation.
    # Reject image paths outside the authorized source root before invoking it.
    source_text = source.read_text(encoding="utf-8")
    for image_target in re.findall(r"!\[[^\]]*\]\(([^)]+)\)", source_text):
        target = image_target.strip().split(' "', 1)[0].strip("<>")
        if "://" in target or target.startswith("data:"):
            raise ValueError("Remote embedded images require an explicit authorized download before rendering")
        image_path = authorize_read(source.parent / target)
        if not image_path.is_relative_to(source.parent):
            raise ValueError("Embedded images must remain inside the manuscript directory")
    try:
        with tempfile.TemporaryDirectory(prefix="research-pdf-", dir=destination.parent) as temporary_dir:
            rendered = Path(temporary_dir) / "rendered.pdf"
            command = list(cmd)
            command[command.index('-o') + 1] = str(rendered)
            subprocess.run(command, capture_output=True, text=True, check=True, cwd=temporary_dir, timeout=120)
            if not rendered.is_file() or not rendered.read_bytes().startswith(b'%PDF-'):
                print('[FAIL] Pandoc returned without a valid PDF output')
                return False
            publish_file(rendered.read_bytes(), destination)
        print(f'[OK] PDF generated: {destination}')
        return True
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, OSError) as exc:
        print(f'[FAIL] PDF rendering failed ({type(exc).__name__}); compiler output omitted from logs')
        return False


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('markdown_file', nargs='?')
    parser.add_argument('output_pdf', nargs='?', help='Legacy positional output path')
    parser.add_argument('-o', '--output')
    parser.add_argument('--csl', '--citation-style', dest='citation_style',
                        help='Local CSL path, or local style name such as apa (requires apa.csl)')
    parser.add_argument('--bibliography', help='Local .bib, .json or other Pandoc bibliography file')
    parser.add_argument('--template')
    parser.add_argument('--no-toc', action='store_true')
    parser.add_argument('--no-numbers', action='store_true')
    parser.add_argument('--check-deps', action='store_true')
    args = parser.parse_args()
    if args.check_deps:
        raise SystemExit(0 if check_dependencies() else 1)
    if not args.markdown_file:
        parser.error('markdown_file is required unless --check-deps is used')
    if args.output and args.output_pdf:
        parser.error('choose either positional output or --output')
    raise SystemExit(0 if generate_pdf(args.markdown_file, args.output or args.output_pdf,
                                      citation_style=args.citation_style, template=args.template,
                                      toc=not args.no_toc, number_sections=not args.no_numbers,
                                      bibliography=args.bibliography) else 1)


if __name__ == '__main__':
    main()
