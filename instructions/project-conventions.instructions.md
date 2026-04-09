---
description: "Use when: scaffolding projects, creating files, configuring builds, setting up local dev, choosing tech stack defaults, adding dependencies, structuring repos, writing Docker configs, defining environment variables"
---

# Project Conventions

## Tech Stack Defaults

> **Note:** These are defaults for web application projects. Adapt them to the actual project type. For VS Code extensions, desktop apps, CLIs, or other non-web projects, ignore web-specific defaults (Next.js, React, Tailwind, ORM, etc.) and use the conventions appropriate for that platform.

- **Web**: TypeScript, Next.js (App Router), React, Node.js, Tailwind CSS
- **Database**: PostgreSQL with PostGIS and PGVector extensions — always
- **ORM**: Drizzle ORM (preferred), Prisma as fallback
- **Local AI**: Ollama for local model inference
- **Containers**: Docker and Docker Compose for all services
- **Cloud**: DigitalOcean (Droplets, App Platform, Managed DBs). GitHub is for version control only — no GitHub Actions, Pages, or CI/CD.

## Repository Structure

Use a mono-repo for development. Each app deploys independently to production.

```
apps/                  # Deployable applications (each has its own Dockerfile)
packages/              # Shared libraries (imported by apps)
scripts/               # Dev tooling, seed scripts, utilities
project_docs/          # All project documentation (NOT in .github/)
  requirements/        # Product requirements, user stories, interview notes
  architecture/        # ADRs, system design, diagrams
  backlog/             # Sprint plans, backlog items, status reports
  knowledge/           # Local cache of knowledge base entries
  docs/                # User-facing and developer-facing documentation
docker-compose.yml     # Local dev services (DB, Redis, Ollama, etc.)
run-dev.sh             # Single entry point for local development
run-dev.ps1            # Windows equivalent
```

## Local Development

- A single `run-dev` script starts all local services (Docker Compose up, dev servers, etc.)
- Every README must include instructions for running the project via `run-dev`
- Local services: PostgreSQL, Redis (if needed), Ollama — all via Docker Compose
- WSL is available for Linux-specific tooling on Windows

## Deployment

- Only the user deploys to cloud infrastructure (DigitalOcean)
- Agents prepare deployment configs but NEVER execute cloud deployments
- Each app in the mono-repo deploys independently
- Use environment-specific configs: `.env.development`, `.env.production`

## Project Documentation

All project artifacts go in `project_docs/`, organized by domain:

| Subdirectory | Owner Agent | Contents |
|-------------|-------------|----------|
| `requirements/` | `@requirements-engineer` | Product requirements, user stories, interview transcripts |
| `architecture/` | `@software-architect` | ADRs, system design docs, diagrams |
| `backlog/` | `@project-manager` | Sprint plans, backlog, status reports |
| `knowledge/` | `@knowledge-engineer` | Local cache of knowledge base entries relevant to this project |
| `docs/` | `@technical-writer` | README, API docs, user guides, runbooks, changelogs |
