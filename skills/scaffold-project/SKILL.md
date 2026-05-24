---
name: scaffold-project
description: "Scaffold a new project with the team's mandatory layout: mono-repo, global .env.development/.env.production, run-dev.ps1 / run-prod.ps1 / validate-env.ps1 scripts that fan env vars out to per-app .env files, project_docs/ skeleton, and a placeholder CLAUDE.local.md for domain context. Use when starting a new project, initializing a repo, or setting up local development."
argument-hint: "Describe the project (e.g., 'SaaS app with Next.js frontend and Node.js API', 'XR digital twin with Unity + IoT ingester', 'agentic learning platform with LangGraph and RAG')."
---

# Scaffold Project

Creates a project skeleton that complies with the team's SDLC (see `CLAUDE.md` at the workspace root for the full standard). The structure is **domain-agnostic**; domain knowledge goes into `CLAUDE.local.md` and `project_docs/domain/` later.

## When to Use

- Starting a new product or application
- Initializing a fresh repository
- Setting up local development infrastructure

## Procedure

### 1. Gather requirements

Ask the user for:

- Project name
- Apps in the mono-repo (web, api, mobile, desktop, worker, ML training, etc.)
- Target deployment platform — defer to `@software-architect` if unsure; do NOT assume DigitalOcean
- Any external services that will need API keys (Mailgun, Stripe, OpenAI, etc.) — see step 4 for handling

### 2. Create the mono-repo structure

```
{project-name}/
├── apps/
│   └── {app-name}/                # One per deployable app
│       ├── Dockerfile
│       ├── src/
│       └── package.json (or equivalent for the stack)
├── packages/                       # Shared libraries
├── scripts/                        # Project-internal tooling (not the mandatory ones)
├── project_docs/
│   ├── requirements/
│   ├── architecture/
│   │   └── env-policy.md           # Documents one-env fallback policy
│   ├── backlog/
│   ├── knowledge/
│   ├── domain/                     # Shared domain context (commitable)
│   └── docs/
├── docker-compose.yml              # Local services (DB, Redis, Ollama, etc. — only what the project needs)
├── run-dev.ps1                     # MANDATORY
├── run-prod.ps1                    # MANDATORY
├── validate-env.ps1                # MANDATORY
├── .env.example                    # Committed; every key with placeholder + one-line comment
├── .env.development                # GITIGNORED; created from .env.example by the user
├── .env.production                 # GITIGNORED; created from .env.example by the user
├── .gitignore                      # Includes .env.development, .env.production, CLAUDE.local.md
├── CLAUDE.md                       # Project conventions (extends workspace CLAUDE.md)
├── CLAUDE.local.md                 # Domain context placeholder; user fills in
└── README.md
```

### 3. Create the mandatory scripts (PowerShell primary)

Generate `run-dev.ps1`, `run-prod.ps1`, and `validate-env.ps1` using the templates below. PowerShell is the primary form because the user is on Windows. Add `.sh` mirrors only if the user explicitly requests Linux/macOS contributor support.

#### `run-dev.ps1` template

```powershell
#!/usr/bin/env pwsh
# Reads .env.development, fans variables out to apps/<app>/.env, starts services.
param([switch]$NoDocker)

$ErrorActionPreference = 'Stop'
$envFile = '.env.development'
if (-not (Test-Path $envFile)) { throw "Missing $envFile. Copy from .env.example and fill values." }

# Parse .env.development
$globalEnv = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)$') {
        $key = $matches[1]
        $val = $matches[2].Trim('"').Trim("'")
        # Expand $env:NAME references against the host's environment
        if ($val -match '^\$env:(.+)$') {
            $hostVar = $matches[1]
            $val = [Environment]::GetEnvironmentVariable($hostVar)
            if ([string]::IsNullOrEmpty($val)) {
                Write-Warning "$key references `$env:$hostVar but it's not set in your system environment."
            }
        }
        $globalEnv[$key] = $val
    }
}

# Fan out to each app: variables with <APP_PREFIX>_KEY go to apps/<app>/.env stripped of the prefix
Get-ChildItem -Path 'apps' -Directory | ForEach-Object {
    $app = $_.Name
    $prefix = $app.ToUpper().Replace('-', '_') + '_'
    $appEnvPath = Join-Path $_.FullName '.env'
    $appLines = @()
    $globalEnv.GetEnumerator() | ForEach-Object {
        if ($_.Key.StartsWith($prefix)) {
            $appLines += "$($_.Key.Substring($prefix.Length))=$($_.Value)"
        } elseif ($_.Key -notmatch '^[A-Z]+_[A-Z]') {
            # No prefix -> shared across all apps
            $appLines += "$($_.Key)=$($_.Value)"
        }
    }
    $appLines | Out-File -FilePath $appEnvPath -Encoding utf8
    Write-Host "Wrote $appEnvPath ($($appLines.Count) vars)" -ForegroundColor Green
}

if (-not $NoDocker -and (Test-Path 'docker-compose.yml')) {
    docker compose up -d
}

# TODO: per-app dev server startup. Customize per project.
Write-Host "`nDev environment ready. Start your app dev servers as needed." -ForegroundColor Cyan
```

#### `run-prod.ps1` template

```powershell
#!/usr/bin/env pwsh
# Reads .env.production, fans variables out, builds and pushes images, triggers deploy.
param([switch]$DryRun, [switch]$AutoConfirm)

