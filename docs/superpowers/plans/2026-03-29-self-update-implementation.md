# `cm self-update` Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `cm self-update` command that updates the CLI itself via git pull + rebuild for users with git-based installation.

**Architecture:** The command handler lives in `src/cli.ts` (inline with existing pattern). Helper functions parse args, detect install dir, run git operations, and handle errors. Install scripts are modified to persist install directory to config for reliable updates.

**Tech Stack:** TypeScript, Bun, Node fs/exec APIs, Git CLI

---

## File Structure

**Files to modify:**
- `src/cli.ts` - Add `handleSelfUpdate()`, register command, update `printHelp()`
- `src/config/validation.ts` - Add optional `installDir?` field to schema
- `install.sh` - Persist `destDir` to config.json after install
- `install.ps1` - Persist `destDir` to config.json after install
- `docs/usage-guide.md` - Add `cm self-update` documentation
- `README.md` - Add "Updating" section
- `CHANGELOG.md` - Add v1.5.0 entry

**Files to create:**
- `tests/self-update.test.ts` - Comprehensive unit tests with mocks

---

## Pre-Implementation Setup

- [ ] **Verify current state**: All tests passing, build works, no uncommitted changes except those from this plan
- [ ] **Read the spec**: `docs/superpowers/specs/2026-03-28-self-update-command-design.md`

---

## Phase 1: Config Schema & Install Scripts (Foundation)

### Task 1: Add `installDir` to Config Schema

**Files:**
- Modify: `src/config/validation.ts`

**Steps:**

- [ ] Open `src/config/validation.ts` and locate the `ConfigSchema` definition (probably using `z.object({...})`)
- [ ] Add an optional field: `installDir?: z.string().optional()`
- [ ] Run build to ensure no type errors: `bun run build`
- [ ] Run tests to ensure no regressions: `bun test`
- [ ] Commit: `git add src/config/validation.ts && git commit -m "feat(self-update): add installDir field to config schema"`

**Expected:** Schema accepts `installDir` without validation; no test failures.

---

### Task 2: Modify `install.sh` to Persist Install Directory

**Files:**
- Modify: `install.sh` (around line 75-80, after config dir creation)

**Steps:**

- [ ] Read `install.sh` and find where `CONFIG_DIR` is created (around line 81: `mkdir -p "$CONFIG_DIR"`)
- [ ] After that, add code to write `destDir` to `config.json`:

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

