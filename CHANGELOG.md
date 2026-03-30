# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.0] - 2026-03-30

### Added
- **PowerShell support**: `cm export` now generates platform-specific aliases
  - Windows: `aliases.ps1` with PowerShell syntax (`$env:VAR`, functions)
  - Unix: `aliases.sh` with bash/zsh/fish syntax (unchanged)
  - Help text and `cm select` output now show platform-specific instructions
- **Consistent command naming**: Renamed `cla` to `cma` to follow the `cm` convention
- **Self-update command**: `cm self-update` to update the CLI to latest version
  - Supports `--dry-run` to check without installing
  - Supports `--json` for machine-readable output
  - Git-based installation detection with helpful error messages

### Changed
- Simplified alias generation: Removed recursive `claude-models` function; `cm` now directly invokes the wrapper script
- Updated all documentation to reflect `cma` naming

### Testing
- Added unit tests for self-update helpers (5 tests passing)

### Fixed
- Fixed PowerShell environment variable syntax errors (was using bash `export` on Windows)
- Fixed potential infinite recursion in bash alias definitions

## [Unreleased]

### Added
- **Better help**: `cm --help` now includes practical usage examples showing common workflows and command combinations
- **NO_COLOR support**: When `NO_COLOR` environment variable is set, all colored output is disabled (standard accessibility compliance)

### Changed
- Color functions now check `NO_COLOR` on each call (dynamic updates)
- Probe status indicators (✓/✗/?) in `cm select` respect `NO_COLOR`

### Testing
- Added unit tests for NO_COLOR behavior (2 tests passing)

## [1.4.0] - 2026-03-23

### Added
- **Configuration validation**: Full schema validation for config.json
  - New `src/config/validation.ts` module
  - `cm config validate` command to check config
  - `cm config` subcommands: `edit` (default) and `validate`
  - Validates types, ranges, enums, and nested provider settings
  - Helpful error messages with suggestions for fixes
  - Auto-normalization merges with defaults on valid partial configs
  - 12 unit tests covering validation scenarios
- **Improved error handling**: Config load failures now show clear validation errors before falling back to defaults

### Changed
- ConfigManager.loadConfig() now validates and normalizes config
- Unknown fields are ignored (forward compatible)
- Missing fields are filled from DEFAULT_CONFIG

### Fixed
- Prevents invalid config from causing obscure runtime errors

## [1.3.0] - 2026-03-23

### Added
- **Retry logic with exponential backoff**: Automatic retries for transient failures
  - New `src/utils/retry.ts` with `retryWithBackoff` utility
  - Integrated into `OpenRouterProvider` (both `fetchModels` and `testModel`)
  - Integrated into `OllamaProvider` (`fetchModels`)
  - Smart retry decisions: retries on 429 (rate limit), 5xx server errors, network errors
  - Avoids retry on permanent errors: 401 (unauthorized), 402 (insufficient credits), 404 (not found)
  - Configurable via environment variables:
    - `OPENROUTER_RETRY_ATTEMPTS` (default 3)
    - `OPENROUTER_RETRY_DELAY_MS` (default 1000)
    - `OLLAMA_RETRY_ATTEMPTS` (default 2)
    - `OLLAMA_RETRY_DELAY_MS` (default 500)
  - Exponential backoff with jitter to avoid thundering herd
  - Unit tests for retry logic (13 tests passing)

### Changed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- N/A

## [1.2.1] - 2026-03-23

### Added
- **Model probing**: `cm probe` and `cm scan` commands to test which models actually respond
  - Tests models with a minimal "Hi" request (max_tokens=1) to verify they work
  - Displays progress in real-time with status (✓/✗), response time, and context length
  - Caches results for 24 hours to avoid repeated API calls
  - Supports `--limit N` (default 10), `--force` (ignore cache), `--json` output
  - Shows summary of working vs failed models and recommends top 3 fastest
  - Cost-conscious: warns about credits, uses minimal tokens
- **OpenRouterProvider.testModel()**: New method to programmatically test a single model

### Changed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- N/A

## [1.2.1] - 2026-03-23

### Added
- **Concurrency control**: Probe up to 3 models in parallel (configurable with `--concurrency`)
- **Probe status in select**: `cm select` now shows ✓ (working), ✗ (failing), ? (not tested) indicators
- **Filter by probe status**: `cm select --only-working` shows only successfully probed models
- **Async probe loading**: Probe results load in background without slowing down select UI
- **Status legend**: Added legend explaining the status indicators

### Changed
- Default probing concurrency increased from 1 to 3 for faster scans
- Probe results caching remains 24h TTL

### Fixed
- Type safety improvements in ProbeManager result handling

## [1.1.0] - 2026-03-23

### Added
- **Model caching**: TTL-based local cache to reduce OpenRouter API calls
- **Cache management commands**: `cm cache clear`, `cm cache stats`
- **Interactive model selection**: `cm select` for choosing models from a TUI list
- **Build system improvement**: Switched to TypeScript compilation for better compatibility

### Changed
- Build process: Now uses `tsc` instead of Bun bundler
- Updated fs operations to use Node's `fs` module

### Fixed
- Bundled dist files now work correctly (was broken with Bun bundler)
- Type safety improvements across codebase

### Security
- N/A

## [1.0.0] - 2026-03-23

### Added
- **Cross-platform CLI**: Built with Bun, works on macOS, Linux, Windows
- **OpenRouter integration**: Fetches free models with smart scoring for coding tasks
- **Ollama provider**: Support for local models (when Ollama is running)
- **Quick launch shortcuts**: `cm1` through `cm10` for instant model access
- **Auto-fallback launcher**: `cla` automatically tries models until one works
- **Configuration management**: JSON-based config at `~/.claude-models-cli/`
- **Activity logging**: Track usage and changes in `activity.log`
- **Shell alias generation**: Supports bash, zsh, fish, and PowerShell
- **JSON output**: `cm list --json` for scripting and automation
- **Version and info commands**: `cm version`, `cm info` for debugging
- **Improved error handling**: Specific messages for rate limits (429), auth (401), etc.
- **Pre-commit hooks**: Run type checking and tests automatically
- **Comprehensive documentation**: Usage guide, examples, troubleshooting
- **GitHub repository**: Full open-source release with MIT License

### Changed
- N/A

### Deprecated
- N/A

### Removed
- PowerShell-only version (replaced with Bun/TypeScript)

### Fixed
- Cross-platform path handling (Windows/macOS/Linux)
- Config directory creation on all platforms
- Test isolation with `TEST_CONFIG_DIR` env override

### Security
- No hardcoded API keys
- Config file kept in user's home directory
- Optional logging respecting user privacy

## [0.1.0] - Early Development (unreleased)
- Initial prototype with PowerShell
- Basic model fetching concept

[Unreleased]: https://github.com/Jositett/claude-models-cli/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Jositett/claude-models-cli/releases/tag/v1.0.0
