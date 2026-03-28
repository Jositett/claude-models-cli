# Claude Models CLI 🚀

> 🎯 Your shortcut to free AI models with Claude Code

A cross-platform CLI tool for managing and launching [Claude Code](https://claude.ai/code) with free AI models from OpenRouter, HuggingFace, Ollama, and more.

Built with [Bun](https://bun.sh) for maximum performance and compatibility across macOS, Linux, and Windows.

[![Bun](https://img.shields.io/badge/Bun-1.0+-purple.svg)](https://bun.sh)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/Jositett/claude-models-cli.svg)](https://github.com/Jositett/claude-models-cli/releases)
[![GitHub issues](https://img.shields.io/github/issues/Jositett/claude-models-cli.svg)](https://github.com/Jositett/claude-models-cli/issues)
[![GitHub last commit](https://img.shields.io/github/last-commit/Jositett/claude-models-cli.svg)](https://github.com/Jositett/claude-models-cli/commits/master)

## Features

- 🔥 **Auto-discover** top 10 free programming models daily
- ⚡ **Quick launch** with `cm1`, `cm2`, `cm3`... `cm10` shortcuts (cm = Claude Models)
- 🔄 **Auto-rotate** when rate limits hit
- 🔌 **Multi-provider** support (OpenRouter, HuggingFace, Ollama)
- 💾 **Model caching** - reduces API calls with TTL-based local cache
- 🎯 **Interactive selection** - `cm select` for choosing models from TUI
- 🔍 **Model probing** - test which models actually work (`cm probe`)
- 📊 **Activity logging** and usage tracking
- 🛠️ **Smart defaults** for coding tasks
- 🌍 **Cross-platform** - works on macOS, Linux, and Windows
- 📄 **JSON output** for scripting and automation (`cm list --json`)
- ℹ️ **Environment info** with `cm info` for debugging
- 🎯 **Explicit rate limit messages** - know exactly what's wrong

## Quick Start

### Prerequisites
- [Bun](https://bun.sh) installed (>= 1.0.0)

### Install
```bash
# Clone and install
git clone https://github.com/Jositett/claude-models-cli.git
cd claude-models-cli
bun install
bun run build
```

### One-line installers

**Unix/Linux/macOS:**
```bash
curl -fsSL https://raw.githubusercontent.com/Jositett/claude-models-cli/master/install.sh | bash
```

**Windows PowerShell:**
```powershell
irm https://raw.githubusercontent.com/Jositett/claude-models-cli/master/install.ps1 | iex
```

## Usage

### Setup
```bash
# Set your OpenRouter API key
export OPENROUTER_API_KEY="sk-or-v1-..."

# Fetch latest free models
cm update

# Generate shell aliases (cm1-cm10, cla)
cm export

# Source the aliases (add to ~/.bashrc, ~/.zshrc, or ~/.config/fish/config.fish)
source ~/.claude-models-cli/aliases.sh
```

### Launch Models
```bash
cm1    # Launch #1 ranked model (usually Qwen3 Coder)
cm2    # Launch #2 model
cm3    # Launch #3 model
# ... up to cm10

cla    # Auto-try models until one works (smart fallback for rate limits)
```

### Management
```bash
cm list        # Show current top 10 models
cm update      # Force refresh model list
cm providers   # Show configured providers
cm config      # Edit configuration
cm logs        # View recent activity
cm export      # (Re)generate alias scripts
cm version     # Show version
cm info        # Show environment information
cm list --json # Get machine-readable output for scripting
cm --help      # Show all options

# Cache management (new in v1.1.0)
cm cache clear  # Clear the model cache
cm cache stats  # Show cache statistics (entries, size)

# Model probing (new in v1.2.0)
cm probe --limit 20  # Test models to see which actually work
cm scan --json       # Get machine-readable probe results
```

### Interactive Selection

```bash
cm select
```

Opens a text-based UI to choose a model interactively. Navigate with arrow keys and press Enter to launch your selected model. This is useful when you want to preview all available models with full details before choosing.

## Providers

| Provider | Status | Description |
|----------|--------|-------------|
| OpenRouter | ✅ Active | 10+ free models, auto-rotation |
| HuggingFace | 🚧 Planned | Free inference endpoints |
| Ollama | 🚧 Planned | Local model support |
| Groq | 📋 Backlog | Fast free tier |

## Configuration

The CLI uses a JSON configuration file at `~/.claude-models-cli/config.json`. You can create it manually or run `cm config edit` to open it in your editor.

**Validate your config:**
```bash
cm config validate
```

This checks for common errors and provides suggestions for fixing them.

**Example configuration:**

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
│   ├── index.ts      # Core library
│   ├── cli.ts        # Command-line interface
│   ├── config.ts     # Configuration management
│   ├── types.ts      # TypeScript definitions
│   └── providers/    # Provider implementations
├── dist/             # Compiled JavaScript (after build)
├── tests/            # Bun test files
├── docs/             # Documentation
├── scripts/          # Utility scripts
├── package.json      # Dependencies and scripts
├── tsconfig.json     # TypeScript config
├── install.sh        # Unix/Linux/macOS installer
├── install.ps1       # Windows PowerShell installer
└── README.md         # This file
```

## Development

```bash
# Clone and set up
git clone https://github.com/YOURUSERNAME/claude-models-cli.git
cd claude-models-cli
bun install

# Development mode (watch + rebuild)
bun run dev

# Build for production
bun run build

# Run tests
bun test

# Type checking
bun run types
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Adding a New Provider

1. Create `src/providers/ProviderName.ts`
2. Implement fetchModels() method returning `Model[]`
3. Register in `src/index.ts`
4. Update documentation

## Roadmap

- [x] Bun-based cross-platform CLI
- [x] OpenRouter integration
- [x] Shell alias generation (cm1-cm10)
- [ ] HuggingFace provider integration
- [ ] Ollama local model support
- [ ] Model performance benchmarking
- [ ] VS Code extension
- [ ] Configuration UI

## License

MIT License - see [LICENSE](LICENSE) file

## Acknowledgments

- [Anthropic](https://anthropic.com) for Claude Code and Bun
- [OpenRouter](https://openrouter.ai) for free model access
- [Qwen](https://qwenlm.github.io), [DeepSeek](https://deepseek.com), [Mistral](https://mistral.ai) for open models

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
