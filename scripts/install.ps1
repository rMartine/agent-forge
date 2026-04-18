#Requires -Version 5.1

<#
.SYNOPSIS
    Deploy the agent roster, instructions, and skills into your VS Code +
    Copilot user profile by copying files.

.DESCRIPTION
    Copies this repo's configuration into the locations VS Code / Copilot read
    from:
      - agents/*.agent.md                 -> %APPDATA%\Code\User\prompts\
        (tool-set names in the `tools:` frontmatter are expanded from
         config/common.toolsets.jsonc because VS Code does not auto-discover
         tool-set files in the prompts folder)
      - instructions/*.instructions.md    -> %APPDATA%\Code\User\prompts\
      - skills/*                          -> %USERPROFILE%\.copilot\skills\

    Existing destination files with matching names are overwritten. Files in
    the destination that are NOT present in this repo are left alone.

.PARAMETER DryRun
    Show what would be copied (and how `tools:` would be expanded) without
    writing anything.

.EXAMPLE
    .\scripts\install.ps1
    .\scripts\install.ps1 -DryRun
#>

[CmdletBinding()]
param(
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

# Repo root is the parent of scripts/
$RepoRoot     = Split-Path -Parent $PSScriptRoot
$PromptsDest  = Join-Path $env:APPDATA     'Code\User\prompts'
$SkillsDest   = Join-Path $env:USERPROFILE '.copilot\skills'
$ToolsetsFile = Join-Path $RepoRoot        'config\common.toolsets.jsonc'

Write-Host "=== Agent Forge Installer ===" -ForegroundColor Cyan
Write-Host "Repository:     $RepoRoot"
Write-Host "Prompts target: $PromptsDest"
Write-Host "Skills target:  $SkillsDest"
if ($DryRun) { Write-Host "Mode:           DRY RUN (no files will be written)" -ForegroundColor Yellow }
Write-Host ""

# --- Helpers ---------------------------------------------------------

function Read-Toolsets {
    param([Parameter(Mandatory)][string]$Path)
    if (-not (Test-Path $Path)) {
        throw "Toolsets file not found: $Path"
    }
    # Strip // line comments so ConvertFrom-Json accepts it.
    $raw = Get-Content -LiteralPath $Path -Raw
    $stripped = ($raw -split "`n" | ForEach-Object {
        $_ -replace '(?<!https?:)//.*$', ''
    }) -join "`n"
    $json = $stripped | ConvertFrom-Json
    $map = @{}
    foreach ($prop in $json.PSObject.Properties) {
        $map[$prop.Name] = @($prop.Value.tools)
    }
    return $map
}

function Expand-AgentTools {
    <#
        Reads an agent file, rewrites the `tools: [...]` line in its YAML
        frontmatter by expanding any tool-set name (keys of $Toolsets) into
        the corresponding flat tool list. Entries that are not tool-set names
        are passed through unchanged. Order is preserved; duplicates dropped.
        Returns the transformed file content as a single string.
    #>
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][hashtable]$Toolsets
    )

    $content = Get-Content -LiteralPath $Path -Raw
    $lines = $content -split "`r?`n"

    # Locate frontmatter: first line "---", second fence somewhere after.
    if ($lines.Count -lt 2 -or $lines[0].Trim() -ne '---') {
        return $content  # no frontmatter, nothing to do
    }
    $endIdx = -1
    for ($i = 1; $i -lt $lines.Count; $i++) {
        if ($lines[$i].Trim() -eq '---') { $endIdx = $i; break }
    }
    if ($endIdx -lt 0) { return $content }

    # Find the `tools:` line inside the frontmatter block.
    $toolsIdx = -1
    for ($i = 1; $i -lt $endIdx; $i++) {
        if ($lines[$i] -match '^\s*tools\s*:\s*\[') { $toolsIdx = $i; break }
    }
    if ($toolsIdx -lt 0) { return $content }

    # Extract the bracketed list (supports single-line only; all agents use
    # single-line inline arrays per repo convention).
    if ($lines[$toolsIdx] -notmatch '^\s*tools\s*:\s*\[(?<body>.*)\]\s*$') {
        Write-Warning "  Could not parse tools line in $Path (multi-line array?); leaving untouched."
        return $content
    }
    $body = $Matches['body']
    $entries = @()
    foreach ($t in ($body -split ',')) {
        $tok = $t.Trim().Trim("'`"")
        if ($tok) { $entries += $tok }
    }

    # Expand.
    $expanded = [System.Collections.Generic.List[string]]::new()
    foreach ($e in $entries) {
        if ($Toolsets.ContainsKey($e)) {
            foreach ($x in $Toolsets[$e]) {
                if (-not $expanded.Contains($x)) { $expanded.Add($x) | Out-Null }
            }
        } else {
            if (-not $expanded.Contains($e)) { $expanded.Add($e) | Out-Null }
        }
    }

    $newLine = 'tools: [' + (($expanded | ForEach-Object { $_ }) -join ', ') + ']'
    # Preserve original indentation (there is none for these files, but be safe).
    if ($lines[$toolsIdx] -match '^(?<indent>\s*)tools\s*:') {
        $newLine = $Matches['indent'] + $newLine
    }
    $lines[$toolsIdx] = $newLine

    # Preserve original line ending: use CRLF on Windows-authored files if
    # the original used CRLF, else LF.
    $nl = if ($content -match "`r`n") { "`r`n" } else { "`n" }
    return ($lines -join $nl)
}

function Write-TargetFile {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Content
    )
    $dir = Split-Path -Parent $Path
    if (-not (Test-Path $dir)) {
        if ($DryRun) {
            Write-Host "  [dry-run] would create dir: $dir" -ForegroundColor DarkGray
        } else {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
    }
    if ($DryRun) {
        Write-Host "  [dry-run] write: $Path" -ForegroundColor DarkGray
        return
    }
    # VS Code's prompt-file watcher briefly holds newly-touched files open, so
    # retry on sharing-violation / IO locks.
    $attempts = 0
    $maxAttempts = 8
    $delayMs = 150
    # Use UTF-8 WITHOUT BOM to match source-file convention. Windows
    # PowerShell 5.1's -Encoding UTF8 writes a BOM, so go through .NET.
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    while ($true) {
        try {
            [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
            Write-Host "  $([IO.Path]::GetFileName($Path))" -ForegroundColor Green
            return
        } catch [System.IO.IOException] {
            $attempts++
            if ($attempts -ge $maxAttempts) { throw }
            Start-Sleep -Milliseconds $delayMs
            $delayMs = [Math]::Min($delayMs * 2, 2000)
        }
    }
}

function Copy-PlainFile {
    param(
        [Parameter(Mandatory)][string]$Source,
        [Parameter(Mandatory)][string]$Destination
    )
    if (-not (Test-Path $Source)) {
        Write-Warning "  Source missing, skipped: $Source"
        return
    }
    $dir = Split-Path -Parent $Destination
    if (-not (Test-Path $dir)) {
        if ($DryRun) {
            Write-Host "  [dry-run] would create dir: $dir" -ForegroundColor DarkGray
        } else {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
    }
    if ($DryRun) {
        Write-Host "  [dry-run] copy: $Source -> $Destination" -ForegroundColor DarkGray
        return
    }
    $attempts = 0
    $maxAttempts = 8
    $delayMs = 150
    while ($true) {
        try {
            Copy-Item -LiteralPath $Source -Destination $Destination -Force -ErrorAction Stop
            Write-Host "  $([IO.Path]::GetFileName($Destination))" -ForegroundColor Green
            return
        } catch [System.IO.IOException] {
            $attempts++
            if ($attempts -ge $maxAttempts) { throw }
            Start-Sleep -Milliseconds $delayMs
            $delayMs = [Math]::Min($delayMs * 2, 2000)
        }
    }
}

function Copy-SkillTree {
    param(
        [Parameter(Mandatory)][string]$SourceRoot,
        [Parameter(Mandatory)][string]$DestRoot
    )
    if (-not (Test-Path $SourceRoot)) {
        Write-Warning "  Skills source missing, skipped: $SourceRoot"
        return
    }
    foreach ($sd in Get-ChildItem -Path $SourceRoot -Directory) {
        $target = Join-Path $DestRoot $sd.Name
        if ($DryRun) {
            Write-Host "  [dry-run] sync folder: $($sd.FullName) -> $target" -ForegroundColor DarkGray
        } else {
            if (-not (Test-Path $target)) {
                New-Item -ItemType Directory -Path $target -Force | Out-Null
            }
            Copy-Item -Path (Join-Path $sd.FullName '*') -Destination $target -Recurse -Force
            Write-Host "  $($sd.Name)/" -ForegroundColor Green
        }
    }
}

# --- Load toolsets ---------------------------------------------------
Write-Host "Loading tool-set definitions..." -ForegroundColor Yellow
$toolsets = Read-Toolsets -Path $ToolsetsFile
Write-Host ("  {0} tool-set(s): {1}" -f $toolsets.Count, ($toolsets.Keys -join ', ')) -ForegroundColor Green
Write-Host ""

# --- Agents (with tool-set expansion) --------------------------------
Write-Host "Deploying agents..." -ForegroundColor Yellow
$agentDir = Join-Path $RepoRoot 'agents'
if (Test-Path $agentDir) {
    foreach ($f in Get-ChildItem -Path $agentDir -Filter '*.agent.md' -File) {
        $content = Expand-AgentTools -Path $f.FullName -Toolsets $toolsets
        Write-TargetFile -Path (Join-Path $PromptsDest $f.Name) -Content $content
    }
} else {
    Write-Warning "  agents/ not found, skipping."
}

# --- Instructions ----------------------------------------------------
Write-Host "Deploying instructions..." -ForegroundColor Yellow
$instrDir = Join-Path $RepoRoot 'instructions'
if (Test-Path $instrDir) {
    foreach ($f in Get-ChildItem -Path $instrDir -Filter '*.instructions.md' -File) {
        Copy-PlainFile -Source $f.FullName -Destination (Join-Path $PromptsDest $f.Name)
    }
} else {
    Write-Warning "  instructions/ not found, skipping."
}

# --- Skills ----------------------------------------------------------
Write-Host "Deploying skills..." -ForegroundColor Yellow
Copy-SkillTree -SourceRoot (Join-Path $RepoRoot 'skills') -DestRoot $SkillsDest

Write-Host ""
Write-Host "=== Installation Complete ===" -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "  DRY RUN - no files were written." -ForegroundColor Yellow
} else {
    Write-Host "  Prompts: $PromptsDest"
    Write-Host "  Skills:  $SkillsDest"
    Write-Host ""
    Write-Host "  Reload VS Code (Ctrl+Shift+P -> 'Developer: Reload Window') to pick up changes." -ForegroundColor Yellow
}