- [ ] Test the installer manually (dry-run only, don't actually install):
  - Create temp dir, simulate install with `INSTALL_DIR=/tmp/test-install bash install.sh`
  - Check that `~/.claude-models-cli/config.json` contains `"installDir": "/tmp/test-install"`
- [ ] Commit: `git add install.sh && git commit -m "install: persist installDir to config for self-update"`

**Note:** The jq check prevents overwriting if field already exists (upgrades).

---

### Task 3: Modify `install.ps1` to Persist Install Directory

**Files:**
- Modify: `install.ps1` (around line 73-75, after `New-Item` for config dir)

**Steps:**

- [ ] Read `install.ps1` and find the section that creates the config directory (line 74: `New-Item -ItemType Directory -Path $ConfigDir -Force | Out-Null`)
- [ ] After that line, add PowerShell code to update `config.json`:

```powershell
# Save install directory to config for future self-update
$ConfigFile = "$ConfigDir\config.json"
if (Test-Path $ConfigFile) {
  $config = Get-Content $ConfigFile -Raw | ConvertFrom-Json
  if (-not $config.installDir) {
    $config | Add-Member -NotePropertyName 'installDir' -NotePropertyValue $destDir
    $config | ConvertTo-Json -Depth 10 | Out-File $ConfigFile -Encoding UTF8
  }
}
```

- [ ] Test manually on Windows (or simulate):
  - Run install.ps1
  - Verify `%USERPROFILE%\.claude-models-cli\config.json` contains `"installDir": "C:\\Users\\...\\.claude-models-cli-repo"`
- [ ] Commit: `git add install.ps1 && git commit -m "install(ps1): persist installDir to config for self-update"`

---

## Phase 2: Core Self-Update Command

### Task 4: Add Helper Functions to `src/cli.ts`

**Files:**
- Modify: `src/cli.ts` (add at top or near other helpers)

**Steps:**

- [ ] Open `src/cli.ts` and locate the import section (top)
- [ ] Add imports: `import { resolve } from 'path';` (if not already present)
- [ ] Add the `UpdateResult` interface near other type definitions:

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

- [ ] Add helper function `getInstallDir(configManager: ConfigManager): string`:

```typescript
function getInstallDir(configManager: any): string {
  // 1. Check config (persisted from installer)
  try {
    const config = configManager.loadConfigSync?.() || configManager.loadConfig();
    if (config?.installDir) {
      return config.installDir;
    }
  } catch {
    // Fall through
  }

  // 2. Check env var
  const envDir = process.env.CLAUDE_MODELS_INSTALL_DIR;
  if (envDir) {
    return envDir;
  }

  // 3. Default cross-platform path
  const home = process.env.HOME || process.env.USERPROFILE || require('os').homedir();
  return resolve(home, '.claude-models-cli-repo');
}
```

- [ ] Add `detectInstallType(installDir: string): 'git' | 'standalone' | 'unknown'`:

```typescript
import { existsSync } from 'fs';

function detectInstallType(installDir: string): 'git' | 'standalone' | 'unknown' {
  if (!existsSync(installDir)) {
    return 'unknown';
  }
  if (existsSync(resolve(installDir, '.git'))) {
    return 'git';
  }
  if (existsSync(resolve(installDir, 'dist', 'cli.js'))) {
    return 'standalone';
  }
  return 'unknown';
}
```

- [ ] Add `checkGitAvailable(): Promise<boolean>`:

```typescript
import { exec } from 'child_process';

async function checkGitAvailable(): Promise<boolean> {
  try {
    await new Promise((resolve, reject) => {
      exec('git --version', (err) => err ? reject(err) : resolve(null));
    });
    return true;
  } catch {
    return false;
  }
}
```

- [ ] Add `getGitInfo(installDir: string): Promise<{ version: string; commit: string } | null>`:

```typescript
async function getGitInfo(installDir: string): Promise<{ version: string; commit: string } | null> {
  try {
    const pkgPath = resolve(installDir, 'package.json');
    const pkgContent = await Bun.file(pkgPath).text();
    const pkg = JSON.parse(pkgContent);

    const commit = await new Promise<string>((resolve, reject) => {
      exec('git rev-parse --short HEAD', { cwd: installDir }, (err, stdout) => {
        err ? reject(err) : resolve(stdout.trim());
      });
    });

    return { version: pkg.version, commit };
  } catch {
    return null;
  }
}
```

- [ ] Don't commit yet! Wait until all functions are in place.

**Expected:** TypeScript compiles without errors. Run: `bun run types` should pass.

---

### Task 5: Implement `runGitUpdate()` Core Logic

**Files:**
- Continue in `src/cli.ts`

**Steps:**

- [ ] Add `runGitUpdate(installDir: string, dryRun: boolean = false): Promise<UpdateResult>`:

```typescript
async function runGitUpdate(
  installDir: string,
  dryRun: boolean = false
): Promise<UpdateResult> {
  // Check git availability
  if (!await checkGitAvailable()) {
    return {
      success: false,
      action: 'no-git-cmd',
      error: 'Git is not installed or not in your PATH. Please install Git from https://git-scm.com/ and try again.',
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

  // Dry-run mode: check remote without pulling
  if (dryRun) {
    try {
      await new Promise((resolve, reject) => {
        exec('git fetch origin', { cwd: installDir }, (err) => err ? reject(err) : resolve(null));
      });

      const currentCommit = await new Promise<string>((resolve, reject) => {
        exec('git rev-parse HEAD', { cwd: installDir, stdout: 'pipe' }, (err, stdout) => {
          err ? reject(err) : resolve(stdout.trim());
        });
      });

      const remoteCommit = await new Promise<string>((resolve, reject) => {
        exec('git rev-parse origin/master', { cwd: installDir, stdout: 'pipe' }, (err, stdout) => {
          err ? reject(err) : resolve(stdout.trim());
        });
      });

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

      // Get remote version
      const remotePkgJson = await new Promise<string>((resolve, reject) => {
        exec('git show origin/master:package.json', { cwd: installDir, stdout: 'pipe' }, (err, stdout) => {
          err ? reject(err) : resolve(stdout);
        });
      });
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

  // Live update: check for uncommitted changes
  try {
    const status = await new Promise<string>((resolve, reject) => {
      exec('git status --porcelain', { cwd: installDir, stdout: 'pipe' }, (err, stdout) => {
        err ? reject(err) : resolve(stdout.trim());
      });
    });
    if (status) {
      return {
        success: false,
        action: 'error',
        error: `You have uncommitted changes in the install directory. Please commit or stash them before updating.\n\nUncommitted changes:\n${status}`,
        installDir,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      action: 'error',
      error: `Failed to check git status: ${error.message}`,
      installDir,
    };
  }

  // Perform git pull
  try {
    await new Promise((resolve, reject) => {
      exec('git pull origin master', { cwd: installDir }, (err, stdout, stderr) => {
        if (err) {
          // Parse specific git errors
          const combined = stdout + stderr;
          let parsedError = `Git pull failed: ${err.message}`;

          if (combined.includes('CONFLICT') || combined.includes('merge conflict')) {
            parsedError = 'Merge conflict detected. Please resolve conflicts manually or reinstall fresh.';
          } else if (combined.includes('Authentication failed')) {
            parsedError = 'Git authentication failed. Check your credentials or SSH keys.';
          } else if (combined.includes('Could not resolve host') || combined.includes('Failed to connect')) {
            parsedError = 'Network error: Could not connect to GitHub. Check your internet connection.';
          }

          const wrappedError = new Error(parsedError);
          wrappedError.original = err;
          wrappedError.gitOutput = combined;
          reject(wrappedError);
        } else {
          resolve(null);
        }
      });
    });
  } catch (error: any) {
    return {
      success: false,
      action: 'error',
      error: error.message,
      installDir,
      oldVersion: oldInfo.version,
      oldCommit: oldInfo.commit,
    };
  }

  // Check if version changed
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

  // Rebuild
  try {
    await new Promise((resolve, reject) => {
      exec('bun install', { cwd: installDir }, (err) => err ? reject(err) : resolve(null));
    });
    await new Promise((resolve, reject) => {
      exec('bun run build', { cwd: installDir }, (err) => err ? reject(err) : resolve(null));
    });
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

- [ ] Test compilation: `bun run build` should succeed.
- [ ] Don't commit yet.

**Expected:** No syntax errors. TypeScript should compile (may have some `any` warnings but that's okay).

---

### Task 6: Implement `handleSelfUpdate()` Command Handler

**Files:**
- Continue in `src/cli.ts`

**Steps:**

- [ ] Add the command handler function:

```typescript
async function handleSelfUpdate(cm: ClaudeModels, args: string[]): Promise<void> {
  const configManager = (cm as any).configManager;
  const jsonFlag = args.includes('--json') || args.includes('-j');
  const dryRunFlag = args.includes('--dry-run');

  try {
    const installDir = getInstallDir(configManager);
    const result = await runGitUpdate(installDir, dryRunFlag);

    // Log to activity
    if (result.success) {
      if (result.action === 'updated') {
        await configManager.log(`Self-update: ${result.oldVersion} → ${result.newVersion} (${result.newCommit})`);
      } else if (result.action === 'already-latest') {
        await configManager.log(`Self-update: already on latest (${result.oldVersion})`);
      } else {
        await configManager.log(`Self-update: ${result.action}`);
      }
    }

    // Output
    if (jsonFlag) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      // User-friendly messages
      if (result.success) {
        if (result.action === 'updated') {
          console.log(`✅ Updated from v${result.oldVersion} (${result.oldCommit}) to v${result.newVersion} (${result.newCommit})`);
        } else if (result.action === 'already-latest') {
          console.log(`✅ You're already on the latest version (v${result.oldVersion})`);
        } else if (result.action === 'not-git') {
          console.log(`⚠️  You don't have a git-based installation.`);
          console.log(`Please re-run the install script from the README to update.`);
        }
      } else {
        console.error(`❌ Update failed:`);
        console.error(result.error);
        process.exit(1);
      }
    }
  } catch (error: any) {
    if (jsonFlag) {
      console.error(JSON.stringify({ success: false, error: error.message }));
    } else {
      console.error('❌ Unexpected error:', error.message);
    }
    process.exit(1);
  }
}
```

- [ ] Save and build: `bun run build`
- [ ] Commit: `git add src/cli.ts && git commit -m "feat: add handleSelfUpdate command handler"`

---

### Task 7: Register Command and Update Help

**Files:**
- `src/cli.ts` - Find command switch and `printHelp()`

**Steps:**

- [ ] Register command: Find the command switch (around line 157: `case 'probe': case 'scan':`) and add:

```typescript
case 'self-update':
  await handleSelfUpdate(cm, args);
  break;
