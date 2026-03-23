# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial public release
- Bun-based cross-platform CLI
- OpenRouter provider with smart model scoring
- Ollama provider support for local models
- Quick launch shortcuts: `cm1` through `cm10`
- Auto-fallback launcher: `cla`
- Configuration management with `~/.claude-models-cli/`
- Activity logging
- Shell alias generation (bash, zsh, fish, PowerShell)
- GitHub Actions CI for Windows, macOS, Linux
- Comprehensive test suite with 8 passing tests

### Changed
- N/A (initial release)

### Deprecated
- N/A

### Removed
- PowerShell-only implementation (replaced with Bun/TypeScript)

### Fixed
- N/A (initial release)

### Security
- N/A

## [1.0.0] - 2026-03-23

### Added
- First stable release
- Cross-platform support (Windows, macOS, Linux)
- Model discovery from OpenRouter API
- Configurable scoring for programming-focused models
- Automatic model list updates (configurable interval)
- Rate limit handling with auto-rotation
- Complete documentation
- MIT License

[Unreleased]: https://github.com/Jositett/claude-models-cli/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Jositett/claude-models-cli/releases/tag/v1.0.0
