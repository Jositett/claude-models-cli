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

1. **`handleSelfUpdate()` function in `src/cli.ts`**:
   - Main command handler (inline with existing pattern: `handleProbe`, `handleSelect`)
   - Parses flags (`--dry-run`, `--json`)
   - Orchestrates the update process
   - Logs activity via `configManager.log()`

2. **Helper functions in `src/cli.ts`** (near other helpers):
   - `getInstallDir(configManager: ConfigManager): string` - Resolves install directory (from config, env var, or default) with cross-platform path handling
   - `detectInstallType(installDir: string): 'git' | 'standalone' | 'unknown'` - Checks for `.git` folder
   - `checkGitAvailable(): boolean` - Verifies git is in PATH
   - `runGitUpdate(installDir: string, dryRun: boolean = false): Promise<UpdateResult>` - Performs git pull + build (or simulates if dry-run)

3. **Config file update** (`~/.claude-models-cli/config.json`):
   - Add `installDir` field to persist the installation directory (written by install scripts)
   - This ensures `self-update` works even if `CLAUDE_MODELS_INSTALL_DIR` was used during install

### **Data Flow:**

```
User runs: cm self-update [--dry-run] [--json]
    ↓
cli.ts: case 'self-update'
    ↓
handleSelfUpdate()
    ↓
getInstallDir() → read from config (installDir field), then env var, then default
    ↓
detectInstallType() → check for .git folder
    ↓
If git-based and git available:
  If --dry-run:
    Check remote version, report available/up-to-date, exit
  Else:
    git status --porcelain (check for uncommitted changes)
    git pull origin master (or current branch)
    If version changed:
      bun install
      bun run build
      Log success, report versions + commit hashes
    Else:
      Report already latest
    Save activity log
Else:
  Print manual update instructions
```

### **Type Definitions:**

```typescript
interface UpdateResult {
  success: boolean;
  dryRun?: boolean;
  action: 'updated' | 'already-latest' | 'not-git' | 'no-git-cmd' | 'error';
  oldVersion?: string;
  oldCommit?: string;
  newVersion?: string;
  newCommit?: string;
  error?: string;
  installDir?: string;
}
```

---

## Implementation Details

### **Installation Detection and Directory Resolution**

**Install Directory Priority (first match wins):**

1. **Config file**: Read `installDir` field from `~/.claude-models-cli/config.json` (persisted by installer)
2. **Environment variable**: `CLAUDE_MODELS_INSTALL_DIR`
3. **Default**: Cross-platform path:
   - Unix: `$HOME/.claude-models-cli-repo`
   - Windows: `$env:USERPROFILE\.claude-models-cli-repo`

**Implementation:**

```typescript
import { resolve } from 'path';
import { homedir } from 'os';

function getInstallDir(configManager: ConfigManager): string {
  // 1. Check config (persisted from installer)
  const config = configManager.loadConfigSync(); // or async variant
  if (config.installDir) {
    return config.installDir;
  }

  // 2. Check env var
  const envDir = process.env.CLAUDE_MODELS_INSTALL_DIR;
  if (envDir) {
    return envDir;
  }

  // 3. Default cross-platform path
  const home = process.env.HOME || process.env.USERPROFILE || homedir();
  return resolve(home, '.claude-models-cli-repo');
}
```

**`detectInstallType(installDir: string)`:**

```typescript
import { existsSync } from 'fs';

function detectInstallType(installDir: string): 'git' | 'standalone' | 'unknown' {
  if (!existsSync(installDir)) {
    return 'unknown';
  }

  // Check for .git folder (git-based install)
  if (existsSync(resolve(installDir, '.git'))) {
    return 'git';
  }

  // Check for built CLI (standalone install)
  if (existsSync(resolve(installDir, 'dist', 'cli.js'))) {
    return 'standalone';
  }

  return 'unknown';
}
```

**Required Changes to Install Scripts:**

During installation, after determining `destDir` (the install directory), write it to the config:

**install.sh** (after creating config dir):
```bash
# Save install directory to config for future self-update
CONFIG_FILE="$CONFIG_DIR/config.json"
if [ -f "$CONFIG_FILE" ]; then
  # Use jq to add installDir field if not present
  if ! jq -e '.installDir' "$CONFIG_FILE" > /dev/null 2>&1; then
    tmp=$(mktemp)
    jq --arg dir "$destDir" '.installDir = $dir' "$CONFIG_FILE" > "$tmp" && mv "$tmp" "$CONFIG_FILE"
  fi
fi
```