```

- [ ] Update `printHelp()`: Find the Commands section (around line 210-230) and add:

```
  self-update         Update the CLI to latest version
                      Options: --dry-run (check only), --json
```

- [ ] Build: `bun run build`
- [ ] Commit: `git add src/cli.ts && git commit -m "cli: register self-update command and update help text"`

---

## Phase 3: Testing

### Task 8: Create Unit Tests with Mocks

**Files:**
- Create: `tests/self-update.test.ts`

**Steps:**

- [ ] Create new file `tests/self-update.test.ts` with the following structure:

```typescript
import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'bun:test';
import { rm, mkdir, writeFile } from 'fs/promises';
import { resolve } from 'path';
import { homedir } from 'os';

// Use test config dir
const TEST_CONFIG_DIR = './test-selfupdate-config';
const TEST_INSTALL_DIR = './test-selfupdate-install';

beforeAll(async () => {
  process.env.TEST_CONFIG_DIR = TEST_CONFIG_DIR;
  await mkdir(TEST_CONFIG_DIR, { recursive: true });
  await mkdir(TEST_INSTALL_DIR, { recursive: true });
});

afterAll(async () => {
  await rm(TEST_CONFIG_DIR, { recursive: true, force: true });
  await rm(TEST_INSTALL_DIR, { recursive: true, force: true });
  delete process.env.TEST_CONFIG_DIR;
});

