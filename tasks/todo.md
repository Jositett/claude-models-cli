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

### Completed for v1.2.1
- [x] Concurrency control (default 3) for faster probing
- [x] `cm select` shows probe status indicators (✓/✗/?)
- [x] Added `--only-working` flag to `cm select`
- [x] Async loading of probe results (non-blocking)
- [x] Legend for status indicators in select UI

### Completed for v1.3.0
- [x] Retry logic with exponential backoff
- [x] Configurable via environment variables (OPENROUTER_RETRY_ATTEMPTS, etc.)
- [x] Smart retry: retries on 429, 5xx, network errors; avoids 401/402/404
- [x] Applied to OpenRouterProvider (fetchModels, testModel)
- [x] Applied to OllamaProvider (fetchModels)
- [x] Added unit tests for retry logic (13 tests passing)

### Completed for v1.4.0
- [x] Config validation with JSON schema
- [x] `cm config validate` command
- [x] `cm config edit` subcommand (explicit)
- [x] Normalization with defaults for missing fields
- [x] Clear error messages with suggestions
- [x] 12 unit tests for validation logic

## ✅ v1.4.1 - Cross-Platform Improvements (2026-03-30)

### Completed
- [x] PowerShell support for `cm export`
  - [x] Generate `aliases.ps1` with correct syntax (`$env:VAR`, functions)
  - [x] Generate `aliases.sh` for Unix (unchanged)
  - [x] Platform-specific instructions in help and select output
- [x] Renamed `cla` to `cma` for consistency with `cm` naming
- [x] Fixed alias recursion bug (removed nested function/alias)
- [x] Updated all documentation (README, usage-guide, install.ps1, CHANGELOG)
- [x] Verified: all 27 tests passing

## ✅ v1.5.0 - Self-Update Command (2026-03-30)

**Completed tasks:**
- [x] Modify `install.sh` to persist `installDir` to `config.json`
- [x] Validate `installDir?` field in schema (already present in v1.4.0)
- [x] Implement `handleSelfUpdate()` in `src/cli.ts` (already present)
- [x] Write unit tests (`tests/self-update.test.ts` - 5 passing tests)
- [x] Update documentation (README, usage-guide, CHANGELOG)

## 🚧 v1.6.0 - Post v1.5.0 Enhancements (Next)

**Implementation Notes:**
- Added jq-based installDir persistence to `install.sh` after config directory creation (line 83-95)
- Includes jq availability check; warns if jq missing
- Idempotent: only adds field if not present
- Schema already supports `installDir?` (validated in v1.4.0)
- See commit: `install: persist installDir to config for self-update`

---

## Current Status
- ✅ **v1.5.0** - Latest release (2026-03-30): Self-update, PowerShell support, cma naming
- ⚠️ GitHub Actions: Billing lock prevents CI runners (workflow exists). Manual releases used.
- 🎯 Next: v1.6.0 enhancements (see backlog)

## Completed (v1.1.0)
- [x] **Model caching** (cache.ts, cm1-cm10, cache commands)
- [x] **Interactive selection** (`cm select`)
- [x] Build system fix: switched to tsc

---

### Priority 1: Quality of Life
- [x] **Model caching**: Reduce OpenRouter API calls with local cache
- [x] **Config validation**: JSON schema for config.json (v1.4.0)
- [x] **Retry logic**: Exponential backoff for transient failures (v1.3.0)
- [x] **Better help**: Add practical examples to `cm --help` (v1.5.1)
- [x] **Installation verification**: Check Bun dependency before install (already in install.sh/install.ps1)

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

