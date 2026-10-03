#!/usr/bin/env python3
"""
Google Scholar Search Tool
Search Google Scholar and export results.

Requests use the Agent Forge authorization policy. Access challenges are reported without retries or proxies.
"""

# Agent Forge adaptation: all external I/O uses the task authorization policy.
import sys as _policy_sys
from pathlib import Path as _PolicyPath
_policy_sys.path.insert(0, str(_PolicyPath(__file__).resolve().parents[3] / "scripts"))
from research_policy import (authorize_read, authorize_write, authorized_open,
    authorized_request, AuthorizedSession, credential, publish_file)
open = authorized_open


import sys
import argparse
import json
import time
import random
from typing import List, Dict, Optional
from itertools import islice

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent))

from _common import (  # noqa: E402
    citation_key,
    protect_title,
    render_entry,
)

from html.parser import HTMLParser
from urllib.parse import urljoin
import re

class _ScholarElement:
    def __init__(self, tag="", attrs=()):
        self.tag, self.attrs, self.children = tag, dict(attrs), []
    def text(self):
        return "".join(child.text() if isinstance(child, _ScholarElement) else child for child in self.children)
    def find(self, class_name=None, tag=None):
        found = []
        if (class_name is None or class_name in self.attrs.get("class", "").split()) and (tag is None or tag == self.tag):
            found.append(self)
        for child in self.children:
            if isinstance(child, _ScholarElement):
                found.extend(child.find(class_name, tag))
        return found

class _ScholarParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = _ScholarElement()
        self.stack = [self.root]
    def handle_starttag(self, tag, attrs):
        if len(self.stack) > 64:
            raise ValueError("Scholar HTML exceeds the permitted nesting depth")
        element = _ScholarElement(tag, attrs)
        self.stack[-1].children.append(element)
        if tag not in {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}:
            self.stack.append(element)
    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                del self.stack[index:]
                break
    def handle_data(self, data):
        self.stack[-1].children.append(data)

class GoogleScholarSearcher:
    """Search Google Scholar through the task-authorized network transport."""
    
    def __init__(self, use_proxy: bool = False):
        """Use only transport permitted by the research authorization."""
        if use_proxy:
            raise ValueError("Automatic proxy services are not supported; use an authorized browser when access is restricted")
        self.session = AuthorizedSession()
    
    def search(self, query, max_results=50, year_start=None, year_end=None, sort_by='relevance'):
        """Read Scholar result pages through authorized requests without bypassing blocks."""
        if not isinstance(max_results, int) or isinstance(max_results, bool) or not 1 <= max_results <= 1000:
            raise ValueError("max_results must be between 1 and 1000")
        results = []
        for offset in range(0, max_results, 10):
            params = {"q": query, "hl": "en", "start": offset, "num": min(10, max_results-offset)}
            if year_start is not None: params["as_ylo"] = year_start
            if year_end is not None: params["as_yhi"] = year_end
            response = self.session.get("https://scholar.google.com/scholar", params=params, timeout=30)
            if response.status_code != 200:
                raise RuntimeError(f"Scholar returned HTTP {response.status_code}; no retry or proxy attempted")
            parser = _ScholarParser()
            parser.feed(response.text)
            cards = parser.root.find(class_name="gs_ri")
            if not cards:
                if "did not match any articles" not in response.text.lower():
                    raise RuntimeError("Scholar returned an access challenge or an unsupported result page; use the authorized browser")
                break
            for card in cards:
                titles = card.find(class_name="gs_rt")
                if not titles:
                    raise RuntimeError("Scholar returned a record without a recognized title; no partial search is returned")
                title = titles[0]
                links = title.find(tag="a")
                bylines = card.find(class_name="gs_a")
                byline = bylines[0].text().strip() if bylines else ""
                author_text, _, publication_text = byline.partition(" - ")
                year_match = re.search(r"\b(?:19|20)\d{2}\b", publication_text)
                snippets = card.find(class_name="gs_rs")
                citation_texts = [link.text() for link in card.find(tag="a") if link.text().startswith("Cited by ")]
                citation_match = re.search(r"\d+", citation_texts[0]) if citation_texts else None
                results.append({
                    "title": title.text().strip(), "authors": author_text,
                    "year": year_match.group(0) if year_match else "",
                    "venue": publication_text, "abstract": snippets[0].text().strip() if snippets else "",
                "citations": int(citation_match.group(0)) if citation_match else None,
                    "url": urljoin("https://scholar.google.com", links[0].attrs.get("href", "")) if links else "",
                    "eprint_url": "", "metadata_status": "Search-result transcription; verify against the source before citation",
                })
                if len(results) >= max_results: break
            if len(cards) < 10: break
        if sort_by == "citations": results.sort(key=lambda result: result["citations"] if result["citations"] is not None else -1, reverse=True)
        return results
    
    def metadata_to_bibtex(self, metadata: Dict) -> str:
        """Convert metadata to BibTeX format.

        Scholar records carry no DOI and an unstructured venue string, so an
        entry built from one is a starting point: run it through the metadata
        enrichment pass before citing it.
        """
        authors = metadata.get('authors', '')

        key = citation_key(authors, metadata.get('year', ''), metadata.get('title', ''))

        # Determine entry type (guess based on venue)
        venue = metadata.get('venue', '').lower()
        if 'proceedings' in venue or 'conference' in venue or 'symposium' in venue:
            entry_type = 'inproceedings'
            venue_field = 'booktitle'
        else:
            entry_type = 'article'
            venue_field = 'journal'

        fields = {
            'author': authors,
            'title': protect_title(metadata.get('title', '')),
            venue_field: metadata.get('venue', ''),
            'year': metadata.get('year', ''),
            'url': metadata.get('url', ''),
        }

        # The citation count deliberately does not go in the `.bib`: it changes
        # every week, and baking it into a bibliography makes the file wrong
        # the moment it is written. It stays in the JSON output instead.

        return render_entry(entry_type, key, fields)