describe('Self-Update Command', () => {
  beforeEach(async () => {
    // Clean config before each test
    const configFile = resolve(TEST_CONFIG_DIR, 'config.json');
    await writeFile(configFile, JSON.stringify({ version: '1.0.0' }));
  });

  it('should detect git-based install when .git exists', async () => {
    // Create fake .git folder
    await mkdir(resolve(TEST_INSTALL_DIR, '.git'));

    // Need to import cli module and expose helpers
    // For now, we'll test indirectly by mocking
    const { detectInstallType } = await import('../src/cli.js');

    // Since we can't directly import private functions, we'll test via the full command
    // But let's assume they're exported for testing or we'll structure differently
    // This test will be refined in actual implementation
    expect(true).toBe(true);
  });

  // More tests to be filled in...
});
```

**Refinement:** In actual implementation, we may need to export helper functions for testing OR test via the full command with mocked `exec`. I'll determine the best approach during coding.

- [ ] Add comprehensive test cases (copy from spec):
  - `test_git_update_success`
  - `test_dry_run_shows_available`
  - `test_dry_run_already_latest`
  - `test_already_latest`
  - `test_not_git_install`
  - `test_git_not_available`
  - `test_git_pull_fails_network`
  - `test_git_pull_fails_auth`
  - `test_git_pull_fails_conflict` (including uncommitted changes)
  - `test_bun_install_fails`
  - `test_bun_build_fails`
  - `test_version_extraction`
  - `test_json_output`
  - `test_config_persistence`

- [ ] For mocking `exec`, use Bun's built-in mocking:

```typescript
Bun.mock('child_process', () => ({
  exec: (cmd: string, opts?: any, cb?: any) => {
    // Mock implementation based on cmd
    if (cmd === 'git --version') return cb?.(null, 'git version 2.0.0');
    if (cmd === 'git rev-parse --short HEAD') return cb?.(null, 'abc123');
    // ... etc
  },
}));
```

- [ ] Write tests in TDD order: write failing test, make it pass, commit each logical group.
- [ ] Run all tests: `bun test tests/self-update.test.ts`
- [ ] Commit: `git add tests/self-update.test.ts && git commit -m "test(self-update): add comprehensive test suite"`

**Note:** I may need to adjust architecture to make functions testable (e.g., export them or inject dependencies). The spec says to keep them in `cli.ts`; I'll make them module-scoped and export for testing if needed.

---

### Task 9: Manual Integration Test

**Files:**
- New temporary test script (not committed)

**Steps:**

- [ ] Create a temporary git repo to test real update flow:

```bash
# Create temp test install
cd /tmp
rm -rf test-cm-update-old
git clone https://github.com/Jositett/claude-models-cli.git test-cm-update-old
cd test-cm-update-old
git checkout v1.4.0  # or any old commit
bun install
bun run build

