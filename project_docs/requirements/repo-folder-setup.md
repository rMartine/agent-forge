# Repository Folder Setup

The extension accepts only a folder containing `agent-forge.manifest.jsonc`. It does not silently scaffold a selected folder.

The optional core `scaffoldRepo()` operation creates a neutral starter structure only after explicit caller intent. It must not assume a monorepo, PostgreSQL, DigitalOcean, Docker, Claude files, prompts, or any application stack.

Required canonical directories for this repository are:

```text
agents/        canonical cross-runtime agent sources
skills/        canonical runtime-neutral workflow modules
instructions/  scoped instruction files
config/        capability/model/provider catalogs
schemas/       JSON contracts
hooks/         optional preview hooks
evals/         agent, skill, lifecycle, failure fixtures
packages/      core, CLI, extension
project_docs/  requirements, architecture, audits, knowledge
```

Canonical source discovery is intentionally not configured in `.vscode/settings.json`; installed user artifacts are resolved only from manifest targets. Scaffolding generates `AGENTS.md`, Copilot instructions, or both only from explicit runtime intent.
