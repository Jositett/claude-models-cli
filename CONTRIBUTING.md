# Contributing to Claude Models CLI

Thank you for your interest in contributing! 🎉

## Development Setup

1. Fork and clone the repository
2. Import the module in development mode:
   ```powershell
   Import-Module .\src\ClaudeModelsCLI.psm1 -Force
   ```
3. Make your changes
4. Test thoroughly

## Adding a New Provider

To add support for a new model provider (e.g., HuggingFace, Groq):

1. Create a new file in `src/providers/`: `ProviderName.ps1`
2. Implement the required function:
   ```powershell
   function Get-ProviderNameModels {
       param([int]$Limit = 10)
       # Return array of model objects with:
       # - ID, Name, Provider, ContextLength, Description, Score, Source
   }
   ```
3. Add provider to `Update-ModelList` function
4. Update documentation

## Code Style

- Use PowerShell verb-noun naming
- Include comment-based help
- Add error handling with try/catch
- Write verbose messages for debugging

## Testing

```powershell
Import-Module Pester
Invoke-Pester ./tests
```

## Pull Request Process

1. Update README.md with details of changes
2. Update version number in module manifest
3. Ensure all tests pass
4. Request review from maintainers