# Set TEST_CONFIG_DIR to point to a test config
export TEST_CONFIG_DIR=/tmp/test-cm-config
mkdir -p $TEST_CONFIG_DIR
echo '{"version":"1.0.0","installDir":"'$(pwd)'"}' > $TEST_CONFIG_DIR/config.json

# Run dry-run to check update detection
bun ./dist/cli.js self-update --dry-run

# Expected: shows update available to newer version

# Run actual update
bun ./dist/cli.js self-update

# Verify version bumped
bun ./dist/cli.js version
```

- [ ] Document findings, fix any issues that arise
- [ ] No commit needed (this is validation)

---

## Phase 4: Documentation

### Task 10: Update `docs/usage-guide.md`

**Files:**
- Modify: `docs/usage-guide.md`

**Steps:**

- [ ] Add new section after "Configuration" or in "Advanced Topics":

```markdown
### Updating the CLI

Keep the CLI itself up-to-date with:

```bash
cm self-update
```

This pulls the latest code from the repository, installs dependencies, and rebuilds.

**Options:**
- `--dry-run` - Check for updates without applying them
- `--json` - Output machine-readable status

**Notes:**
- Only works for git-based installations (the default from install script).
- For other installation methods, re-run the install script.
- Your configuration in `~/.claude-models-cli/` is preserved.
```

- [ ] Also mention `cm self-update` in the "Troubleshooting" section if relevant (e.g., "If cm command not found, try `cm self-update`").
- [ ] Commit: `git add docs/usage-guide.md && git commit -m "docs: add cm self-update usage guide"`

---

### Task 11: Update `README.md`

**Files:**
- Modify: `README.md`

**Steps:**

- [ ] Add "Updating" section after "Installation" (around line 55):

```markdown
### Updating

```bash
# Update the CLI itself (if installed via install script)
cm self-update

# Check for updates without installing:
cm self-update --dry-run
```
```

- [ ] Optionally add a "Self-update" badge or note in the features list: "🔄 Self-update via `cm self-update`"
- [ ] Commit: `git add README.md && git commit -m "docs: add self-update section to README"`

---

### Task 12: Update `CHANGELOG.md`

**Files:**
- Modify: `CHANGELOG.md`

**Steps:**

- [ ] Under `## [Unreleased]` → `### Added`, add:

