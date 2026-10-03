# External research skills and local adaptations

The plugin retains all 211 files from the nine selected skill directories. It does not include either upstream installer, an automatic updater, or the rest of either upstream repository. `external-sources.json` records each original file hash, the adapted file hash, its original repository path, and the exact source commit. The manifest distinguishes copying a resource from changing it.

The six K-Dense skills come from `K-Dense-AI/scientific-agent-skills` at `154988403bb5a18e9d3c0ce4e6d5e2e4b184a298`, under the MIT license retained in `licenses/K-Dense-MIT.txt`. The three Nature packages come from `Yuan1z0825/nature-skills` at `84880815fb37317b3766bff2c2abba395b8993c3`, under the Apache-2.0 license retained in `licenses/Nature-Apache-2.0.txt`. These are local modifications by the Agent Forge research plugin, dated 2026-10-02. Neither project is represented as endorsing the adaptations.

## Changes to executable behavior

- Citation HTTP clients use `research_policy.AuthorizedSession`. Arbitrary publisher URLs, service redirects, credentials, request size, response size, and permitted methods are governed by the task authorization. Public metadata searches can run without credentials. Optional credentials are obtained only through the policy; explicit key arguments cannot bypass it. Bibliographic fields that cannot be parsed produce a diagnostic count rather than silently disappearing.
- Google Scholar requests use the same policy-controlled transport and a bounded standard-library HTML parser. The search preserves supplied records and their verification status, stops on challenges or unrecognized records, and does not use scholarly's automatic proxy discovery. A missing citation count is unknown rather than zero. This parser was tested against local representative HTML, not the live service.
- The OpenRouter generator retains image generation, model review, bounded refinement, and preservation of an earlier image if review or refinement fails. It no longer searches parent directories for credentials or launches a child process. It requires explicit image/review model identifiers, policy-approved credentials, and a conservative cost reservation per request. Output destinations are checked before generation; reports omit prompts and critique text. No live paid request was used during validation.
- Nature's LaTeX checker resolves static includes only inside the manuscript root, rejects absolute includes and cycles, and limits expansion to 24 levels, 256 files, and 8 MiB. Its mismatch diagnostics omit manuscript excerpts. It does not execute LaTeX.
- User file reads and file publication use the common authorization module. Writes preserve existing outputs unless the authorization permits replacement; a command-line force option does not grant that permission. Visualization renders retain temporary internal files and publish through the common module.
- The optional Markdown-to-PDF helper validates explicit paths, rejects remote image references, disables raw TeX, raw HTML and YAML metadata, uses Pandoc's sandbox and XeLaTeX's no-shell-escape option, and publishes a temporary PDF only after checking its file signature. It rejects templates containing file or dynamic TeX commands. This is not a general-purpose sandbox for arbitrary hostile TeX or third-party compiler binaries. Prefer the native document editor for standalone LaTeX. Actual Pandoc/XeLaTeX compilation was not performed in the adaptation tests.

## Changes to instructions

Each skill now limits work to the research question, methods, data, sources, outputs, and effort authorized by Roberto. The requested deliverable language takes precedence. Upstream routing suggestions do not install other skills. Use of the skill does not automatically add an upstream paper to the research bibliography. Existing scientific guidance, references, templates, and examples remain available; optional provider or dependency examples require the task's authorization before use.

Nature's terminology and revision guidance respects the restriction on abbreviating responsibilities or conditions, the authorized editing scope, and checks proportional to changed material. Scientific choices remain with Roberto unless delegated. A successful diagnostic, model score, or synthetic test is not evidence that a real study, literature review, or submission is scientifically valid.

## Dependency and verification records

`requirements-direct.txt` pins the Python packages required by retained executable helpers. `runtime-windows-python312.lock.txt` records the tested Windows Python 3.12 package set and distribution hashes. Optional example libraries and external Pandoc/XeLaTeX executables are not installed by a skill or hook.

`tests/test_external_skills.py` exercises real authorization checks, representative local provider responses, BibTeX parsing, LaTeX includes, schematic persistence, a real PNG export, full-factorial design, reproducible blocked randomization, and statistical handling of missing and flagged observations. Upstream Nature tests retain their content checks with a mocked file-authorization function; separate local tests exercise that actual boundary. There were no paid provider calls or live bibliographic searches in these tests.

Future changes require reviewing the changed source/resources and updating the adapted hashes. Do not replace local files from a moving branch during session startup.

## Skill metadata compatibility

The six K-Dense SKILL.md files retain their complete upstream compatibility text under `metadata.compatibility`. The field was moved from the top level so the official skill validator accepts the frontmatter schema; no compatibility information was removed. Their six adapted file hashes were updated after this packaging change.