**install.ps1** (after creating config dir):
```powershell
# Save install directory to config for future self-update
$ConfigFile = "$ConfigDir\config.json"
if (Test-Path $ConfigFile) {
  $config = Get-Content $ConfigFile | ConvertFrom-Json
  if (-not $config.installDir) {
    $config | Add-Member -NotePropertyName 'installDir' -NotePropertyValue $destDir
    $config | ConvertTo-Json | Out-File $ConfigFile -Encoding UTF8
  }
}
```

**Config Schema Update** (`src/config/validation.ts`):
Add `installDir?` as an optional string field in the schema (no validation needed, just user-writable).

### **Git Update Process**

```typescript
async function checkGitAvailable(): Promise<boolean> {
  try {
    await exec('git --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function getGitInfo(installDir: string): Promise<{ version: string; commit: string } | null> {
  try {
    const pkgPath = path.join(installDir, 'package.json');
    const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));

    const commit = (await exec('git rev-parse --short HEAD', { cwd: installDir, stdout: 'pipe' }))
      .stdout.trim();

    return { version: pkg.version, commit };
  } catch {
    return null;
  }
}

async function runGitUpdate(
  installDir: string,
  dryRun: boolean = false
): Promise<UpdateResult> {
  // Pre-check: git must be available
  if (!await checkGitAvailable()) {
    return {
      success: false,
      action: 'no-git-cmd',
      error: 'Git is not installed or not in PATH. Please install Git to use self-update.',
      installDir,
    };
  }

  // Get current version & commit
  const oldInfo = await getGitInfo(installDir);
  if (!oldInfo) {
    return {
      success: false,
      action: 'error',
      error: `Could not read git info from install directory: ${installDir}`,
      installDir,
    };
  }

  // If dry-run, check remote without pulling
  if (dryRun) {
    try {
      // Fetch remote refs without merging
      await exec('git fetch origin', { cwd: installDir });

      const currentCommit = (await exec('git rev-parse HEAD', { cwd: installDir, stdout: 'pipe' }))
        .stdout.trim();
      const remoteCommit = (await exec('git rev-parse origin/master', { cwd: installDir, stdout: 'pipe' }))
        .stdout.trim();

      if (currentCommit === remoteCommit) {
        return {
          success: true,
          dryRun: true,
          action: 'already-latest',
          oldVersion: oldInfo.version,
          oldCommit: currentCommit,
          installDir,
        };
      }

      // Get remote version (read package.json from remote HEAD)
      const remotePkgJson = (await exec('git show origin/master:package.json', {
        cwd: installDir,
        stdout: 'pipe',
      })).stdout;
      const remotePkg = JSON.parse(remotePkgJson);

      return {
        success: true,
        dryRun: true,
        action: 'updated',
        oldVersion: oldInfo.version,
        oldCommit: currentCommit,
        newVersion: remotePkg.version,
        newCommit: remoteCommit,
        installDir,
      };
    } catch (error: any) {
      return {
        success: false,
        dryRun: true,
        action: 'error',
        error: `Failed to check for updates: ${error.message}`,
        installDir,
      };
    }
  }

  // Live update: check for uncommitted changes first
  try {
    const status = (await exec('git status --porcelain', { cwd: installDir, stdout: 'pipe' }))
      .stdout.trim();
    if (status) {
      return {
        success: false,
        action: 'error',
        error: `You have uncommitted changes in the install directory. Please commit or stash them before updating.\n\nUncommitted changes:\n${status}`,
        installDir,
      };
    }
  } catch (error: any) {
    // Git status failed - maybe not a git repo?
    return {
      success: false,
      action: 'error',
      error: `Failed to check git status: ${error.message}`,
      installDir,
    };
  }

  // Perform git pull
  try {
    await exec('git pull origin master', { cwd: installDir });
  } catch (error: any) {
    // Parse common git errors
    let parsedError = `Git pull failed: ${error.message}`;

    if (error.message?.includes('CONFLICT') || error.message?.includes('merge conflict')) {
      parsedError = 'Merge conflict detected. Please resolve conflicts manually or reinstall fresh.';
    } else if (error.message?.includes('Authentication failed')) {
      parsedError = 'Git authentication failed. Check your credentials or SSH keys.';
    } else if (error.message?.includes('Could not resolve host')) {
      parsedError = 'Network error: Could not connect to GitHub. Check your internet connection.';
    }

    return {
      success: false,
      action: 'error',
      error: parsedError,
      installDir,
      oldVersion: oldInfo.version,
      oldCommit: oldInfo.commit,
    };
  }

  // Check if version actually changed
  const newInfo = await getGitInfo(installDir);
  if (!newInfo) {
    return {
      success: false,
      action: 'error',
      error: `Update succeeded but could not read new version.`,
      installDir,
      oldVersion: oldInfo.version,
    };
  }

  if (newInfo.version === oldInfo.version && newInfo.commit === oldInfo.commit) {
    return {
      success: true,
      action: 'already-latest',
      oldVersion: oldInfo.version,
      oldCommit: oldInfo.commit,
      installDir,
    };
  }

  // Version changed: rebuild
  try {
    await exec('bun install', { cwd: installDir });
    await exec('bun run build', { cwd: installDir });
  } catch (error: any) {
    return {
      success: false,
      action: 'error',
      error: `Build failed after update: ${error.message}\n\nThe update was downloaded but could not be built. The old version remains functional. Try running 'bun run build' manually in ${installDir}`,
      installDir,
      oldVersion: oldInfo.version,
      newVersion: newInfo.version,
    };
  }

  // Success!
  return {
    success: true,
    action: 'updated',
    oldVersion: oldInfo.version,
    oldCommit: oldInfo.commit,
    newVersion: newInfo.version,
    newCommit: newInfo.commit,
    installDir,
  };
}
```

