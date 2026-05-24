#Requires -Version 5.1

<#
.SYNOPSIS
    Commit Fases 1-5 + extras (deploy scripts) en commits atomicos.

.DESCRIPTION
    Hace los commits en orden logico para que la historia quede limpia.
    Asume que estas en la rama feat/port-to-claude-code con los cambios
    en el working tree (que Claude ya preparo).

    Pasa -DryRun para ver que commiteria sin ejecutar.
#>

[CmdletBinding()]
param(
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

$branch = (git branch --show-current).Trim()
if ($branch -ne 'feat/port-to-claude-code') {
    Write-Warning "Rama actual: $branch (esperaba feat/port-to-claude-code)"
    $confirm = Read-Host "Continuar de todas formas? (yes/no)"
    if ($confirm -ne 'yes') { exit 1 }
}

function Do-Commit {
    param(
        [Parameter(Mandatory)][string[]]$Paths,
        [Parameter(Mandatory)][string]$Message
    )
    Write-Host ""
    Write-Host ("=" * 70) -ForegroundColor DarkCyan
    Write-Host "Commit: $Message" -ForegroundColor Cyan
    foreach ($p in $Paths) { Write-Host "  add: $p" -ForegroundColor DarkGray }
    if ($DryRun) {
        Write-Host "(dry-run, not committing)" -ForegroundColor Yellow
        return
    }
    git add -- $Paths
    git commit -m $Message
    if ($LASTEXITCODE -ne 0) { throw "Commit failed" }
}

# Limpiar .git/index.lock si quedo huerfano (Cowork sandbox a veces lo deja).
# Solo lo borramos si no hay un proceso git corriendo aparte del nuestro.
$lockPath = Join-Path $RepoRoot '.git\index.lock'
if (Test-Path $lockPath) {
    $otherGit = Get-Process -Name git -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $PID }
    if ($otherGit) {
        throw "index.lock existe y hay otro proceso git activo (PID $($otherGit.Id)). Cierra el proceso primero."
    }
    Write-Host "Removing stale lock: $lockPath" -ForegroundColor Yellow
    Remove-Item -LiteralPath $lockPath -Force
}

# Refrescar el index por si tiene stat info stale (mount de Windows)
git update-index --refresh 2>$null | Out-Null

# Commit 1: port tooling + design notes
Do-Commit -Paths @(
    'scripts/port-to-claude-code',
    'PORTING-NOTES.md'
) -Message "feat(claude-code): add Copilot->Claude Code port tooling

- scripts/port-to-claude-code/port.mjs automates the mechanical conversion
  (frontmatter mapping, toolset->explicit-tools, handoffs->next-steps, skill
  preloading, per-agent model assignment).
- PORTING-NOTES.md documents the design: tool-name mapping, the
  orchestrator-as-main-session pattern that resolves the subagent-cannot-spawn
  constraint, and what is intentionally out of scope for the initial port."

# Commit 2: full Claude Code roster + workspace CLAUDE.md
Do-Commit -Paths @(
    '.claude',
    'CLAUDE.md'
) -Message "feat(claude-code): port roster to .claude/agents and add CLAUDE.md

- 24 agents under .claude/agents/{leadership,architecture,engineering,design,documentation}.
- 18 specialists auto-ported by scripts/port-to-claude-code/port.mjs.
- 3 orchestrators (cto, principal-engineer, creative-director) hand-polished
  to adapt the Copilot delegation model to Claude Code orchestrator-as-main
  pattern (Agent(...) allowlist tool, runtime note explaining the subagent
  nesting constraint, handoffs folded into Next steps prose).
- Per-agent model assignment: 5 mechanical agents on haiku, 15 specialists on
  sonnet, 4 strategic agents (3 orchestrators + software-architect) on inherit.
- Skills preloaded per agent (docx/pdf for technical-writer, xlsx for
  data-scientist, etc.).
- CLAUDE.md consolidates agent-communication, git-workflow, knowledge-base,
  self-governance, and the hardened SDLC into a single workspace manual."

# Commit 3: SDLC hardening
Do-Commit -Paths @(
    'agents/devops-engineer.agent.md',
    'skills/scaffold-project/SKILL.md'
) -Message "feat(sdlc): harden SDLC standards across the roster

