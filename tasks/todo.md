# Claude Models CLI - Development Tasks

## Current Status
- ✅ Bun-based cross-platform CLI built
- ✅ OpenRouter provider working
- ✅ Tests passing (8 tests)
- ✅ GitHub repository live: https://github.com/Jositett/claude-models-cli
- ✅ Documentation complete

## Active Tasks

### Priority 1: Essential Improvements
- [ ] **CLAUDE.md**: Update project instructions to reflect Bun/TypeScript architecture
- [ ] **README badges**: Add build status, license, Bun version badges
- [ ] **Add .bunrc** or bunfig.toml for Bun configuration
- [ ] **Create example config** with comments for users
- [ ] **Add error handling** for API failures (rate limiting, network issues)
- [ ] **Implement model caching** to reduce API calls

### Priority 2: Missing Features
- [ ] **Ollama provider**: Make it actually work (test local Ollama integration)
- [ ] **HuggingFace provider**: Implement the stub
- [ ] **Model filtering**: Allow filtering by context size, provider, etc.
- [ ] **Model search**: grep/search through available models
- [ ] **JSON output**: Add `--json` flag for machine-readable output
- [ ] **Version command**: Show version and environment info

### Priority 3: Developer Experience
- [ ] **Pre-commit hooks**: Run tests and type check before commits
- [ ] **GitHub Actions**: Add CI badge to README
- [ ] **Contributing guide**: More detailed development workflow
- [ ] **CHANGELOG.md**: Track version changes
- [ ] **Documentation**: Create docs/usage-guide.md with examples

### Priority 4: Advanced Features (Nice to have)
- [ ] **Benchmark mode**: Test model response times
- [ ] **Configuration validation**: Schema validation for config.json
- [ ] **Migration system**: Handle config migrations between versions
- [ ] **Telemetry opt-in**: Anonymous usage stats (GDPR compliant)

## Completed Tasks
- [x] Convert PowerShell to Bun/TypeScript
- [x] Change shortcuts from cl1-cl10 to cm1-cm10
- [x] Write comprehensive tests
- [x] Create install.sh for Unix/Linux/macOS
- [x] Create install.ps1 for Windows
- [x] Setup GitHub Actions CI/CD
- [x] Push to GitHub (Jositett/claude-models-cli)

## Backlog / Future
- [ ] VS Code extension
- [ ] Homebrew formula
- [ ] Windows scoop installer
- [ ] Docker image
- [ ] Multiple provider failover (smart rotation)
- [ ] Model performance history
