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

### 8. Build System: tsc vs Bun Bundler
- Bun's bundler (`bun build`) is designed for web bundles, not CLI tools
- Node core modules (like `fs/promises`) don't bundle correctly with Bun
- **Solution:** Use TypeScript compiler (`tsc`) for transpilation without bundling
- This preserves Node built-in module resolution at runtime
- Ensure all local imports use explicit `.js` extensions for `NodeNext` resolution
- Set `"strict": false` if Bun-specific APIs cause false positive type errors
- `noEmitOnError: false` ensures JS output even with type warnings

### 9. Documentation Sync for Releases
Before tagging a release:
- ✅ Update CHANGELOG.md with new version section
- ✅ Update README.md with new features and commands
- ✅ Bump version in `package.json` and `src/version.ts`
- ✅ Update `tasks/todo.md` to mark features complete
- ✅ Verify all tests pass and build succeeds
- ✅ Test `cm --help` and new commands with `--help`

After tag push:
- Create GitHub release with detailed notes
- Include upgrade instructions and changelog highlights

### 10. Model Probing Implementation (v1.2.0)
- **ProbeManager**: Separate class in `src/probing.ts` to manage probe lifecycle
- **Caching**: Reuse CacheManager to store probe results with 24h TTL (`probe_results` key)
- **Provider extension**: Add `testModel(modelId)` method to OpenRouterProvider
- **CLI integration**: Add `probe` and `scan` commands; use existing command patterns
- **Concurrency**: Started with sequential (1 at a time) to avoid rate limits; can add semaphore later
- **Safety**: Use `max_tokens=1` to keep costs minimal (fractions of cent)
- **User warning**: Display credits notice before probing starts
- **Output**: Progressive results with ✓/✗, time, context; summary with top 3 recommendations

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

## Lessons from v1.4.1 - Cross-Platform & Naming (2026-03-30)

### 1. Shell Alias Generation Pitfalls
- **Recursion trap**: Defining `alias cm="claude-models"` and `function claude-models() { cm ... }` causes infinite recursion.
  - **Solution**: Either use `command cm` to bypass alias/function, or drop the wrapper entirely and rely on users calling `cm` directly from PATH.
- **Platform-specific syntax**: Bash `export VAR=value` vs PowerShell `$env:VAR = "value"`.
  - Need separate generation for each shell; can't mix.
- **PowerShell functions**: Use `function global:Name` for global scope; `param()` for args; `$args` for variadic; `$LASTEXITCODE` for exit code check.
- **Avoiding `cm` collision**: When defining `cm` as a function, ensure it doesn't shadow itself. In PowerShell, we made `cm` a function that calls the wrapper script directly.

### 2. Documentation Bulk Replace Dangers
- **Accidental path corruption**: Using `replace_all: true` on the short string `"cla"` replaced occurrences within `.claude-models-cli`, creating broken paths like `.cmaude-models-cli`.
  - **Rule**: Never use `replace_all` on substrings shorter than 4 characters unless you're 100% sure they're standalone.
  - **Better**: Use precise, multi-line context matches; or manually verify each replacement; or use regex with word boundaries.
  - **Always review changes with `git diff`** before committing.
- **Line ending issues**: Windows CRLF vs Unix LF can affect matching. Use tools that show exact characters.

### 3. Naming Consistency
- Autocomplete-friendly naming: `cmX` is great; `cla` broke the pattern. Renamed to `cma` (auto) to maintain prefix consistency.
- Command naming should follow a clear prefix to avoid namespace pollution and improve discoverability.

### 4. Platform Detection
- Use `process.platform === 'win32'` to detect Windows.
- For file paths, Node handles `/` on Windows, so prefer forward slashes in generated scripts to avoid escaping issues.
- In PowerShell generation, use Windows paths with `\` but also consider quoting; using mixed slashes still works.

### 5. Release Process & Versioning
- **Version bump before tagging**: The commit that receives the version tag must have the updated version number in `package.json` and `src/version.ts`. Either include the version bump in the same commit as the release changes, or create a separate version bump commit and tag that commit.
- **Manual releases without CI**: When GitHub Actions billing is disabled:
  - Build the project locally (`bun run build`)
  - Create an annotated tag: `git tag -a vX.Y.Z -m "Release vX.Y.Z: notes"`
  - Push tag: `git push origin vX.Y.Z`
  - Use `gh release create vX.Y.Z --title "vX.Y.Z" --notes-file <file>` to create GitHub release with assets
  - Manually upload built assets if no CI to auto-generate them
- **Tag correction**: If you tag the wrong commit, delete and recreate the tag (local and remote) — be mindful of collaborators who may have pulled the tag.
- **Release notes**: Keep a curated Unreleased section in CHANGELOG and copy it to the release. This ensures consistency between the tag and documentation.

## Future Considerations
- Add Zod for config validation
- Implement exponential backoff for API retries
- Add model performance benchmarking
- Create VS Code extension for GUI
- Consider Tauri for desktop app
- **Add multi-command test coverage**: Write integration tests that load generated alias files and verify they work correctly.
- **Consider shell detection heuristics**: For `.profile` vs `.bashrc` vs `.zshrc`, rely on `$SHELL` env var but fall back gracefully.