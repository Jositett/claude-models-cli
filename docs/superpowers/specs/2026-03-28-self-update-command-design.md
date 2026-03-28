# Design: `cm self-update` Command

**Date:** 2026-03-28
**Status:** Draft
**Author:** Claude Code

---

## Executive Summary

Add a `cm self-update` command that updates the Claude Models CLI itself for users who installed via the git-based install scripts. The command will perform a `git pull` on the cloned repository, reinstall dependencies, and rebuild the project.

---

## Problem Statement

**Current Situation:**
- Users install the CLI via `install.sh` or `install.ps1` which clone the repository to `~/.claude-models-cli-repo`
- To update to a new version, users must manually:
  1. `cd ~/.claude-models-cli-repo`
  2. `git pull origin master`
  3. `bun install`
  4. `bun run build`
- This is undocumented and error-prone
- Many users don't know how to update, leading to outdated versions

**User Need:**
- Simple, one-command way to update the CLI to the latest version
- Clear feedback about what's happening
- Safe rollback if update fails

---

## Proposed Solution

### **Command: `cm self-update`**

**Behavior:**
1. Detect installation type (git-based vs other)
2. For git-based installs:
   - Check current version (`cm version`)
   - Run `git pull origin master` in install directory
   - Run `bun install`
   - Run `bun run build`
   - Report new version
3. For non-git installs: Show helpful message with reinstall instructions
4. Handle errors gracefully with clear messages

---

## Architecture

### **Components:**

1. **`src/commands/self-update.ts`** - New handler function
   - Implements main update logic
   - Called from `cli.ts` when user runs `cm self-update`

2. **Update in `src/cli.ts`**:
   - Add `'self-update'` to command switch/case (around line 157)
   - Call `handleSelfUpdate(cm, args)`

3. **Helper in `src/utils/update.ts`** (optional):
   - `detectInstallType()`: Returns `'git' | 'standalone' | 'unknown'`
   - `runGitUpdate(installDir)`: Performs git pull + build
   - `getCurrentVersion()`: Read from package.json

### **Data Flow:**

```
User runs: cm self-update
    ↓
cli.ts: case 'self-update'
    ↓
handleSelfUpdate()
    ↓
detectInstallType() → reads install dir from config or default
    ↓
If git-based:
  gitPull(installDir)
  bunInstall(installDir)
  bunBuild(installDir)
  getNewVersion()
  Report success
Else:
  Print manual update instructions
```

---

## Implementation Details

### **Installation Detection**

**Strategy:** Check if `~/.claude-models-cli-repo` exists and contains a `.git` folder.

```typescript
function detectInstallType(): 'git' | 'standalone' | 'unknown' {
  const installDir = getInstallDir(); // from config or default

  if (fs.existsSync(path.join(installDir, '.git'))) {
    return 'git';
  }

  // Could also check if wrapper script exists
  if (fs.existsSync(path.join(installDir, 'dist', 'cli.js'))) {
    return 'standalone';
  }

  return 'unknown';
}
```

**Install directory resolution:**
- Default: `~/.claude-models-cli-repo`
- Could also check if `CLAUDE_MODELS_INSTALL_DIR` env var is set
- Could read from a file in config dir that stores install path during first install

### **Git Update Process**

```typescript
async function runGitUpdate(installDir: string): Promise<{success: boolean, error?: string, oldVersion: string, newVersion: string}> {
  // 1. Get old version
  const oldPkg = JSON.parse(await fs.readFile(path.join(installDir, 'package.json'), 'utf-8'));
  const oldVersion = oldPkg.version;

  // 2. Git pull
  await exec('git pull origin master', { cwd: installDir });

  // 3. Check if version changed
  const newPkg = JSON.parse(await fs.readFile(path.join(installDir, 'package.json'), 'utf-8'));
  const newVersion = newPkg.version;

  if (newVersion === oldVersion) {
    return { success: true, oldVersion, newVersion, error: 'Already on latest version' };
  }

  // 4. bun install
  await exec('bun install', { cwd: installDir });

  // 5. bun run build
  await exec('bun run build', { cwd: installDir });

  return { success: true, oldVersion, newVersion };
}
```

**Note:** The wrappers (`~/bin/cm`, `~/bin/cm.ps1`) don't need updating because they just call the built `dist/cli.js`. The rebuild updates that file.