```markdown
- **Self-update command**: `cm self-update` updates the CLI itself via git pull + rebuild
  - `--dry-run` flag to check for updates without applying
  - `--json` output for automation
  - Persists install directory in config for reliable updates
  - Smart error handling (uncommitted changes, merge conflicts, network issues)
```

- [ ] Commit: `git add CHANGELOG.md && git commit -m "chore: add self-update to changelog"`

---

## Phase 5: Pre-Release

### Task 13: Bump Version to 1.5.0

**Files:**
- Modify: `package.json`

**Steps:**

- [ ] Update version: `"version": "1.5.0"`
- [ ] Commit: `git add package.json && git commit -m "chore: bump version to 1.5.0"`

---

### Task 14: Run Full Test Suite and Type Check

**Commands:**

- [ ] Type check: `bun run types`
  - Expected: No errors
- [ ] Full test suite: `bun test --coverage`
  - Expected: All tests pass (including new self-update tests)
- [ ] Build: `bun run build`
  - Expected: Successful build with no errors

If any failures, fix them before proceeding. Commit fixes as needed.

---

### Task 15: Final Commit and Tag Release

**Commands:**

- [ ] Push all changes to remote:

```bash
git push origin master
```

- [ ] Create git tag: `git tag v1.5.0`
- [ ] Push tags: `git push --tags`
- [ ] Create GitHub release (if gh CLI installed):

```bash
gh release create v1.5.0 --generate-notes --latest
```

This will auto-generate release notes from commit messages.

- [ ] Manual check: Visit https://github.com/Jositett/claude-models-cli/releases and verify v1.5.0 release exists with correct files.

---

## Rollback Plan

If something goes wrong after release:

- **Bug in self-update**: Users can still manually update by re-running install script.
- **Broken build**: Roll back to previous commit `git revert <commit>` and release v1.5.1.
- **Data loss**: Config and models are separate; safe.

---

## Verification Checklist

Before marking complete, verify:

- [ ] `cm self-update --help` shows help
- [ ] `cm self-update --dry-run` reports status without changes
- [ ] `cm self-update` actually updates (test in isolated env)
- [ ] `cm self-update` after updated shows "already on latest"
- [ ] `--json` flag outputs valid JSON
- [ ] Uncommitted changes error shows helpful message
- [ ] Network failure shows network error
- [ ] Git missing shows install git message
- [ ] Non-git install shows reinstall message
- [ ] All unit tests pass (27 tests total)
- [ ] TypeScript type check passes
- [ ] Documentation updated in usage-guide.md, README.md, CHANGELOG.md
- [ ] Version bumped to 1.5.0
- [ ] GitHub release created

---

## Estimated Timeline

| Task | Duration |
|------|----------|
| Phase 1 (Config + Installers) | 30-45 min |
| Phase 2 (Command Implementation) | 45-60 min |
| Phase 3 (Testing) | 45-60 min |
| Phase 4 (Documentation) | 15-20 min |
| Phase 5 (Pre-Release) | 10-15 min |
| **Total** | **2.5-3 hours** |

---

## Notes for Implementer

- **Follow existing patterns**: Look at `handleProbe()` and `handleSelect()` in `cli.ts` for structure and style.
- **Error messages**: Be helpful, not terse. Guide users to fix issues.
- **Types**: Use `any` sparingly; prefer proper types from project.
- **Commits**: Small, logical commits with clear messages. Use `feat:`, `fix:`, `docs:`, `test:` prefixes.
- **Don't over-engineer**: YAGNI - no rollback, no package manager support, no branch detection beyond `master`.
- **Cross-platform**: Use `path.resolve`, `process.env.HOME || process.env.USERPROFILE`, avoid Unix-only paths.

---

**Plan approved by:** User (2026-03-29)
**Spec document:** `docs/superpowers/specs/2026-03-28-self-update-command-design.md`
