#Requires -Version 5.1

<#
.SYNOPSIS
    Remove agent-forge agents and CLAUDE.md from your Claude Code user scope.

.DESCRIPTION
    Deletes ONLY the agents whose `name:` matches one defined in this repo's
    .claude/agents/. Leaves other user-scope agents (from plugins, other
    rosters, or your own customizations) untouched.

    Optionally restores the CLAUDE.md.bak backup created by deploy-claude-code.ps1.

.PARAMETER DryRun
    Show what would be removed without deleting.

.PARAMETER RestoreClaudeMd
    Restore CLAUDE.md from the .bak backup if present.

.EXAMPLE
    .\scripts\uninstall-claude-code.ps1 -DryRun
    .\scripts\uninstall-claude-code.ps1 -RestoreClaudeMd
#>

[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$RestoreClaudeMd
)

$ErrorActionPreference = 'Stop'

$RepoRoot     = Split-Path -Parent $PSScriptRoot
$ClaudeHome   = Join-Path $env:USERPROFILE '.claude'
$AgentsDest   = Join-Path $ClaudeHome      'agents'
$ClaudeMdDest = Join-Path $ClaudeHome      'CLAUDE.md'
$AgentsSrc    = Join-Path $RepoRoot '.claude\agents'

Write-Host "=== Agent Forge -> Claude Code Uninstall ===" -ForegroundColor Cyan
Write-Host "Removing agents that match the names in this repo's roster."
Write-Host "Other user-scope agents will NOT be touched."
if ($DryRun) { Write-Host "Mode: DRY RUN" -ForegroundColor Yellow }
Write-Host ""

if (-not (Test-Path $AgentsSrc)) {
    throw "Repo agents folder not found: $AgentsSrc"
}

# Collect agent names from this repo's .claude/agents/
$ourNames = Get-ChildItem -Path $AgentsSrc -Recurse -File -Filter '*.md' | ForEach-Object {
    $content = Get-Content -LiteralPath $_.FullName -Raw
    if ($content -match '(?m)^name:\s*(\S+)') { $matches[1] }
}
Write-Host "Agents managed by this repo: $($ourNames.Count)" -ForegroundColor DarkGray

if (-not (Test-Path $AgentsDest)) {
    Write-Host "No user-scope agents folder found. Nothing to remove." -ForegroundColor Yellow
    exit 0
}

# Walk user-scope and remove only matching names
$removed = 0
Get-ChildItem -Path $AgentsDest -Recurse -File -Filter '*.md' | ForEach-Object {
    $content = Get-Content -LiteralPath $_.FullName -Raw
    if ($content -match '(?m)^name:\s*(\S+)') {
        $name = $matches[1]
        if ($ourNames -contains $name) {
            if ($DryRun) {
                Write-Host "  [dry-run] would remove $($_.FullName)"
            } else {
                Remove-Item -LiteralPath $_.FullName -Force
                Write-Host "  removed $name" -ForegroundColor Yellow
            }
            $removed++
        }
    }
}
Write-Host "  Total removed: $removed" -ForegroundColor DarkGray

# Clean up empty division subdirectories
if (-not $DryRun) {
    Get-ChildItem -Path $AgentsDest -Directory | ForEach-Object {
        if ((Get-ChildItem -Path $_.FullName -Recurse -File).Count -eq 0) {
            Remove-Item -LiteralPath $_.FullName -Recurse -Force
            Write-Host "  cleaned empty dir: $($_.Name)/" -ForegroundColor DarkGray
        }
    }
}

# Restore CLAUDE.md if requested
if ($RestoreClaudeMd) {
    $backup = "$ClaudeMdDest.bak"
    if (Test-Path $backup) {
        if ($DryRun) {
            Write-Host "  [dry-run] would restore CLAUDE.md from $backup"
        } else {
            Move-Item -LiteralPath $backup -Destination $ClaudeMdDest -Force
            Write-Host "  restored CLAUDE.md from backup" -ForegroundColor Green
        }
    } else {
        Write-Host "  No CLAUDE.md.bak found — nothing to restore" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Uninstall complete." -ForegroundColor Green
