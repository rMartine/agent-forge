#Requires -Version 5.1

<#
.SYNOPSIS
    Remove from your VS Code / Copilot user profile the agents, instructions,
    and skills that were deployed by install.ps1.

.DESCRIPTION
    Only files that exist in THIS repo are removed from the destination. Files
    in the destination that don't correspond to anything in this repo are left
    untouched.

.PARAMETER DryRun
    Show what would be removed without deleting anything.

.EXAMPLE
    .\scripts\uninstall.ps1
    .\scripts\uninstall.ps1 -DryRun
#>

[CmdletBinding()]
param(
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$RepoRoot    = Split-Path -Parent $PSScriptRoot
$PromptsDest = Join-Path $env:APPDATA     'Code\User\prompts'
$SkillsDest  = Join-Path $env:USERPROFILE '.copilot\skills'

Write-Host "=== Agent Forge Uninstaller ===" -ForegroundColor Cyan
Write-Host "Repository:     $RepoRoot"
Write-Host "Prompts target: $PromptsDest"
Write-Host "Skills target:  $SkillsDest"
if ($DryRun) { Write-Host "Mode:           DRY RUN (no files will be removed)" -ForegroundColor Yellow }
Write-Host ""

function Remove-OneFile {
    param([Parameter(Mandatory)][string]$Path)
    if (-not (Test-Path $Path)) { return }
    if ($DryRun) {
        Write-Host "  [dry-run] would remove: $Path" -ForegroundColor DarkGray
    } else {
        Remove-Item -LiteralPath $Path -Force
        Write-Host "  removed $([IO.Path]::GetFileName($Path))" -ForegroundColor Green
    }
}

function Remove-MirroredFiles {
    param(
        [Parameter(Mandatory)][string]$SourceDir,
        [Parameter(Mandatory)][string]$Filter,
        [Parameter(Mandatory)][string]$DestDir
    )
    if (-not (Test-Path $SourceDir)) { return }
    foreach ($f in Get-ChildItem -Path $SourceDir -Filter $Filter -File -ErrorAction SilentlyContinue) {
        Remove-OneFile -Path (Join-Path $DestDir $f.Name)
    }
}

function Remove-SkillTree {
    param(
        [Parameter(Mandatory)][string]$SourceRoot,
        [Parameter(Mandatory)][string]$DestRoot
    )
    if (-not (Test-Path $SourceRoot)) { return }
    foreach ($sd in Get-ChildItem -Path $SourceRoot -Directory) {
        $target = Join-Path $DestRoot $sd.Name
        if (Test-Path $target) {
            if ($DryRun) {
                Write-Host "  [dry-run] would remove folder: $target" -ForegroundColor DarkGray
            } else {
                Remove-Item -LiteralPath $target -Recurse -Force
                Write-Host "  removed $($sd.Name)/" -ForegroundColor Green
            }
        }
    }
}

Write-Host "Removing agents..." -ForegroundColor Yellow
Remove-MirroredFiles -SourceDir (Join-Path $RepoRoot 'agents') -Filter '*.agent.md' -DestDir $PromptsDest

Write-Host "Removing instructions..." -ForegroundColor Yellow
Remove-MirroredFiles -SourceDir (Join-Path $RepoRoot 'instructions') -Filter '*.instructions.md' -DestDir $PromptsDest

# If a previous installer version copied common.toolsets.jsonc here, remove it.
Remove-OneFile -Path (Join-Path $PromptsDest 'common.toolsets.jsonc')

Write-Host "Removing skills..." -ForegroundColor Yellow
Remove-SkillTree -SourceRoot (Join-Path $RepoRoot 'skills') -DestRoot $SkillsDest

Write-Host ""
Write-Host "=== Uninstallation Complete ===" -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "  DRY RUN - no files were removed." -ForegroundColor Yellow
} else {
    Write-Host "  Reload VS Code (Ctrl+Shift+P -> 'Developer: Reload Window') to drop cached prompts." -ForegroundColor Yellow
}
