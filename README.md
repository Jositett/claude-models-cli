# Claude Models CLI 🚀

A PowerShell CLI tool for managing and launching [Claude Code](https://claude.ai/code) with free AI models from OpenRouter, HuggingFace, Ollama, and more.

![PowerShell](https://img.shields.io/badge/PowerShell-7.0+-blue.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)

## Features

- 🔥 **Auto-discover** top 10 free programming models daily
- ⚡ **Quick launch** with `cl1`, `cl2`, `cl3`... `cl10` shortcuts
- 🔄 **Auto-rotate** when rate limits hit
- 🔌 **Multi-provider** support (OpenRouter, HuggingFace, Ollama)
- 📊 **Activity logging** and usage tracking
- 🛠️ **Smart defaults** for coding tasks

## Quick Start

### One-line Install
```powershell
irm https://raw.githubusercontent.com/YOURUSERNAME/claude-models-cli/main/install.ps1 | iex
```

### Manual Install
```powershell
git clone https://github.com/YOURUSERNAME/claude-models-cli.git
cd claude-models-cli
.\install.ps1
```

## Usage

### Setup
```powershell
# Set your OpenRouter API key
$env:OPENROUTER_API_KEY = "sk-or-v1-..."

# Update models list (fetches latest free models)
clm update

# Generate shortcuts
. "$env:USERPROFILE\.claude-models-cli\aliases.ps1"
```

### Launch Models
```powershell
cl1    # Launch #1 ranked model (usually Qwen3 Coder)
cl2    # Launch #2 model
cl3    # Launch #3 model
# ... up to cl10

cla    # Auto-try models until one works (rate limit handling)
```

### Management
```powershell
clm list        # Show current top 10 models
clm update      # Force refresh model list
clm providers   # Show configured providers
clm config      # Edit configuration
clm logs        # View recent activity
```

## Providers

| Provider | Status | Description |
|----------|--------|-------------|
| OpenRouter | ✅ Active | 10+ free models, auto-rotation |
| HuggingFace | 🚧 Planned | Free inference endpoints |
| Ollama | 🚧 Planned | Local model support |
| Groq | 📋 Backlog | Fast free tier |

## Configuration

Edit `$env:USERPROFILE\.claude-models-cli\config.json`:

```json
{
  "version": "1.0.0",
  "defaultProvider": "openrouter",
  "autoUpdate": true,
  "updateIntervalHours": 24,
  "maxModels": 10,
  "preferredContext": "coding",
  "rateLimitHandling": "rotate"
}
```

## Project Structure

```
claude-models-cli/
├── src/
│   ├── ClaudeModelsCLI.psm1      # Main module
│   ├── functions/                 # Helper functions
│   └── providers/                 # Provider implementations
├── tests/                         # Pester tests
├── docs/                          # Documentation
├── scripts/                       # Utility scripts
├── install.ps1                    # One-line installer
└── README.md                      # This file
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup

```powershell
git clone https://github.com/YOURUSERNAME/claude-models-cli.git
cd claude-models-cli
Import-Module .\src\ClaudeModelsCLI.psm1 -Force
```

## Roadmap

- [ ] HuggingFace provider integration
- [ ] Ollama local model support
- [ ] Model performance benchmarking
- [ ] VS Code extension
- [ ] Cross-platform support (Linux/macOS)

## License

MIT License - see [LICENSE](LICENSE) file

## Acknowledgments

- [Anthropic](https://anthropic.com) for Claude Code
- [OpenRouter](https://openrouter.ai) for free model access
- [Qwen](https://qwenlm.github.io), [DeepSeek](https://deepseek.com), [Mistral](https://mistral.ai) for open models
