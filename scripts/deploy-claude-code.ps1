#Requires -Version 5.1

<#
.SYNOPSIS
    Deploy the agent roster, CLAUDE.md, and project conventions to your
    Claude Code user-scope directory (%USERPROFILE%\.claude\).

.DESCRIPTION
    Copies this repo's Claude Code configuration into the locations
    Claude Code reads from for user-scope (available across all projects):

      - .claude/agents/**/*.md     -> %USERPROFILE%\.claude\agents\
      - CLAUDE.md (workspace)      -> %USERPROFILE%\.claude\CLAUDE.md
      - skills/* (optional)        -> %USERPROFILE%\.claude\skills\

    Existing destination files with matching names are overwritten. Files in
    the destination that are NOT present in this repo are left alone.

    This script REPLACES the Copilot-targeted scripts\install.ps1 for the
    Claude Code workflow. They can coexist if you still use Copilot - they
    write to different directories.

.PARAMETER DryRun
    Show what would be copied without writing anything.

.PARAMETER NoSkills
    Skip copying the skills/ folder (leave Claude Code skills untouched).

.PARAMETER NoClaudeMd
    Skip copying CLAUDE.md to user scope (leave your existing user-scope
    CLAUDE.md alone - useful if you customize it separately).

.EXAMPLE
    .\scripts\deploy-claude-code.ps1 -DryRun
    .\scripts\deploy-claude-code.ps1
    .\scripts\deploy-claude-code.ps1 -NoClaudeMd
#>

[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$NoSkills,
    [switch]$NoClaudeMd
)

$ErrorActionPreference = 'Stop'

$RepoRoot     = Split-Path -Parent $PSScriptRoot
$ClaudeHome   = Join-Path $env:USERPROFILE '.claude'
$AgentsDest   = Join-Path $ClaudeHome      'agents'
$SkillsDest   = Join-Path $ClaudeHome      'skills'
$ClaudeMdDest = Join-Path $ClaudeHome      'CLAUDE.md'

$AgentsSrc    = Join-Path $RepoRoot '.claude\agents'
$SkillsSrc    = Join-Path $RepoRoot 'skills'
$ClaudeMdSrc  = Join-Path $RepoRoot 'CLAUDE.md'

Write-Host "=== Agent Forge -> Claude Code Deploy ===" -ForegroundColor Cyan
Write-Host "Repo:           $RepoRoot"
Write-Host "Claude home:    $ClaudeHome"
Write-Host "Agents target:  $AgentsDest"
Write-Host "Skills target:  $SkillsDest"
Write-Host "CLAUDE.md:      $ClaudeMdDest"
if ($DryRun)     { Write-Host "Mode:           DRY RUN (no files written)" -ForegroundColor Yellow }
if ($NoSkills)   { Write-Host "Skills:         SKIPPED" -ForegroundColor Yellow }
if ($NoClaudeMd) { Write-Host "CLAUDE.md:      SKIPPED" -ForegroundColor Yellow }
Write-Host ""

# Verify Claude Code home exists, create if not
if (-not (Test-Path $ClaudeHome)) {
    Write-Host "Claude home not found. Creating: $ClaudeHome" -ForegroundColor Yellow
    if (-not $DryRun) { New-Item -ItemType Directory -Path $ClaudeHome -Force | Out-Null }
}

# --- Copy agents ----------------------------------------------------

if (-not (Test-Path $AgentsSrc)) {
    throw "Agents source not found: $AgentsSrc. Run the port script first: node scripts/port-to-claude-code/port.mjs"
}

Write-Host "[1/3] Copying agents from .claude/agents/ ..." -ForegroundColor Cyan
$agentFiles = Get-ChildItem -Path $AgentsSrc -Recurse -File -Filter '*.md'
foreach ($file in $agentFiles) {
    $rel = $file.FullName.Substring($AgentsSrc.Length).TrimStart('\','/')
    $dest = Join-Path $AgentsDest $rel
    $destDir = Split-Path -Parent $dest
    if ($DryRun) {
        Write-Host "  [dry-run] $rel"
    } else {
        if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
        Copy-Item -LiteralPath $file.FullName -Destination $dest -Force
        Write-Host "  copied   $rel" -ForegroundColor Green
    }
}
Write-Host "  Total agents: $($agentFiles.Count)" -ForegroundColor DarkGray

# --- Copy skills (optional) -----------------------------------------

if (-not $NoSkills) {
    Write-Host "`n[2/3] Copying skills from skills/ ..." -ForegroundColor Cyan
    if (Test-Path $SkillsSrc) {
        $skillDirs = Get-ChildItem -Path $SkillsSrc -Directory
        foreach ($dir in $skillDirs) {
            $dest = Join-Path $SkillsDest $dir.Name
            if ($DryRun) {
                Write-Host "  [dry-run] $($dir.Name)/"
            } else {
                if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
                Copy-Item -LiteralPath $dir.FullName -Destination $dest -Recurse -Force
                Write-Host "  copied   $($dir.Name)/" -ForegroundColor Green
            }
        }
        Write-Host "  Total skill dirs: $($skillDirs.Count)" -ForegroundColor DarkGray
    } else {
        Write-Host "  (no skills/ folder in repo, nothing to copy)" -ForegroundColor DarkGray
    }
} else {
    Write-Host "`n[2/3] Skills SKIPPED" -ForegroundColor Yellow
}

# --- Copy CLAUDE.md (optional) --------------------------------------

if (-not $NoClaudeMd) {
    Write-Host "`n[3/3] Copying CLAUDE.md (workspace conventions) ..." -ForegroundColor Cyan
    if (-not (Test-Path $ClaudeMdSrc)) {
        Write-Warning "CLAUDE.md not found at $ClaudeMdSrc - skipping"
    } else {
        if ($DryRun) {
            Write-Host "  [dry-run] CLAUDE.md -> $ClaudeMdDest"
        } else {
            if (Test-Path $ClaudeMdDest) {
                $backup = "$ClaudeMdDest.bak"
                Copy-Item -LiteralPath $ClaudeMdDest -Destination $backup -Force
                Write-Host "  backed up existing -> $backup" -ForegroundColor DarkGray
            }
            Copy-Item -LiteralPath $ClaudeMdSrc -Destination $ClaudeMdDest -Force
            Write-Host "  copied   CLAUDE.md" -ForegroundColor Green
        }
    }
} else {
    Write-Host "`n[3/3] CLAUDE.md SKIPPED" -ForegroundColor Yellow
}

# --- Summary ----------------------------------------------------------

Write-Host ""
if ($DryRun) {
    Write-Host "Dry run complete. Re-run without -DryRun to actually copy." -ForegroundColor Yellow
} else {
    Write-Host "Deploy complete." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Restart any open Claude Code sessions so they pick up the new agents."
    Write-Host "  2. From any project folder, try:  claude --agent cto"
    Write-Host "  3. Run this script again whenever you refresh the roster (every 2 weeks)."
}
