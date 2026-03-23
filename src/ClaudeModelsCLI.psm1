# Claude Models CLI - Main Module
# A PowerShell module for managing and launching Claude Code with free AI models

$script:ConfigDir = "$env:USERPROFILE\.claude-models-cli"
$script:ConfigFile = "$ConfigDir\config.json"
$script:ModelsFile = "$ConfigDir\models.json"
$script:ProvidersFile = "$ConfigDir\providers.json"
$script:AliasesFile = "$ConfigDir\aliases.ps1"
$script:LogFile = "$ConfigDir\activity.log"

# Ensure config directory exists
function Initialize-Config {
    if (!(Test-Path $ConfigDir)) {
        New-Item -ItemType Directory -Path $ConfigDir -Force | Out-Null
    }

    # Create default config if not exists
    if (!(Test-Path $ConfigFile)) {
        $defaultConfig = @{
            version = "1.0.0"
            defaultProvider = "openrouter"
            autoUpdate = $true
            updateIntervalHours = 24
            maxModels = 10
            preferredContext = "coding"
            rateLimitHandling = "rotate"
            logActivity = $true
        }
        $defaultConfig | ConvertTo-Json -Depth 3 | Out-File $ConfigFile -Encoding utf8
    }
}

# Provider: OpenRouter
function Get-OpenRouterModels {
    [CmdletBinding()]
    param(
        [int]$Limit = 10,
        [string]$Context = "coding"
    )

    try {
        Write-Verbose "Fetching models from OpenRouter..."
        $response = Invoke-RestMethod -Uri "https://openrouter.ai/api/v1/models" -Method Get -TimeoutSec 30

        $freeModels = $response.data | Where-Object {
            $_.id -like "*:free" -or ($_.pricing.prompt -eq "0" -and $_.pricing.completion -eq "0")
        }

        # Score models based on programming suitability
        $scoredModels = foreach ($model in $freeModels) {
            $score = 0
            $id = $_.id.ToLower()
            $desc = ($_.description + " " + $_.name).ToLower()

            # Programming keywords
            if ($desc -match "coder|code|programming|dev|software|agent") { $score += 100 }
            if ($desc -match "reasoning|thinking|instruct") { $score += 50 }

            # Provider reputation
            if ($id -match "qwen|deepseek|mistral|meta|nvidia") { $score += 30 }

            # Context length bonus
            $score += [math]::Min(50, [int]($_.context_length / 5000))

            [PSCustomObject]@{
                ID = $_.id
                Name = $_.name
                Provider = ($_.id -split '/')[0]
                ContextLength = $_.context_length
                Description = $_.description
                Score = $score
                Pricing = $_.pricing
                Source = "OpenRouter"
            }
        }

        return $scoredModels | Sort-Object Score -Descending | Select-Object -First $Limit
    }
    catch {
        Write-Error "Failed to fetch OpenRouter models: $_"
        return $null
    }
}

# Provider: HuggingFace (Future implementation)
function Get-HuggingFaceModels {
    [CmdletBinding()]
    param([int]$Limit = 10)

    Write-Warning "HuggingFace provider not yet implemented. Contributions welcome!"
    return @()
}

# Provider: Ollama (Local models)
function Get-OllamaModels {
    [CmdletBinding()]
    param([int]$Limit = 10)

    try {
        $response = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 5
        return $response.models | Select-Object -First $Limit | ForEach-Object {
            [PSCustomObject]@{
                ID = "ollama/$($_.name)"
                Name = $_.name
                Provider = "Ollama"
                ContextLength = 4096
                Description = "Local model: $($_.name)"
                Score = 50
                Source = "Ollama"
            }
        }
    }
    catch {
        Write-Verbose "Ollama not running or not installed"
        return @()
    }
}

# Main function to fetch all models
function Update-ModelList {
    [CmdletBinding()]
    param(
        [switch]$Force,
        [string[]]$Providers = @("openrouter")
    )

    Initialize-Config

    $config = Get-Content $ConfigFile | ConvertFrom-Json

    # Check if update needed
    if (!$Force -and (Test-Path $ModelsFile)) {
        $lastUpdate = (Get-Item $ModelsFile).LastWriteTime
        $hoursSince = (Get-Date) - $lastUpdate | Select-Object -ExpandProperty TotalHours

        if ($hoursSince -lt $config.updateIntervalHours) {
            Write-Host "Models list is recent ($([math]::Round($hoursSince, 1)) hours old). Use -Force to update anyway." -ForegroundColor Yellow
            return Get-Content $ModelsFile | ConvertFrom-Json
        }
    }

    Write-Host "Fetching latest free models..." -ForegroundColor Cyan

    $allModels = @()

    foreach ($provider in $Providers) {
        switch ($provider.ToLower()) {
            "openrouter" { $allModels += Get-OpenRouterModels -Limit $config.maxModels }
            "huggingface" { $allModels += Get-HuggingFaceModels -Limit $config.maxModels }
            "ollama" { $allModels += Get-OllamaModels -Limit $config.maxModels }
            default { Write-Warning "Unknown provider: $provider" }
        }
    }

    # Rank and save
    $ranked = $allModels | Sort-Object Score -Descending | Select-Object -First $config.maxModels

    $output = foreach ($model in $ranked) {
        [PSCustomObject]@{
            Rank = [array]::IndexOf($ranked, $model) + 1
            ID = $model.ID
            Name = if ($model.Name) { $model.Name } else { ($model.ID -split '/' | Select-Object -Last 1) -replace ':free','' }
            Provider = $model.Provider
            Context = "$([math]::Round($model.ContextLength / 1000))K"
            ContextLength = $model.ContextLength
            Description = if ($model.Description) { $model.Description.Substring(0, [Math]::Min(100, $model.Description.Length)) + "..." } else { "Free tier model" }
            Score = $model.Score
            Source = $model.Source
            LastUpdated = (Get-Date -Format "yyyy-MM-dd HH:mm")
        }
    }

    $output | ConvertTo-Json -Depth 3 | Out-File $ModelsFile -Encoding utf8

    # Log activity
    if ($config.logActivity) {
        "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Updated models list: $($output.Count) models from $($Providers -join ', ')" | Out-File $LogFile -Append
    }

    Write-Host "Updated $($output.Count) models" -ForegroundColor Green
    return $output
}

