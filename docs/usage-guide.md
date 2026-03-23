# Usage Guide - Claude Models CLI

## Table of Contents
- [Quick Start](#quick-start)
- [Daily Usage](#daily-usage)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Advanced Topics](#advanced-topics)

## Quick Start

### 1. Set Your API Key

OpenRouter is the primary provider. Get your free API key:

```bash
# Get your key from https://openrouter.ai/keys
export OPENROUTER_API_KEY="sk-or-v1-..."
```

**Tip:** Add this to your `~/.bashrc`, `~/.zshrc`, or `~/.profile` to persist.

### 2. Fetch Models

```bash
# Download and rank the latest free models
cm update
```

This contacts OpenRouter, filters for free models, and ranks them based on programming suitability.

### 3. Generate Shortcuts

```bash
# Create cm1-cm10 shortcuts and cla auto-fallback
cm export

# Add to your shell configuration (one-time)
echo "source ~/.claude-models-cli/aliases.sh" >> ~/.bashrc
# or for zsh:
echo "source ~/.claude-models-cli/aliases.sh" >> ~/.zshrc
# then reload:
source ~/.bashrc  # or source ~/.zshrc
```

### 4. Start Coding

```bash
cm1  # Launch #1 ranked model (usually Qwen3-32B-Coder)
# or use cla to auto-try models until one succeeds
cla
```

## Daily Usage

### Launching Models

The `cm1`-`cm10` shortcuts launch pre-configured models:

```bash
cm1    # Best model (highest score)
cm2    # Second best
cm3    # Third best
# ... up to cm10
```

**How it works:** Each shortcut sets the `ANTHROPIC_MODEL` environment variable and runs `claude`. The model ID comes from OpenRouter.

### Smart Fallback: `cla`

When you hit rate limits or a model is unavailable, use:

```bash
cla    # Tries cm1, falls back to cm2, cm3, etc.
```

This automatically cycles through ranked models until one accepts your request. Great for:
- Rate limit recovery
- Testing multiple models
- Ensuring you always get a response

### Managing Models

```bash
# Show current top 10 models with scores
cm list

# Force refresh the model list (ignores cache)
cm update --force

# View recent activity
cm logs

# Edit configuration
cm config
```

## Configuration

### Config File Location

- **Linux/macOS:** `~/.claude-models-cli/config.json`
- **Windows:** `%USERPROFILE%\.claude-models-cli\config.json`

### Default Configuration

```json
{
  "version": "1.0.0",
  "defaultProvider": "openrouter",
  "autoUpdate": true,
  "updateIntervalHours": 24,
  "maxModels": 10,
  "preferredContext": "coding",
  "rateLimitHandling": "rotate",
  "logActivity": true,
  "debug": false,
  "providers": {
    "openrouter": {
      "priority": 1,
      "enabled": true
    },
    "ollama": {
      "priority": 2,
      "enabled": true,
      "baseUrl": "http://localhost:11434"
    }
  }
}
```

### Settings Explained

| Setting | Default | Description |
|---------|---------|-------------|
| `updateIntervalHours` | 24 | Skip fetching if models.json is younger than this |
| `maxModels` | 10 | Maximum models to keep in list (1-50) |
| `rateLimitHandling` | `rotate` | `rotate` (auto-fallback), `fail`, or `retry` |
| `logActivity` | `true` | Write activity log to `activity.log` |
| `debug` | `false` | Enable verbose logging |

## Troubleshooting

### "OPENROUTER_API_KEY not set"

Make sure you've exported your API key:

```bash
export OPENROUTER_API_KEY="sk-or-v1-..."
# or on Windows PowerShell:
$env:OPENROUTER_API_KEY="sk-or-v1-..."
```

### Models list is stale / outdated

Force a refresh:

```bash
cm update --force
```

### "No models found" error

You probably haven't fetched models yet. Run:

```bash
cm update
```

### `cm` command not found

1. Ensure `bun` is installed: `bun --version`
2. Install the CLI: `bun install && bun run build`
3. Or use the global installers (`install.sh` or `install.ps1`)

### Rate limits hit

OpenRouter free tier has limits. Use `cla` for automatic fallback, or wait a few hours. You can also add more API keys or use different providers.

### Windows path issues

On Windows PowerShell, use forward slashes in paths:

```powershell
$env:USERPROFILE\.claude-models-cli\config.json
```

The install.ps1 script handles this automatically.

### Local Ollama not detected

Ensure Ollama is running:

```bash
# Start Ollama service
ollama serve
# In another terminal, pull a model:
ollama pull llama2
```

Then run `cm update` and your local models will appear.

## Advanced Topics

### Custom Model Scoring

The model scoring algorithm prioritizes:

1. **Programming keywords** in description (+100 points):
   - coder, code, programming, dev, software, agent

2. **Reasoning capabilities** (+50 points):
   - reasoning, thinking, instruct, chat

3. **Provider reputation** (+30 points):
   - qwen, deepseek, mistral, meta, nvidia, anthropic

4. **Context length bonus** (up to +50 points):
   - Larger context = better for coding

To customize scoring, edit `src/providers/openrouter.ts` in the `scoreModel()` method.

### JSON Output

For scripting and automation:

```bash
cm list --json | jq '.[0].id'
```

(Note: `--json` flag planned for v1.1.0)

### Using Without Aliases

If you don't want to use the alias system, call the CLI directly:

```bash
bun run start cm1  # Same as just `cm1` after aliases
```

Or add to PATH after global install:

```bash
# After running install.ps1 or install.sh:
which cm  # Should show ~/.local/bin/cm or similar
```

### Multiple Configurations

Use a different config directory:

```bash
# Temporarily override:
CLAUDE_MODELS_CONFIG_DIR=~/alt-config cm update

# Permanently (add to shell profile):
export CLAUDE_MODELS_CONFIG_DIR="$HOME/.config/claude-models-alt"
```

## Getting Help

- **Documentation:** https://github.com/Jositett/claude-models-cli
- **Issues:** https://github.com/Jositett/claude-models-cli/issues
- **Discussions:** https://github.com/Jositett/claude-models-cli/discussions

## Contributing

Found a bug or want to add a feature? Contributions welcome!

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development setup.

---

Happy coding! 🚀
