#Requires -Version 5.1

<#
.SYNOPSIS
    Instala los skills del repo anthropics/skills en %USERPROFILE%\.claude\skills\
    sin depender del plugin marketplace.

.DESCRIPTION
    Clona (o actualiza si ya existe) el repo anthropics/skills en %TEMP%,
    despues copia las carpetas de skills seleccionadas a tu Claude Code
    user-scope skills folder.

    Por defecto instala: docx, pdf, pptx, xlsx, frontend-design
    (los que nuestro roster referencia en SKILLS_MAP).

    Para instalar otros: -Skills @('docx','pdf','algun-otro-skill')

.PARAMETER Skills
    Lista de nombres de skill a instalar. Default: docx, pdf, pptx, xlsx.
    Para ver el catalogo completo: -ListAvailable

.PARAMETER ListAvailable
    Lista todos los skills disponibles en el repo sin instalar nada.

.PARAMETER Force
    Sobrescribe skills ya instalados con el mismo nombre.

.PARAMETER DryRun
    Muestra que se haria sin copiar nada.

.EXAMPLE
    .\scripts\install-skills.ps1 -DryRun
    .\scripts\install-skills.ps1
    .\scripts\install-skills.ps1 -Skills @('docx','pdf') -Force
    .\scripts\install-skills.ps1 -ListAvailable
#>

[CmdletBinding()]
param(
    [string[]]$Skills = @('docx', 'pdf', 'pptx', 'xlsx', 'frontend-design'),
    [switch]$ListAvailable,
    [switch]$Force,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

# Verificar prerequisites
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw "git no esta en PATH. Instalalo o agregalo a PATH."
}

$RepoUrl    = 'https://github.com/anthropics/skills.git'
$RepoCache  = Join-Path $env:TEMP 'anthropics-skills'
$ClaudeHome = Join-Path $env:USERPROFILE '.claude'
$SkillsDest = Join-Path $ClaudeHome 'skills'

Write-Host "=== Install Skills from anthropics/skills ===" -ForegroundColor Cyan
Write-Host "Source:         $RepoUrl"
Write-Host "Cache:          $RepoCache"
Write-Host "Target:         $SkillsDest"
if ($DryRun) { Write-Host "Mode:           DRY RUN" -ForegroundColor Yellow }
Write-Host ""

# Clonar o actualizar el cache local del repo
if (Test-Path (Join-Path $RepoCache '.git')) {
    Write-Host "[1/3] Updating cached repo..." -ForegroundColor Cyan
    if (-not $DryRun) {
        Push-Location $RepoCache
        try { git pull --ff-only | Out-Null }
        finally { Pop-Location }
    }
    Write-Host "  cached repo at $RepoCache" -ForegroundColor DarkGray
} else {
    Write-Host "[1/3] Cloning repo (first time)..." -ForegroundColor Cyan
    if (-not $DryRun) {
        git clone --depth=1 $RepoUrl $RepoCache | Out-Null
    } else {
        Write-Host "  [dry-run] would clone to $RepoCache" -ForegroundColor Yellow
    }
}

$SkillsSrc = Join-Path $RepoCache 'skills'

# Modo -ListAvailable: enumerar y salir
if ($ListAvailable) {
    Write-Host "`n[2/3] Available skills in repo:" -ForegroundColor Cyan
    if (Test-Path $SkillsSrc) {
        Get-ChildItem -Path $SkillsSrc -Directory | ForEach-Object {
            $skillFile = Join-Path $_.FullName 'SKILL.md'
            $desc = ''
            if (Test-Path $skillFile) {
                $content = Get-Content -LiteralPath $skillFile -Raw
                if ($content -match '(?ms)^---.*?description:\s*(.+?)(?:\n|---)') {
                    $desc = $matches[1].Trim().TrimStart('"').TrimEnd('"')
                    if ($desc.Length -gt 80) { $desc = $desc.Substring(0,77) + '...' }
                }
            }
            Write-Host ("  {0,-30} {1}" -f $_.Name, $desc)
        }
    }
    Write-Host ""
    Write-Host "Run again with -Skills @('name1','name2') to install specific ones." -ForegroundColor Yellow
    exit 0
}

# Asegurar que existe la carpeta destino
if (-not (Test-Path $SkillsDest)) {
    Write-Host "Creating $SkillsDest" -ForegroundColor Yellow
    if (-not $DryRun) { New-Item -ItemType Directory -Path $SkillsDest -Force | Out-Null }
}

# Copiar cada skill solicitado
Write-Host "`n[2/3] Installing requested skills..." -ForegroundColor Cyan
$installed = 0
$skipped = 0
$missing = @()
foreach ($skill in $Skills) {
    $src = Join-Path $SkillsSrc $skill
    $dst = Join-Path $SkillsDest $skill
    if (-not (Test-Path $src)) {
        Write-Host "  MISSING  $skill (not in repo)" -ForegroundColor Red
        $missing += $skill
        continue
    }
    if ((Test-Path $dst) -and -not $Force) {
        Write-Host "  exists   $skill (use -Force to overwrite)" -ForegroundColor Yellow
        $skipped++
        continue
    }
    if ($DryRun) {
        Write-Host "  [dry-run] would install $skill"
    } else {
        if (Test-Path $dst) { Remove-Item -Recurse -Force $dst }
        Copy-Item -LiteralPath $src -Destination $dst -Recurse -Force
        Write-Host "  installed $skill" -ForegroundColor Green
    }
    $installed++
}

# Verificacion final
Write-Host "`n[3/3] Summary" -ForegroundColor Cyan
Write-Host "  Installed: $installed" -ForegroundColor Green
if ($skipped -gt 0) { Write-Host "  Skipped:   $skipped" -ForegroundColor Yellow }
if ($missing.Count -gt 0) { Write-Host "  Missing:   $($missing -join ', ')" -ForegroundColor Red }

if (-not $DryRun -and $installed -gt 0) {
    Write-Host ""
    Write-Host "Skills installed to $SkillsDest" -ForegroundColor Green
    Write-Host "Claude Code picks them up automatically (no restart needed)." -ForegroundColor Cyan
    Write-Host "Verify in a Claude Code session by typing /  and looking for the skill names."
}