def main():
    """Command-line interface."""
    parser = argparse.ArgumentParser(
        description='Search Google Scholar through the task-authorized network transport',
        epilog='Example: python search_google_scholar.py "machine learning" --limit 50'
    )
    
    parser.add_argument(
        'query',
        help='Search query'
    )
    
    parser.add_argument(
        '--limit',
        type=int,
        default=50,
        help='Maximum number of results (default: 50)'
    )
    
    parser.add_argument(
        '--year-start',
        type=int,
        help='Start year for filtering'
    )
    
    parser.add_argument(
        '--year-end',
        type=int,
        help='End year for filtering'
    )
    
    parser.add_argument(
        '--sort-by',
        choices=['relevance', 'citations'],
        default='relevance',
        help='Order within retrieved results; citations is a local sort (default: relevance)'
    )
    
    parser.add_argument(
        '--use-proxy',
        action='store_true',
        help='Unsupported compatibility flag: automatic proxy access is rejected'
    )
    
    parser.add_argument(
        '-o', '--output',
        help='Output file (default: stdout)'
    )
    
    parser.add_argument(
        '--format',
        choices=['json', 'bibtex'],
        default='json',
        help='Output format (default: json)'
    )
    
    args = parser.parse_args()
    if args.limit < 1:
        parser.error('--limit must be positive')
    
    # Search
    searcher = GoogleScholarSearcher(use_proxy=args.use_proxy)
    results = searcher.search(
        args.query,
        max_results=args.limit,
        year_start=args.year_start,
        year_end=args.year_end,
        sort_by=args.sort_by
    )
    
    if not results:
        print('No results found', file=sys.stderr)
        sys.exit(1)
    
    # Format output
    if args.format == 'json':
        output = json.dumps({
            'query': args.query,
            'count': len(results),
            'results': results
        }, indent=2)
    else:  # bibtex
        bibtex_entries = [searcher.metadata_to_bibtex(r) for r in results]
        output = '\n\n'.join(bibtex_entries) + '\n'
    
    # Write output
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(output)
        print(f'Wrote {len(results)} results to {args.output}', file=sys.stderr)
    else:
        print(output)
    
    print(f'\nRetrieved {len(results)} results', file=sys.stderr)


if __name__ == '__main__':
    main()