$ErrorActionPreference = 'Stop'
$envFile = '.env.production'
if (-not (Test-Path $envFile)) { throw "Missing $envFile. Copy from .env.example and fill values." }

if (-not $AutoConfirm) {
    $confirm = Read-Host "About to deploy to PRODUCTION. Type 'yes' to continue"
    if ($confirm -ne 'yes') { Write-Host "Aborted."; exit 1 }
}

# (Reuse the fan-out block from run-dev.ps1, reading .env.production instead.)
# Then: docker build, docker push, platform-specific deploy.
# DO NOT assume DigitalOcean — read project_docs/architecture/ for the chosen target.
```

#### `validate-env.ps1` template

```powershell
#!/usr/bin/env pwsh
# Checks that every env reference in source code exists in .env.development and .env.production.
$ErrorActionPreference = 'Stop'

$patterns = @(
    'process\.env\.([A-Z][A-Z0-9_]+)',
    'os\.getenv\([''"]([A-Z][A-Z0-9_]+)[''"]\)',
    'import\.meta\.env\.([A-Z][A-Z0-9_]+)'
)
$referenced = @{}
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.jsx,*.py,*.mjs -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch 'node_modules|\.git|dist|build' } |
    ForEach-Object {
        $content = Get-Content $_.FullName -Raw
        foreach ($p in $patterns) {
            [regex]::Matches($content, $p) | ForEach-Object {
                $referenced[$_.Groups[1].Value] = $true
            }
        }
    }

$missing = @{ dev = @(); prod = @() }
foreach ($envName in @('development', 'production')) {
    $f = ".env.$envName"
    if (-not (Test-Path $f)) { Write-Warning "Missing $f"; continue }
    $defined = @{}
    Get-Content $f | ForEach-Object {
        if ($_ -match '^\s*([A-Z][A-Z0-9_]*)\s*=') { $defined[$matches[1]] = $true }
    }
    foreach ($k in $referenced.Keys) {
        if (-not $defined.ContainsKey($k)) { $missing[$envName] += $k }
    }
}

if ($missing.dev.Count -or $missing.prod.Count) {
    Write-Error "Missing variables.`n  dev: $($missing.dev -join ', ')`n  prod: $($missing.prod -join ', ')"
    exit 1
}
Write-Host "All env references satisfied." -ForegroundColor Green
```

### 4. Create `.env.example` with documented placeholders

For every variable the project will need, write:

```env
# What this variable is for (one line)
APP_PREFIX_VARIABLE_NAME=
```

For variables that reference user-system credentials (Mailgun, Doctl, OpenAI keys, etc.), use the env-var-name reference pattern:

```env
# Mailgun API key. Set MAILGUN_API_KEY in your Windows system env.
MAILGUN_API_KEY=$env:MAILGUN_API_KEY
```

When scaffolding, **ask the user for the NAME** of each system env variable, never for the value itself.

### 5. Create `.gitignore`

Always include:

```gitignore
node_modules/
dist/
build/
.next/
__pycache__/
*.pyc

# Mandatory: never commit env files except the example
.env
.env.development
.env.production
apps/*/.env

# Mandatory: project-local domain context is private
CLAUDE.local.md
```

### 6. Create `CLAUDE.local.md` placeholder

```markdown
# Project Domain Context

Fill this with project-specific knowledge that agents need to do good work but should NOT be committed to the repo (because it's client-specific, sensitive, or just yours).

Suggested sections:

- **Glossary** — acronyms, names, terms specific to this project's domain.
- **External APIs / SDKs** — endpoints, auth flows, quirks.
- **Business rules** — exceptions, regulatory constraints, client policies.
- **Open questions** — things to clarify with the client or the team.
```

### 7. Create project `CLAUDE.md`

A short file that extends the workspace `CLAUDE.md` with anything project-specific (chosen deployment platform, naming conventions for THIS project, link to architecture decisions). Do not duplicate the workspace standards — link to them.

### 8. Create `docker-compose.yml`

Only include services the project actually needs. Examples by project type:

- Web/API with relational DB → PostgreSQL 16 (with PostGIS / PGVector if the project uses geo or embeddings)
- Background workers → add Redis
- Local LLM inference → add Ollama
- XR / Digital Twin → may need MQTT broker, time-series DB, etc.
- Pure data-science / ML → may not need a compose file at all

Always: named volumes for persistence, health checks per service.

### 9. Initialize `project_docs/`

Add a placeholder `README.md` in each subdirectory explaining its purpose. Include `env-policy.md` in `architecture/` with the one-environment-fallback decision (warn-and-fallback / fail / stub).

### 10. Initial `README.md`

Project one-liner, prerequisites (Docker Desktop, Node.js, PowerShell), quick start via `run-dev.ps1`, project structure overview, link to `project_docs/`.

## What this skill DOES NOT do

- Pick a deployment platform — that's `@software-architect`.
- Configure cloud credentials — that's the user's system env, surfaced via env-var-name references.
- Write application code — once scaffolding is done, hand off to `@principal-engineer` to implement.

## Output

A scaffolded directory ready for `cd <project> && pwsh run-dev.ps1`. Verify by running `pwsh validate-env.ps1` against the new `.env.example` (will emit empty-value warnings, that's expected — it confirms the script works).