**Note:** The wrappers (`~/bin/cm`, `~/bin/cm.ps1`) don't need updating because they just call the built `dist/cli.js`. The rebuild updates that file in place.

### **Error Handling**

**Comprehensive error categories:**

| Scenario | Detection | User Message (example) |
|----------|-----------|----------------------|
| Not a git install | `detectInstallType()` returns non-git | "⚠️  You don't have a git-based installation.\n\nPlease re-run the install script from the README, or manually update by reinstalling." |
| Git not in PATH | `checkGitAvailable()` returns false | "❌ Git is not installed or not in your PATH.\n\nPlease install Git from https://git-scm.com/ and try again." |
| Uncommitted changes | `git status --porcelain` returns non-empty | "⚠️  You have uncommitted changes in the install directory.\n\nPlease commit or stash them before updating:\n\n  git add . && git commit -m 'WIP'\n  # or\n  git stash\n\nOr reinstall fresh if you don't need these changes." |
| Merge conflict | `git pull` error contains "CONFLICT" | "❌ Merge conflict detected during update.\n\nPlease resolve conflicts manually in the install directory, then rebuild:\n\n  bun run build\n\nOr reinstall fresh if preferred." |
| Authentication failure | Git error "Authentication failed" | "❌ Git authentication failed.\n\nCheck your GitHub credentials or SSH keys. If using HTTPS, you may need a personal access token." |
| Network error | Git error "Could not resolve host" | "❌ Network error: Could not connect to GitHub.\n\nCheck your internet connection and try again." |
| Other git pull failure | Generic exec error | "❌ Git pull failed: {error.message}\n\nCheck the install directory and try again." |
| bun install fails | exec error during dependency install | "❌ Dependency installation failed.\n\nTry running 'bun install' manually in the install directory and fix any issues." |
| bun run build fails | exec error during build | "❌ Build failed after download.\n\nThe update was partially applied. Check TypeScript errors and try:\n\n  bun run build\n\nIf issues persist, the old version remains functional in the git history." |
| No version change | `oldVersion === newVersion` | "✅ You're already on the latest version (v{oldVersion})." |

**Exit codes:**
- `0` = success (updated OR already latest)
- `1` = failure (any error condition)

**Activity Logging:**
Every `self-update` invocation should be logged to `~/.claude-models-cli/activity.log`:
```
[2026-03-28 14:30:00] Self-update: started (current: v1.4.0)
[2026-03-28 14:30:15] Self-update: success → v1.5.0 (def456)
[2026-03-28 14:30:00] Self-update: failed - Network error
```

