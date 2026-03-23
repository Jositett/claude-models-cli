# Claude Models CLI - Development Tasks

## ✅ v1.0.0 Released (2026-03-23)

**Release:** https://github.com/Jositett/claude-models-cli/releases/tag/v1.0.0

### Completed for v1.0.0
- [x] Bun-based cross-platform CLI (macOS, Linux, Windows)
- [x] OpenRouter provider with smart model scoring
- [x] Quick launch shortcuts: `cm1`-`cm10`
- [x] Auto-fallback launcher: `cla`
- [x] `cm version` and `cm info` commands
- [x] JSON output support (`cm list --json`)
- [x] Improved error handling (rate limits, auth errors)
- [x] Shell alias generation (bash/zsh/fish/PowerShell)
- [x] Activity logging and configuration management
- [x] Comprehensive documentation (usage guide, changelog, examples)
- [x] Pre-commit hooks (type check + tests)
- [x] Manual release process (Git tag + GitHub release)
- [x] GitHub repository configured with GitHub Actions (CI/CD workflow)
- [x] Repository: https://github.com/Jositett/claude-models-cli

## ✅ v1.2.0 Released (2026-03-23) - Model Probing

**Release:** https://github.com/Jositett/claude-models-cli/releases/tag/v1.2.0

### Completed for v1.2.0
- [x] Model probing: `cm probe` and `cm scan` commands
- [x] ProbeManager class with caching (24h TTL)
- [x] OpenRouterProvider.testModel() method
- [x] Sequential probing with configurable limit
- [x] JSON output for probe results
- [x] Cost warning before probing
- [x] Display response time and context length
- [x] Recommended working models list
- [x] Updated documentation (README, CHANGELOG, usage-guide)

---

## Current Status
- ✅ **v1.2.0** - Latest release with model probing
- ⚠️ GitHub Actions: Billing lock prevents CI runners (workflow exists)
- 🎯 Next: Future enhancements (see backlog)

## Completed (v1.1.0)
- [x] **Model caching** (cache.ts, cm1-cm10, cache commands)
- [x] **Interactive selection** (`cm select`)
- [x] Build system fix: switched to tsc

---

### Priority 1: Quality of Life
- [x] **Model caching**: Reduce OpenRouter API calls with local cache
- [ ] **Config validation**: JSON schema for config.json
- [ ] **Retry logic**: Exponential backoff for transient failures
- [ ] **Better help**: Add examples to `cm --help`
- [ ] **Installation verification**: Check Bun dependency before install

### Priority 2: Provider Enhancements
- [ ] **Ollama**: Test and document local model usage
- [ ] **HuggingFace**: Implement real API integration
- [ ] **Provider priority**: Configure which provider to try first
- [ ] **Provider health**: Track success/failure rates per provider

### Priority 3: Filtering & UX
- [ ] **Model filtering**: Filter list by provider, context size, score
- [ ] **Model search**: Search through model names/descriptions
- [x] **Selection prompt**: Interactive `cm select` to choose model
- [ ] **Color customization**: Respect NO_COLOR env var

### Priority 4: Advanced Features
- [ ] **Benchmark mode**: Measure model response times
- [ ] **Config migrations**: Auto-upgrade config between versions
- [ ] **Telemetry opt-in**: Anonymous usage stats (GDPR compliant)

## Completed Tasks (v1.0.0)
- [x] Convert PowerShell to Bun/TypeScript
- [x] Change shortcuts from cl1-cl10 to cm1-cm10
- [x] Write comprehensive tests (8 passing)
- [x] Create install.sh for Unix/Linux/macOS
- [x] Create install.ps1 for Windows
- [x] Add .bunrc for Bun configuration
- [x] Add pre-commit hooks
- [x] Create docs/usage-guide.md
- [x] Create CHANGELOG.md
- [x] Create config.example.json
- [x] Implement JSON output flag
- [x] Add version and info commands
- [x] Improved error handling (rate limit, auth)
- [x] Push to GitHub (Jositett/claude-models-cli)
- [x] Create v1.0.0 release

## Backlog / Future (v2.0.0+)
- [ ] VS Code extension
- [ ] Homebrew formula
- [ ] Windows scoop installer
- [ ] Docker image
- [ ] Multiple provider smart failover
- [ ] Model performance history
- [ ] Web UI for model management
- [ ] Plugin system for custom providers
- [ ] Model benchmark comparisons
- [ ] Community model rankings

## Notes
- GitHub Actions blocked by billing issue (account lock). Workflow exists but won't run until billing resolved.
- For now, use manual releases via git tag + gh release create.
- CI would ideally run tests on push and auto-publish releases.

