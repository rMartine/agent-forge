#Requires -Version 5.1

<#
.SYNOPSIS
Validate and preview the managed VS Code skill deployment.
.DESCRIPTION
Skills are deployed only as part of the atomic Agent Forge transaction. This
adapter intentionally performs no independent copy, overwrite, or download.
#>

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
$Cli = Join-Path $RepoRoot 'packages\cli\dist\index.js'
if (-not (Test-Path -LiteralPath $Cli)) { throw "Build the CLI first: $Cli" }

& node $Cli --repo $RepoRoot validate --strict --target vscode
if ($LASTEXITCODE -ne 0) { throw 'Skill validation failed.' }
& node $Cli --repo $RepoRoot preview --scope user --profile full
if ($LASTEXITCODE -ne 0) { throw 'Skill deployment preview failed.' }
Write-Host 'Skills are included in the atomic deployment. Use install.ps1 -Deploy after all gates pass.' -ForegroundColor Green