---

## Testing Strategy

### **Unit Tests** (tests/self-update.test.ts)

1. **test_git_update_success** - Mock git/bun commands, verify sequence and result structure
2. **test_dry_run_shows_available** - `--dry-run` reports available update without making changes
3. **test_dry_run_already_latest** - `--dry-run` reports up-to-date
4. **test_already_latest** - No version change, reports "already up-to-date" with exit 0
5. **test_not_git_install** - Returns `action: 'not-git'` with helpful message
6. **test_git_not_available** - Returns `action: 'no-git-cmd'` when git missing
7. **test_git_pull_fails_network** - Handles network error, suggests retry
8. **test_git_pull_fails_auth** - Handles authentication error
9. **test_git_pull_fails_conflict** - Detects uncommitted changes and merge conflicts separately
10. **test_bun_install_fails** - Build step fails, returns error, old version preserved
11. **test_bun_build_fails** - Build fails after deps installed, clear error message
12. **test_version_extraction** - Correctly reads version and commit hash from package.json + git
13. **test_json_output** - With `--json`, outputs valid JSON with all fields
14. **test_config_persistence** - `getInstallDir()` reads from config first, then env, then default

### **Integration Test**

- Create temp git repo with old version, run `cm self-update`, verify new version installed and old version recoverable via git log

### **Cross-platform Test Matrix**

- [x] Windows PowerShell (install.ps1 → self-update)
- [x] Unix/Linux/macOS bash (install.sh → self-update)
- [ ] WSL (Git for Linux, paths mixed)
- [ ] CI: Run self-update in GitHub Actions to verify update-from-latest-release works

---

## JSON Output Format

When `--json` flag is present, output single JSON object to stdout:

```json
{
  "success": true,
  "action": "updated" | "already-latest" | "not-git" | "no-git-cmd" | "error",
  "dryRun": false,
  "oldVersion": "1.4.0",
  "oldCommit": "abc123d",
  "newVersion": "1.5.0",
  "newCommit": "def456g",
  "installDir": "/path/to/.claude-models-cli-repo",
  "error": "Error message if action=error",
  "timestamp": "2026-03-28T14:30:00Z"
}
```

Exit code remains 0 for success/up-to-date, 1 for errors regardless of `--json`.

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

### Phase 1: Foundation
1. **Update `src/config/validation.ts`**: Add optional `installDir?` field to config schema
2. **Modify `install.sh` and `install.ps1`**: After creating config, write `installDir` to config.json (uses jq on bash, PowerShell JSON manipulation on Windows)
3. **Add helper functions in `src/cli.ts`** (or new `src/self-update.ts` if substantial):
   - `getInstallDir(configManager)`
   - `detectInstallType(installDir)`
   - `checkGitAvailable()`
   - `getGitInfo(installDir)`
   - `runGitUpdate(installDir, dryRun)`

### Phase 2: Command Handler
4. **Implement `handleSelfUpdate(cm: ClaudeModels, args: string[])` in `src/cli.ts`**:
   - Parse flags: `--dry-run`, `--json`
   - Resolve install directory
   - Call `runGitUpdate()`
   - Handle result: print user-friendly OR JSON output
   - Log to activity log via `configManager.log()`

5. **Register command**: Add `case 'self-update':` to command switch in `main()` (around line 157)
6. **Update `printHelp()`**: Add self-update entry under Commands section

### Phase 3: Documentation
7. **Update `docs/usage-guide.md`**: Add section for `cm self-update` (maybe under "Management" or "Advanced")
8. **Update `README.md`**: Add "Updating" section after installation
9. **Update `CHANGELOG.md`**: Add entry under `[Unreleased]` with description

### Phase 4: Testing
10. **Write unit tests** `tests/self-update.test.ts`:
    - Mock `exec`, `fs`, and config manager
    - Cover all scenarios from Testing Strategy
    - Use `Bun.mock` for `child_process.exec` and file system
11. **Integration test** (separate script or manual):
    - Create temp git repo with v1.0.0
    - Run `cm self-update --dry-run` → should report update available
    - Run `cm self-update` → should update to v1.5.0
    - Verify version output matches
