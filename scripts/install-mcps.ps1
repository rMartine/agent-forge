#Requires -Version 5.1

<#
.SYNOPSIS
Inspect VS Code MCP provider readiness through Agent Forge.
.DESCRIPTION
This wrapper never writes Claude configuration or secrets. Review the merge-safe
VS Code provider preview, then approve changes through the CLI or extension UI.
Codex MCP configuration is inherited and is never modified by Agent Forge.
#>

[CmdletBinding()]
param([string]$Provider)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
$Cli = Join-Path $RepoRoot 'packages\cli\dist\index.js'
if (-not (Test-Path -LiteralPath $Cli)) { throw "Build the CLI first: $Cli" }

$arguments = @($Cli, '--repo', $RepoRoot, 'mcp', 'setup')
if ($Provider) { $arguments += @('--provider', $Provider) }
& node @arguments
if ($LASTEXITCODE -ne 0) { throw 'MCP setup preview failed.' }
