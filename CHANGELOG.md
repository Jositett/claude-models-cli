# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- N/A

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