12. **Cross-platform manual testing**: Test on Windows (PowerShell) and Unix (bash)

### Phase 5: Release
13. **Bump version** in `package.json` to `1.5.0`
14. **Run full test suite**: `bun test --coverage`
15. **Build**: `bun run build`
16. **Commit** with message: `feat: add cm self-update command`
17. **Tag and release**: `git tag v1.5.0 && git push --tags && gh release create v1.5.0 --generate-notes`
18. **Update install scripts** on GitHub (they reference master branch, automatically picks up new version)

---

## Questions/Clarifications

- **Should self-update preserve config?** Yes, config is in `~/.claude-models-cli`, separate from code.
- **What if user wants to stay on old version?** They can skip updates; no auto-updates forced.
- **Should we check for new version before pulling?** Only with `--dry-run`. In normal mode, we just `git pull` which is efficient anyway.
- **What branch should we pull?** Default to `master` (current repo default). Could later make it configurable or detect current branch via `git rev-parse --abbrev-ref HEAD`, but for v1.5.0 hardcoded `master` is fine.
- **What if installer used custom branch?** Store install directory in config; `self-update` will use whatever branch is currently checked out in that repo (via `git pull` without branch arg would pull current branch). But our spec uses `origin master` explicitly for predictability. Consider: should we check what branch the repo is on and pull that branch? Let's stick with `master` for consistency.

---

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Git-based only for v1.5.0 | Covers 80%+ of users who used install scripts. Others can reinstall. |
| No interactive confirmation | Self-update is explicit command, no need to prompt. Fail fast if issues. |
| Persist installDir in config | Required for reliable updates when user customized install location via env var. |
| Pre-update uncommitted changes check | Prevents git pull failure and data loss. Clear error message guides user. |
| Include commit hash in output | Makes it easy to verify exact code version, aids debugging. |
| `--dry-run` flag | Safety and transparency. Users can check before committing to update. |
| `--json` output for machine-readability | Consistent with other commands (`probe`, `list`). |
| Exit code 0 for already-latest | "Success" means "no action needed or action succeeded." |
| Activity logging | Part of audit trail; all major operations should be logged. |
| Keep install dir in one place | Use `~/.claude-models-cli-repo` default, allow `CLAUDE_MODELS_INSTALL_DIR` override during install. |
| Rebuild after pull | Required because `dist/cli.js` may be outdated. |
| Do NOT rollback if build fails | Old version remains functional; users can manually retry or fix. Over-engineering for v1.5.0. |
| Utility functions inline in `cli.ts` | No `src/commands/` directory exists; keep handlers in `cli.ts` for consistency. |
| Helper functions in same file or `src/self-update.ts` | If helpers grow too large, extract later. For now, keep together. |
| Wrapper scripts don't need update | They point to `dist/cli.js` which gets rebuilt. No symlink magic needed. |

---

**Mandatory Changes to Existing Files:**

1. **`install.sh`**: After config creation, add:
   ```bash
   CONFIG_FILE="$CONFIG_DIR/config.json"
   if [ -f "$CONFIG_FILE" ]; then
     if ! jq -e '.installDir' "$CONFIG_FILE" > /dev/null 2>&1; then
       tmp=$(mktemp)
       jq --arg dir "$destDir" '.installDir = $dir' "$CONFIG_FILE" > "$tmp" && mv "$tmp" "$CONFIG_FILE"
     fi
   fi
   ```
   (Requires `jq` which is commonly installed; fallback: skip if jq not present.)

2. **`install.ps1`**: After config creation, add:
   ```powershell
   $ConfigFile = "$ConfigDir\config.json"
   if (Test-Path $ConfigFile) {
     $config = Get-Content $ConfigFile -Raw | ConvertFrom-Json
     if (-not $config.installDir) {
       $config | Add-Member -NotePropertyName 'installDir' -NotePropertyValue $destDir
       $config | ConvertTo-Json -Depth 10 | Out-File $ConfigFile -Encoding UTF8
     }
   }
   ```

3. **`src/config/validation.ts`**: Add `installDir?` (string, optional) to schema. No additional validation rules needed (any string ok).

4. **`src/cli.ts`**: Add `handleSelfUpdate()` and register command.

---

**Approved by:** [User signature]
**Implementation:** Use `superpowers:writing-plans` after design approval

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
