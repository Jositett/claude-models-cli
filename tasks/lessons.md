# Lessons Learned - Claude Models CLI

## Architecture Lessons

### 1. Bun over Node.js
- Bun is fast (builds in seconds vs minutes for Node)
- Bun's `fs/promises` not all methods available (no `mkdir` on Bun.file)
- Use Node's `fs/promises` directly - works perfectly in Bun
- Bun test runner is simple and fast

### 2. TypeScript Best Practices
- Always use `import` type syntax for cleaner imports
- Avoid mixing Bun APIs with Node APIs inconsistently
- Use `fs/promises` for file operations (cross-platform compatible)
- Strict mode catches issues early

### 3. Cross-Platform Path Handling
- Windows uses `\`, Unix uses `/`
- Use `process.platform` to detect OS
- Better: Use `/` consistently - Node/Bun handle it on Windows
- `process.env.HOME` works on Unix, `USERPROFILE` on Windows
- Unified approach: `const home = process.env.HOME || process.env.USERPROFILE`

### 4. Testing with Bun
- Bun test doesn't support `beforeAll`/`afterAll` as named exports? Actually it does, but need to import them
- Use isolated test directories with `TEST_CONFIG_DIR` env var
- Clean up in `afterAll` to avoid leftover files
- Direct `await access()` is simpler than `expect(...).resolves.not.toThrow()`

### 5. Git on Windows
- Git converts LF to CRLF on checkout by default
- Add `* text=auto` to .gitignore to prevent warnings
- Or accept the warnings - they're harmless
-LF line endings preferred in source files

### 6. GitHub Actions
- Use `oven-sh/setup-bun` action for Bun projects
- Test on multiple OS matrices (ubuntu, windows, macos)
- Build before publishing releases
- Use `softprops/action-gh-release` for releases (not deprecated `actions/create-release`)
- **Important:** GitHub Actions require billing to be enabled on account. New accounts may have a lock until payment method added. Manual releases via `gh release create` still work.

### 7. Manual Release Process
When CI is unavailable:
```bash
# 1. Ensure all tests pass
bun test

# 2. Build the project
bun run build

# 3. Create annotated tag
git tag -a v1.0.0 -m "Release v1.0.0: Description"

# 4. Push the tag
git push origin v1.0.0

# 5. Create GitHub release
gh release create v1.0.0 --target master --title "v1.0.0" --notes "Full release notes..."
```

## User Experience Lessons

### 1. CLI Naming
- `cm` = Claude Models (clear, short, memorable)
- `cm1-cm10` for quick shortcuts
- `cla` for auto-fallback launcher
- Avoided `cl` prefix which could conflict with actual `claude` command

### 2. Configuration Location
- Follow XDG spec on Unix: `~/.config/claude-models-cli`
- But for simplicity: `~/.claude-models-cli/`
- Windows: `%USERPROFILE%\.claude-models-cli\`
- Single location across all platforms

### 3. Error Messages
- Colorize output for better UX
- Provide actionable next steps
- Don't expose raw errors to end users (log them instead)
- Use emoji sparingly for status indicators

## Deployment Lessons

### 1. Install Scripts
- Provide both `install.sh` (Unix) and `install.ps1` (Windows)
- Check for Bun dependency first
- Clone repo to a central location, build, symlink binary
- Add to PATH automatically if possible
- Show clear next steps after installation

### 2. Releases
- Build before creating release
- Include `dist/`, `package.json`, `README.md`, `LICENSE`
- Tag with semantic version: v1.0.0
- Use GitHub Actions to automate on push to main

## What Went Well
- ✅ TypeScript compilation smooth with Bun
- ✅ Provider abstraction works well
- ✅ Modular architecture easy to test
- ✅ Cross-platform file system operations with fs/promises

## What Could Be Better
- ⚠️ Ollama provider not fully tested (no local Ollama instance)
- ⚠️ No retry logic for API rate limits
- ⚠️ Config validation missing
- ⚠️ No schema migration for config version upgrades
- ⚠️ Documentation could have more examples

## Future Considerations
- Add Zod for config validation
- Implement exponential backoff for API retries
- Add model performance benchmarking
- Create VS Code extension for GUI
- Consider Tauri for desktop app