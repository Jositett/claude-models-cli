Describe "ClaudeModelsCLI" {
    BeforeAll {
        Import-Module "$PSScriptRoot\..\src\ClaudeModelsCLI.psm1" -Force
    }

    Context "Module Loading" {
        It "Should import without errors" {
            { Get-Command Update-ModelList } | Should -Not -Throw
        }
    }

    Context "Configuration" {
        It "Should create config directory" {
            Initialize-Config
            Test-Path "$env:USERPROFILE\.claude-models-cli" | Should -Be $true
        }
    }

    Context "Model Functions" {
        It "Should return models from OpenRouter" {
            $models = Get-OpenRouterModels -Limit 5
            $models | Should -Not -BeNullOrEmpty
            $models.Count | Should -BeLessOrEqual 5
        }
    }
}
