#!/usr/bin/env pwsh
# Claude Models CLI - Windows Installation Script (PowerShell)
# Usage: irm https://raw.githubusercontent.com/Jositett/claude-models-cli/main/install.ps1 | iex

$ErrorActionPreference = "Stop"

Write-Host "🚀 Installing Claude Models CLI..." -ForegroundColor Cyan

# Check if Bun is installed
try {
    $bunVersion = bun --version 2>$null
    if (-not $bunVersion) {
        Write-Host "❌ Bun is not installed!" -ForegroundColor Red
        Write-Host "Please install Bun first: https://bun.sh" -ForegroundColor Yellow
        Write-Host "Or use: winget install Bun.sh.Bun" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "✅ Bun detected: $bunVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Bun is not installed!" -ForegroundColor Red
    Write-Host "Please install Bun first: https://bun.sh" -ForegroundColor Yellow
    exit 1
}

$RepoUrl = "https://github.com/Jositett/claude-models-cli"
$ConfigDir = "$env:USERPROFILE\.claude-models-cli"

# Clone repository if not exists
$destDir = "$env:USERPROFILE\.claude-models-cli-repo"

if (Test-Path $destDir) {
    Write-Host "📁 Repository already exists, updating..." -ForegroundColor Yellow
    Set-Location $destDir
    git pull
} else {
    Write-Host "📥 Cloning repository..." -ForegroundColor Cyan
    git clone $RepoUrl $destDir
}

# Build the project
Set-Location $destDir
Write-Host "🔨 Building project..." -ForegroundColor Cyan
bun install
bun run build

# Create global symlink
$globalBin = "$env:USERPROFILE\bin\cm"
if (-not (Test-Path "$env:USERPROFILE\bin")) {
    New-Item -ItemType Directory -Path "$env:USERPROFILE\bin" -Force | Out-Null
}

# Create batch wrapper for Windows
$batchWrapper = @"
@echo off
bun "$destDir\dist\cli.js" %*
"@
$batchWrapper | Out-File "$globalBin.cmd" -Encoding ASCII

# Create PowerShell wrapper
$psWrapper = @"
#!/usr/bin/env pwsh
bun "$destDir\dist\cli.js" @args
"@
$psWrapper | Out-File "$globalBin.ps1" -Encoding utf8

# Ensure bin directory is in PATH
$currentPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if ($currentPath -notlike "*$env:USERPROFILE\bin*") {
    [Environment]::SetEnvironmentVariable('Path', "$currentPath;$env:USERPROFILE\bin", 'User')
    Write-Host "⚠️  Added ~\bin to PATH. Restart your terminal to use 'cm' globally." -ForegroundColor Yellow
}

# Setup config directory
New-Item -ItemType Directory -Path $ConfigDir -Force | Out-Null

Write-Host "`n✅ Installation complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Restart your terminal or run: `$env:Path += ';$env:USERPROFILE\bin'" -ForegroundColor White
Write-Host "2. Set your API key:" -ForegroundColor White
Write-Host "   `$env:OPENROUTER_API_KEY = 'sk-or-v1-...'" -ForegroundColor Gray
Write-Host "3. Fetch models:" -ForegroundColor White
Write-Host "   cm update" -ForegroundColor Gray
Write-Host "4. Generate aliases:" -ForegroundColor White
Write-Host "   cm export" -ForegroundColor Gray
Write-Host "   source ~/.claude-models-cli/aliases.sh" -ForegroundColor Gray
Write-Host "`nOr for PowerShell profile:" -ForegroundColor Cyan
Write-Host "   Add-Content `$PROFILE \"source `$env:USERPROFILE\.claude-models-cli\aliases.ps1\"" -ForegroundColor Gray
Write-Host "`n📖 See README.md for full documentation" -ForegroundColor Magenta