- devops-engineer: removed DigitalOcean hardcoding (deployment target is now
  chosen per-project by software-architect); added explicit ASK FOR
  VARIABLE NAME NEVER VALUE rule for secrets (Mailgun, Doctl, Play Console,
  Alibaba Model Studio, etc. keys live in Windows system env vars);
  added one-environment-tolerance handling for projects where dev/prod share a
  credential; PowerShell is now the primary script form.
- scaffold-project: rewritten to enforce the new SDLC. Templates for
  run-dev.ps1, run-prod.ps1, validate-env.ps1. Generated .env.example uses
  the env-var-name reference pattern. .gitignore covers .env.development,
  .env.production, and CLAUDE.local.md. Project gets a CLAUDE.local.md
  placeholder for domain context."

# Commit 4: 3 new horizontal specialists
Do-Commit -Paths @(
    'agents/xr-engineer.agent.md',
    'agents/digital-twin-engineer.agent.md',
    'agents/agentic-systems-engineer.agent.md',
    'agents/principal-engineer.agent.md',
    'agent-forge.manifest.jsonc'
) -Message "feat(agents): add xr, digital-twin, agentic-systems specialists

- xr-engineer: Unity, Unreal, WebXR (Three.js, A-Frame, Babylon), AR/VR/MR,
  Quest/Vision Pro/HoloLens SDKs, 6DoF, hand tracking, perf budgets for HMDs,
  3D asset pipelines (glTF, KTX2).
- digital-twin-engineer: IoT ingestion, sensor protocols (MQTT, OPC-UA,
  Modbus, BACnet), time-series DBs (TimescaleDB, InfluxDB), edge gateways,
  ISA-95 modeling, simulation, twin schemas and command audit trails.
- agentic-systems-engineer: LangGraph, multi-agent orchestration, RAG, vector
  DBs (Qdrant, pgvector), MCP servers, tool use, evals, agent memory,
  prompt-cache + cost optimization, human-in-the-loop. Owns the
  LLM-application layer (model layer stays with ml-engineer).
- principal-engineer: added the 3 to its Agent(...) allowlist and to the
  delegation table.
- manifest: registered the 3 new entries in the engineering category."

# Commit 5: scope ml-engineer to avoid agentic overlap
Do-Commit -Paths @(
    'agents/ml-engineer.agent.md'
) -Message "refactor(ml-engineer): scope to model training and serving

Description previously overlapped with the new agentic-systems-engineer on
LangChain, RAG, prompt engineering, vector stores, and embeddings. Rewrote
the description to focus on the model layer (training from scratch, fine-
tuning, model serving via Triton/vLLM/Ollama/TorchServe, quantization, GPU
profiling) and explicitly route agentic / RAG / MCP work to
agentic-systems-engineer."

# Commit 6: deploy + uninstall scripts for Claude Code user scope
Do-Commit -Paths @(
    'scripts/deploy-claude-code.ps1',
    'scripts/uninstall-claude-code.ps1'
) -Message "feat(deploy): add deploy/uninstall scripts for Claude Code user scope

deploy-claude-code.ps1 replaces install.ps1 Copilot-only behavior:
- Copies .claude/agents/**/*.md to %USERPROFILE%\.claude\agents\
- Copies CLAUDE.md to %USERPROFILE%\.claude\CLAUDE.md (backs up existing)
- Optionally copies skills/* to %USERPROFILE%\.claude\skills\
- Supports -DryRun, -NoSkills, -NoClaudeMd

uninstall-claude-code.ps1 removes ONLY agents whose name matches one in
this repo roster; leaves other user-scope agents untouched. -RestoreClaudeMd
puts back the backup. Both scripts are meant to be re-run on every roster
refresh (every 2 weeks)."

Write-Host ""
Write-Host ("=" * 70) -ForegroundColor Green
Write-Host "All commits done." -ForegroundColor Green
Write-Host ""
Write-Host "History (latest 8):" -ForegroundColor Cyan
git log --oneline -8
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Review the commits: git log --stat -8"
Write-Host "  2. Push:               git push -u origin feat/port-to-claude-code"
Write-Host "  3. Merge to main when ready (preferably via PR)."
