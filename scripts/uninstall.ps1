#Requires -Version 5.1

$ErrorActionPreference = 'Stop'

Write-Host "=== Agent Forge Uninstaller ===" -ForegroundColor Cyan
Write-Host ""

# --- Uninstall VS Code extension ------------------------------------
$code = Get-Command code -ErrorAction SilentlyContinue
if ($code) {
    Write-Host "Uninstalling VS Code extension..." -ForegroundColor Yellow
    code --uninstall-extension agent-forge.agent-forge 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Extension uninstalled." -ForegroundColor Green
    } else {
        Write-Host "  Extension not found or already uninstalled." -ForegroundColor Yellow
    }
} else {
    Write-Host "VS Code CLI not found, skipping extension uninstall." -ForegroundColor Yellow
}

# --- Remove CLI ------------------------------------------------------
$binDir = Join-Path $env:USERPROFILE ".agent-forge\bin"
if (Test-Path $binDir) {
    Write-Host "Removing CLI from $binDir..." -ForegroundColor Yellow
    Remove-Item $binDir -Recurse -Force
    Write-Host "  CLI removed." -ForegroundColor Green
} else {
    Write-Host "CLI directory not found, nothing to remove." -ForegroundColor Yellow
}

# --- Remove from PATH ------------------------------------------------
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if ($userPath -like "*$binDir*") {
    $newPath = ($userPath -split ';' | Where-Object { $_ -ne $binDir }) -join ';'
    [Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
    Write-Host "Removed $binDir from user PATH." -ForegroundColor Green
}

# --- Check for leftover models ----------------------------------------
$modelsDir = Join-Path $env:USERPROFILE ".agent-forge\models"
if (Test-Path $modelsDir) {
    $modelSize = (Get-ChildItem $modelsDir -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    if ($modelSize -and $modelSize -gt 0) {
        $sizeGB = [math]::Round($modelSize / 1GB, 2)
        Write-Host "" -ForegroundColor Yellow
        Write-Host "  NOTE: Image generation models ($sizeGB GB) remain at:" -ForegroundColor Yellow
        Write-Host "    $modelsDir" -ForegroundColor Yellow
        Write-Host "  To free disk space, delete this folder manually:" -ForegroundColor Yellow
        Write-Host "    Remove-Item '$modelsDir' -Recurse -Force" -ForegroundColor Yellow
    }
}

# --- Clean up empty parent directory ----------------------------------
$agentForgeDir = Join-Path $env:USERPROFILE ".agent-forge"
if ((Test-Path $agentForgeDir) -and ((Get-ChildItem $agentForgeDir).Count -eq 0)) {
    Remove-Item $agentForgeDir -Force
    Write-Host "Removed empty .agent-forge directory." -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Uninstallation Complete ===" -ForegroundColor Cyan
