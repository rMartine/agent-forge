---
name: operate-docker
description: Inspect, build, run, diagnose, and stop local Docker or Docker Compose workloads with explicit scope and data-preservation controls. Use for local container development, test dependencies, image verification, logs, or approved container lifecycle operations.
---

# Operate Docker

1. Verify Docker engine readiness, context, compose files, project name, volumes, and intended environment.
   For Windows execution or a DigitalOcean-bound artifact, read [Windows commands and deployment evidence](references/windows-and-digitalocean.md).
2. Prefer read-only inspection before build or lifecycle changes.
3. Preserve named volumes and databases unless deletion is explicitly authorized.
4. Use only Docker capabilities available in the active runtime; build with the repository command and report the exact image or service.
5. Start only scoped services, then verify health checks, ports, and logs.
6. Never expose secrets in commands or output.
