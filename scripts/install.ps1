#Requires -Version 5.1

<#
.SYNOPSIS
Build, validate, preview, and optionally deploy Agent Forge through its CLI.
.DESCRIPTION
This is a thin adapter. The core package is the sole renderer and deployment
engine. By default the script builds and stops after a full deployment preview.
Use -Deploy to request the separately confirmed user-profile deployment.
#>

[CmdletBinding()]
param(
    [switch]$UsePrebuilt,
    [switch]$Deploy,
    [ValidateSet('vscode', 'codex', 'all')]
    [string]$Target = 'all'
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
$Cli = Join-Path $RepoRoot 'packages\cli\dist\index.js'

Push-Location $RepoRoot
try {
    if (-not $UsePrebuilt) {
        & npm.cmd ci
        if ($LASTEXITCODE -ne 0) { throw 'npm ci failed.' }
        & npm.cmd run build
        if ($LASTEXITCODE -ne 0) { throw 'npm run build failed.' }
    } elseif (-not (Test-Path -LiteralPath $Cli)) {
        throw "Prebuilt CLI not found: $Cli"
    }

    if ($Target -ne 'vscode') {
        & npm.cmd run prepare:skills
        if ($LASTEXITCODE -ne 0) { throw 'Pinned skill preparation failed.' }
    }
    & node $Cli --repo $RepoRoot validate --strict --target $Target
    if ($LASTEXITCODE -ne 0) { throw 'Roster validation failed.' }
    & node $Cli --repo $RepoRoot doctor --profile full --target $Target
    if ($LASTEXITCODE -ne 0) { throw 'Capability doctor failed. Resolve provider diagnostics before deployment.' }
    $previewJson = & node $Cli --repo $RepoRoot preview --scope user --profile full --target $Target --json
    if ($LASTEXITCODE -ne 0) { throw 'Deployment preview failed.' }
    $preview = $previewJson | ConvertFrom-Json
    Write-Host "Immutable plan: $($preview.deploymentId)" -ForegroundColor Cyan

    if ($Deploy) {
        $approval = Read-Host "Type $($preview.deploymentId) to apply this exact user-profile plan"
        if ($approval -ne $preview.deploymentId) { throw 'Deployment confirmation did not match.' }
        & node $Cli --repo $RepoRoot deploy --target $Target --plan $preview.deploymentId --confirm $approval
        if ($LASTEXITCODE -ne 0) { throw 'Deployment failed.' }
    } else {
        Write-Host 'Build and preview complete. Re-run with -Deploy and the same target after all readiness gates pass.' -ForegroundColor Green
    }
} finally {
    Pop-Location
}
