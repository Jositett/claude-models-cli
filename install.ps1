#!/usr/bin/env pwsh
# Claude Models CLI - Installation Script
# Usage: irm https://raw.githubusercontent.com/YOURUSERNAME/claude-models-cli/main/install.ps1 | iex

$ErrorActionPreference = "Stop"

$RepoUrl = "https://github.com/YOURUSERNAME/claude-models-cli"
$InstallDir = "$env:USERPROFILE\Documents\PowerShell\Modules\ClaudeModelsCLI"
$ConfigDir = "$env:USERPROFILE\.claude-models-cli"

Write-Host "Installing Claude Models CLI..." -ForegroundColor Cyan

# Create directories
New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
New-Item -ItemType Directory -Path $ConfigDir -Force | Out-Null

# Download module files (in real scenario, these come from GitHub)
# For now, we'll create them locally
$ModuleContent = @"
# Placeholder - will be replaced with actual module content
"@

# Create module manifest
$Manifest = @{
    Path = "$InstallDir\ClaudeModelsCLI.psd1"
    RootModule = "ClaudeModelsCLI.psm1"
    ModuleVersion = "1.0.0"
    Author = "Joedroid"
    Description = "CLI tool for managing free AI models with Claude Code"
    PowerShellVersion = "7.0"
    FunctionsToExport = @('Update-ModelList', 'Export-ClaudeAliases', 'Get-ModelList', 'claude-models')
    AliasesToExport = @('clm', 'cl1', 'cl2', 'cl3', 'cl4', 'cl5', 'cl6', 'cl7', 'cl8', 'cl9', 'cl10', 'cla')
}

New-ModuleManifest @Manifest

Write-Host "Installation complete!" -ForegroundColor Green
Write-Host "Run the following to get started:" -ForegroundColor Yellow
Write-Host "  Import-Module ClaudeModelsCLI" -ForegroundColor White
Write-Host "  Update-ModelList" -ForegroundColor White
Write-Host "  Export-ClaudeAliases" -ForegroundColor White
Write-Host "  . '$ConfigDir\aliases.ps1'" -ForegroundColor White
