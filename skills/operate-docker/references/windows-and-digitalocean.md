# Windows commands and deployment evidence

Use only for the assigned local container operation or explicitly authorized external deployment. Inspect Docker context, engine status, compose files, project name, current services, named volumes, port ownership, and intended environment before mutation. Read and preserve repository procedures.

## PowerShell and local ownership

Use PowerShell end to end for file operations, with argument arrays and literal paths rather than assembled command strings or nested cmd/bash quoting. Follow [PowerShell quoting rules](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_quoting_rules). Do not print secret values from environment files. Keep working directories explicit; verify an absolute target stays inside the intended workspace before any recursive deletion or move. Background helpers started with Start-Process use a hidden window unless visible interaction is requested.

Give temporary Compose work a distinct project name when multiple checkouts share the engine; inspect [Compose project names](https://docs.docker.com/compose/how-tos/project-name/) and existing configuration. Start and stop only the selected services. Do not prune globally, delete preserved volumes, remove unrelated containers, or reuse personal services without an established project procedure. A test failure is not permission to reset data.

Build through the repository command. Preserve runtime, dependency manager, and base image constraints. Avoid secrets in image layers. Check actual startup, health, required ports, shutdown, and relevant service logs. An image build alone does not establish readiness. Package tuning or smaller images are not an extra goal unless requested or necessary for a stated requirement.

## DigitalOcean

Use the existing authorized DigitalOcean capability or installed doctl; its [official reference](https://docs.digitalocean.com/reference/doctl/) supplies current command semantics. Confirm the account, exact application or resource identifier, artifact revision/digest, environment, and intended destination without exposing credentials. Prepare the concrete plan, health checks, and recovery target before requesting any authorization still missing. Existing authorization need not be requested again.

Do not create cloud resources, change billing, rotate secrets, publish an image, or deploy a product merely because a local Docker task succeeded. When external deployment is authorized, record the actual provider operation, health/ingress observation, application check, and recovery option. A prepared configuration is not a completed deployment, and a healthy container is not proof of the full user flow.