# Generate PowerShell aliases
function Export-ClaudeAliases {
    [CmdletBinding()]
    param()

    Initialize-Config

    if (!(Test-Path $ModelsFile)) {
        Write-Error "No models found. Run Update-ModelList first."
        return
    }

    $models = Get-Content $ModelsFile | ConvertFrom-Json
    $config = Get-Content $ConfigFile | ConvertFrom-Json

    $aliasScript = @"
# Claude Models CLI - Auto-generated Aliases
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# Version: $($config.version)

# Environment setup
`$env:ANTHROPIC_BASE_URL = 'https://openrouter.ai/api'
`$env:ANTHROPIC_API_KEY = ''

# Ensure auth token is set
if (!`$env:ANTHROPIC_AUTH_TOKEN -and !`$env:OPENROUTER_API_KEY) {
    Write-Warning "OPENROUTER_API_KEY not set. Run: `$env:OPENROUTER_API_KEY = 'your-key'"
}

"@

    # Generate cl1-cl10 aliases
    foreach ($model in $models) {
        $aliasName = "cl$($model.Rank)"
        $aliasScript += @"

function global:$aliasName {
    [CmdletBinding()]
    param([Parameter(ValueFromRemainingArguments=`$true)]`$Arguments)

    if (!`$env:ANTHROPIC_AUTH_TOKEN -and `$env:OPENROUTER_API_KEY) {
        `$env:ANTHROPIC_AUTH_TOKEN = `$env:OPENROUTER_API_KEY
    }

    `$env:ANTHROPIC_MODEL = "$($model.ID)"

    if (`$Arguments) {
        claude @Arguments
    } else {
        claude
    }
}

"@
    }

    # Add utility functions
    $aliasScript += @"
function global:claude-models {
    [CmdletBinding()]
    param([string]`$Command = "list")

    Import-Module "$PSScriptRoot\ClaudeModelsCLI.psm1" -Force

    switch (`$Command) {
        "update" { Update-ModelList -Force }
        "list" { Get-ModelList }
        "providers" { Get-Content "$ConfigDir\providers.json" | ConvertFrom-Json }
        "config" { notepad "$ConfigDir\config.json" }
        "logs" { Get-Content "$ConfigDir\activity.log" -Tail 20 }
        default { Write-Host "Usage: claude-models [update|list|providers|config|logs]" }
    }
}

Set-Alias -Name clm -Value claude-models -Scope Global

function global:cla {
    # Smart launcher with fallback
    `$models = Get-Content "$ModelsFile" | ConvertFrom-Json
    `$config = Get-Content "$ConfigFile" | ConvertFrom-Json

    foreach (`$model in `$models) {
        Write-Host "Trying `$($model.ID)..." -ForegroundColor Gray
        `$env:ANTHROPIC_MODEL = `$model.ID

        try {
            claude 2>`$null
            if (`$LASTEXITCODE -eq 0) { break }
        }
        catch {
            continue
        }
    }
}

"@

    $aliasScript | Out-File $AliasesFile -Encoding utf8
    Write-Host "Generated aliases at: $AliasesFile" -ForegroundColor Green
    Write-Host "Load with: . '$AliasesFile'" -ForegroundColor Yellow
}

function Get-ModelList {
    if (!(Test-Path $ModelsFile)) {
        Write-Error "No models found. Run: claude-models update"
        return
    }

    $models = Get-Content $ModelsFile | ConvertFrom-Json

    Write-Host "`nTop Free Programming Models:" -ForegroundColor Green
    Write-Host "============================`n" -ForegroundColor Green

    foreach ($m in $models) {
        Write-Host "cl$($m.Rank) " -ForegroundColor Yellow -NoNewline
        Write-Host "$($m.ID) " -ForegroundColor Cyan -NoNewline
        Write-Host "($($m.Context)) " -ForegroundColor Gray -NoNewline
        if ($m.Source -ne "OpenRouter") { Write-Host "[$($m.Source)] " -ForegroundColor Magenta -NoNewline }
        Write-Host "- $($m.Description)" -ForegroundColor White
    }

    Write-Host "`nPro tip: Use 'cla' to auto-try models until one works" -ForegroundColor DarkGray
}

# Export functions
Export-ModuleMember -Function Update-ModelList, Export-ClaudeAliases, Get-ModelList, Initialize-Config
