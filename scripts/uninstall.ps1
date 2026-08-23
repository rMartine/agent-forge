#Requires -Version 5.1

<#
.SYNOPSIS
Remove an Agent Forge deployment through the ownership-aware CLI.
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$DeploymentId,
    [ValidateSet('vscode', 'codex')]
    [string]$Target = 'vscode'
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
$Cli = Join-Path $RepoRoot 'packages\cli\dist\index.js'
if (-not (Test-Path -LiteralPath $Cli)) { throw "Build the CLI first: $Cli" }

& node $Cli --repo $RepoRoot wipe --target $Target --managed-only --confirm $DeploymentId
if ($LASTEXITCODE -ne 0) { throw 'Managed wipe failed or was refused.' }