### **Error Handling**

| Failure Point | Detection | User Message |
|---------------|-----------|--------------|
| Not a git install | `detectInstallType()` returns non-git | "You don't have a git-based installation. Please re-run the install script from the README." |
| `git pull` fails | exec throws | "Failed to pull latest code. Check network connection and git status. Error: {error}" |
| `bun install` fails | exec throws | "Dependency installation failed. Try running 'bun install' manually in the install directory." |
| `bun run build` fails | exec throws | "Build failed. Check TypeScript errors and try again manually." |
| No version change | Compare versions | "You're already on the latest version (vX.Y.Z)." |

**Exit codes:**
- `0` = success (even if already up-to-date)
- `1` = failure (any error)

---

## Testing Strategy

### **Unit Tests** (tests/self-update.test.ts)

1. **test_git_update_success** - Mock git/bun commands, verify sequence called correctly
2. **test_already_latest** - When versions match, reports "already up-to-date" but succeeds
3. **test_not_git_install** - Returns appropriate message
4. **test_git_pull_fails** - Handles git error gracefully
5. **test_build_fails** - Handles build error, doesn't proceed
6. **test_version_extraction** - Correctly reads package.json version

### **Integration Test**

- Create temp git repo with old version, run `cm self-update`, verify new version installed

---

## Success Criteria

✅ **Functional:**
- `cm self-update` command exists and runs
- Git-based installs: updates successfully
- Non-git installs: shows helpful message
- Clear before/after version reporting
- Errors handled with actionable messages

✅ **Quality:**
- All tests pass (unit + integration)
- No breaking changes to existing commands
- Code follows existing patterns (similar to `handleProbe`, etc.)
- TypeScript type safety maintained
- Console output consistent with CLI style

✅ **Documentation:**
- `cm --help` shows self-update command
- README.md mentions self-update capability
- CHANGELOG.md updated for this feature

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| User has local modifications in repo | Git pull fails | Medium | Show clear error: "You have uncommitted changes. Commit or stash them first, or reinstall fresh." |
| Network unavailable | Git pull fails | High | Error message includes network troubleshooting. Old version remains functional. |
| Build fails (TypeScript errors) | Update incomplete | Low | Test build in CI before release. Keep old version if build fails. |
| Wrapper scripts point to old location | Command fails | Low | During install, wrappers use absolute path to `dist/cli.js`. Rebuild updates file in place. |
| User manually modified code | Build fails | Low | Show helpful error with file locations. Encourage user to fork instead of direct edits. |

---

## Future Enhancements (Post-v1.5.0)

- **Release download fallback**: If git pull fails, offer to download release tarball
- **Prerelease support**: `--prerelease` flag to get latest main branch
- **Version rollback**: `cm self-update --rollback <version>`
- **Auto-update check**: Notify user when new version available (opt-in)
- **Multiple install methods**: Detect and support npm, brew, scoop installs

---

## Implementation Sequence

1. Add utility functions: `detectInstallType()`, `getInstallDir()`, `runGitUpdate()`
2. Create `handleSelfUpdate()` command handler in cli.ts
3. Register command in switch statement
4. Add command to help text and docs
5. Write unit tests with mocks
6. Manual testing (real update)
7. Update README and CHANGELOG
8. Release v1.5.0

---

## Questions/Clarifications

- **Should self-update preserve config?** Yes, config is in `~/.claude-models-cli`, separate from code.
- **What if user wants to stay on old version?** They can skip updates; no auto-updates forced.
- **Should we check for new version before pulling?** No, just pull. Git handles efficiently. Could add `--check` flag later to just check.

---

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Git-based only for v1.5.0 | Covers 80%+ of users who used install scripts. Others can reinstall. |
| No interactive confirmation | Self-update is explicit command, no need to prompt. Fail fast if issues. |
| Keep install dir in one place | Use `~/.claude-models-cli-repo` default, allow `CLAUDE_MODELS_INSTALL_DIR` override |
| Rebuild after pull | Required because dist/cli.js may be outdated |
| Exit 0 even if already latest | "Success" means "no newer version available or installed" |

---

**Approved by:** [User signature]
**Implementation:** Use `superpowers:writing-plans` after design approval
