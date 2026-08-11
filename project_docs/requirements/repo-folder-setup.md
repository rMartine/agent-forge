# Repository Folder Setup

The extension accepts only a folder containing `agent-forge.manifest.jsonc`. It does not silently scaffold a selected folder.

The optional core `scaffoldRepo()` operation creates a neutral starter structure only after explicit caller intent. It must not assume a monorepo, PostgreSQL, DigitalOcean, Docker, Claude files, prompts, or any application stack.

Required canonical directories for this repository are:

```text
agents/        canonical VS Code custom agents
skills/        Agent Skills
instructions/  scoped instruction files
config/        capability/model/provider catalogs
schemas/       JSON contracts
hooks/         optional preview hooks
evals/         agent, skill, lifecycle, failure fixtures
packages/      core, CLI, extension
project_docs/  requirements, architecture, audits, knowledge
```

Development-only source discovery is configured in `.vscode/settings.json`; installed user artifacts are always resolved from manifest targets.
