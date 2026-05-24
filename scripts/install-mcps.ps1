#Requires -Version 5.1

<#
.SYNOPSIS
    Idempotently install / update MCP server entries in %USERPROFILE%\.claude.json
    for the agent-forge roster (gitkraken, docker, playwright). Canva and any
    other existing entries are left as-is unless -Force is passed.

.DESCRIPTION
    Compatible with PowerShell 5.1 (no -AsHashtable). Uses PSCustomObject
    + Add-Member to mutate the existing config without losing other fields.

    Prerequisites you must verify yourself BEFORE running:
      - GitKraken CLI:  winget install gitkraken.cli  +  gk auth login
      - Playwright:     npx must be in PATH (you already have node + nvm4w)
      - Docker:         not via MCP; agents use Bash + docker CLI directly

.PARAMETER DryRun
    Show the planned changes without writing.

.PARAMETER Force
    Overwrite existing entries with the same server name.

.PARAMETER ConfigPath
    Override the default config path (%USERPROFILE%\.claude.json).
#>

[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$Force,
    [string]$ConfigPath
)

$ErrorActionPreference = 'Stop'

if (-not $ConfigPath) {
    $ConfigPath = Join-Path $env:USERPROFILE '.claude.json'
}

Write-Host "=== Install MCPs into Claude Code config ===" -ForegroundColor Cyan
Write-Host "Config:  $ConfigPath"
if ($DryRun) { Write-Host "Mode:    DRY RUN" -ForegroundColor Yellow }
if ($Force)  { Write-Host "Mode:    FORCE (will overwrite existing entries)" -ForegroundColor Yellow }
Write-Host ""

if (-not (Test-Path $ConfigPath)) {
    throw "Config not found at $ConfigPath. Open Claude Code at least once to create it, then re-run."
}

# Parse as PSCustomObject (works in PS 5.1)
$raw = Get-Content -LiteralPath $ConfigPath -Raw
try {
    $config = $raw | ConvertFrom-Json
} catch {
    throw "Could not parse $ConfigPath as JSON. Manual inspection needed. Error: $($_.Exception.Message)"
}

# Ensure mcpServers exists as a PSCustomObject
if (-not ($config.PSObject.Properties.Name -contains 'mcpServers')) {
    Add-Member -InputObject $config -MemberType NoteProperty -Name 'mcpServers' -Value (New-Object PSObject) -Force
}
if ($null -eq $config.mcpServers) {
    $config.mcpServers = New-Object PSObject
}

# --- Recommended MCP entries ----------------------------------------

$recommended = [ordered]@{
    'gitkraken' = [PSCustomObject]@{
        command = 'gk'
        args    = @('mcp')
    }
    'playwright' = [PSCustomObject]@{
        command = 'npx'
        args    = @('-y', '@playwright/mcp@latest')
    }
}

# --- Merge ----------------------------------------------------------

$added    = @()
$skipped  = @()
$replaced = @()

foreach ($name in $recommended.Keys) {
    $newEntry = $recommended[$name]
    $exists   = $config.mcpServers.PSObject.Properties.Name -contains $name
    if ($exists) {
        if ($Force) {
            $config.mcpServers.PSObject.Properties.Remove($name)
            Add-Member -InputObject $config.mcpServers -MemberType NoteProperty -Name $name -Value $newEntry
            $replaced += $name
        } else {
            $skipped += $name
        }
    } else {
        Add-Member -InputObject $config.mcpServers -MemberType NoteProperty -Name $name -Value $newEntry
        $added += $name
    }
}

# --- Report ---------------------------------------------------------

Write-Host "Summary:" -ForegroundColor Cyan
if ($added.Count -gt 0)    { Write-Host "  Added:    $($added -join ', ')" -ForegroundColor Green }
if ($replaced.Count -gt 0) { Write-Host "  Replaced: $($replaced -join ', ')" -ForegroundColor Yellow }
if ($skipped.Count -gt 0)  { Write-Host "  Skipped (already present, use -Force to overwrite): $($skipped -join ', ')" -ForegroundColor DarkGray }
Write-Host ""

if ($DryRun) {
    Write-Host "Would write the following mcpServers section:" -ForegroundColor Yellow
    $config.mcpServers | ConvertTo-Json -Depth 10
    exit 0
}

# --- Atomic write: tmp + move ---------------------------------------

$tmpPath = "$ConfigPath.tmp"
$json    = $config | ConvertTo-Json -Depth 20
Set-Content -LiteralPath $tmpPath -Value $json -Encoding UTF8
Move-Item -LiteralPath $tmpPath -Destination $ConfigPath -Force

Write-Host "Wrote $ConfigPath." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. (one-time) Authenticate GitKraken CLI:  gk auth login"
Write-Host "  2. Restart Claude Code (close + reopen) so it picks up the new mcpServers."
Write-Host "  3. From within a Claude Code session, verify with:  /mcp"
Write-Host "  4. First time an agent uses any of these, OAuth or permission prompts will appear."
Write-Host ""
Write-Host "Docker work uses the Bash tool + docker CLI directly (no MCP needed for that)."
