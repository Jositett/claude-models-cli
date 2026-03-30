#!/usr/bin/env bun

import { ClaudeModels } from './index.js';
import { PKG_VERSION, PKG_NAME, REPO_URL } from './version.js';
import { statSync, readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { exec } from 'child_process';
import { ProbeManager } from './probing.js';

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

async function main() {
  const args = process.argv.slice(2);
  const cm = new ClaudeModels();

  await cm.initialize();

  const command = args[0];
  const jsonFlag = args.includes('--json') || args.includes('-j');

  switch (command) {
    case 'update':
    case '--update':
    case '-u':
      await cm.updateModels(true);
      break;

    case 'list':
    case '--list':
    case '-l':
      try {
        const models = await cm.getModels();

        if (jsonFlag) {
          console.log(JSON.stringify(models, null, 2));
        } else {
          printModels(models);
        }
      } catch (error: any) {
        if (jsonFlag) {
          console.error(JSON.stringify({ error: error.message }));
          process.exit(1);
        } else {
          console.error('❌ Error:', error.message);
          console.log('Run "cm update" to fetch models first.');
        }
      }
      break;

    case 'providers':
    case '--providers':
    case '-p':
      if (jsonFlag) {
        console.log(JSON.stringify(['openrouter', 'ollama', 'huggingface']));
      } else {
        console.log('Available providers:');
        console.log('  - openrouter (default, free tier) ✅');
        console.log('  - ollama (local models) 🚧');
        console.log('  - huggingface (coming soon) 🚧');
      }
      break;

    case 'config':
      // Handle config subcommands: config edit, config validate
      const configSubCmd = args[1] || 'edit';
      const configManager = cm['configManager'];

      switch (configSubCmd) {
        case 'edit':
        case '--edit':
          const configPath = configManager.getConfigDir() + '/config.json';
          if (process.platform === 'win32') {
            import('child_process').then(({ exec }) => exec(`notepad "${configPath}"`));
          } else {
            const editor = process.env.EDITOR || 'nano';
            import('child_process').then(({ spawn }) => spawn(editor, [configPath], { stdio: 'inherit' }));
          }
          break;
        case 'validate':
        case '--validate':
          try {
            const config = await configManager.loadConfig();
            console.log('✅ Configuration is valid');
            console.log(`   Version: ${config.version}`);
            console.log(`   Default provider: ${config.defaultProvider}`);
            console.log(`   Max models: ${config.maxModels}`);
            console.log(`   Auto-update: ${config.autoUpdate}`);
          } catch (error: any) {
            console.error('❌ Configuration validation failed:');
            console.error(error.message);
            process.exit(1);
          }
          break;
        default:
          console.log('Config commands:');
          console.log('  cm config edit   - Edit configuration file (default)');
          console.log('  cm config validate - Validate current configuration');
          break;
      }
      break;

    case 'logs':
    case '--logs':
    case '-L':
      const logFile = cm['configManager'].getLogFile();
      try {
        await Bun.file(logFile).text().then((content) => {
          const lines = content.split('\n').filter(line => line.trim());
          console.log(lines.slice(-20).join('\n'));
        });
      } catch {
        console.log('No logs yet');
      }
      break;

    case 'export':
    case '--export':
    case '-e':
      await cm.exportAliases();
      break;

    case 'version':
    case '--version':
    case '-v':
      console.log(`${PKG_NAME} v${PKG_VERSION}`);
      console.log(`Repository: ${REPO_URL}`);
      break;

    case 'info':
    case '--info':
    case '-i':
      printEnvInfo(cm);
      break;

    case 'cache':
      // Handle cache subcommands: cm cache clear, cm cache stats
      const cacheSubCmd = args[1];
      const cacheManager = cm['configManager'].getCacheManager();

      switch (cacheSubCmd) {
        case 'clear':
        case '--clear':
          await cacheManager.clear();
          console.log('✅ Cache cleared');
          break;
        case 'stats':
        case '--stats':
          const stats = await cacheManager.getStats();
          console.log('\n📊 Cache Statistics:\n');
          console.log(`  Entries: ${stats.entries}`);
          console.log(`  Size: ${(stats.size / 1024).toFixed(2)} KB`);
          break;
        default:
          console.log('Cache commands:');
          console.log('  cm cache clear  - Clear the model cache');
          console.log('  cm cache stats  - Show cache statistics');
          break;
      }
      break;

    case 'probe':
    case 'scan':
      await handleProbe(cm, args);
      break;

    case 'select':
      // Interactive model selection
      await handleSelect(cm, args);
      break;

    case 'self-update':
      await handleSelfUpdate(cm, args);
      break;

    case 'help':
    case '--help':
    case '-h':
    default:
      printHelp();
      break;
  }
}

function printModels(models: any[]) {
  console.log('\n🔝 Top Free Programming Models:\n');
  console.log('================================\n');

  for (const model of models) {
    const rank = `cm${model.rank}`.padEnd(4);
    const id = model.id.padEnd(40);
    const context = model.contextLength ? `${Math.round(model.contextLength / 1000)}K`.padEnd(5) : 'N/A'.padEnd(5);
    const source = model.source !== 'OpenRouter' ? `[${model.source}]` : '';
    console.log(`${rank} ${cyan(id)} ${gray(context)} ${magenta(source)} - ${white(model.description || 'Free tier model')}`);
  }

  console.log('\n💡 Pro tip: Use "cma" to auto-try models until one works');
}

function printEnvInfo(cm: ClaudeModels) {
  const config = cm['configManager'];
  console.log('\n📊 Environment Information:\n');
  console.log(`Config dir: ${config.getConfigDir()}`);
  console.log(`Models file: ${config.getModelsFile()}`);
  console.log(`Platform: ${process.platform}`);
  console.log(`Bun version: ${Bun.version}`);
  console.log(`Node compatible: ${process.version}`);
  try {
    const stats = statSync(config.getModelsFile());
    console.log(`Models last updated: ${stats.mtime}`);
    console.log(`Number of models: ${JSON.parse(readFileSync(config.getModelsFile(), 'utf-8')).length}`);
  } catch {
    console.log('Models: Not fetched yet');
  }
  console.log('');
}

function printHelp() {
  const isWin = process.platform === 'win32';
  const apiKeyExample = isWin ? '$env:OPENROUTER_API_KEY = "sk-or-v1-..."' : 'export OPENROUTER_API_KEY="sk-or-v1-..."';
  let aliasFile, sourceCmd;
  if (isWin) {
    aliasFile = 'aliases.ps1';
    sourceCmd = `. $env:USERPROFILE\\.claude-models-cli\\${aliasFile}`;
  } else {
    aliasFile = 'aliases.sh';
    sourceCmd = `source ~/.claude-models-cli/${aliasFile}`;
  }

  console.log(`
🚀 Claude Models CLI v${PKG_VERSION} - Cross-platform model manager

Usage: cm <command> [options]

Commands:
  update, -u          Fetch and rank latest free models
  list, -l            Show current top 10 models
  select              Interactive model selection
                      Options: --only-working (show only probed models)
  providers, -p       List configured providers
  config, -c          Edit configuration file (default)
                      Subcommands: edit (default), validate
  logs, -L            View recent activity logs
  export, -e          Generate shell aliases (cm1-cm10, cma)
  version, -v         Show version
  info, -i            Show environment information
  cache               Manage model cache
                      Subcommands: clear, stats
  probe, scan         Test models to see which ones actually work
                      Options: --limit N (default 10), --force, --json
  self-update         Update the CLI to latest version
                      Options: --dry-run (check only), --json
  help, -h            Show this help message

Options:
  --json, -j          Output in JSON format (for list command)
  --help, -h          Show this help message

Quick Start:
  1. Set your API key:
     ${apiKeyExample}

  2. Fetch models:
     cm update

  3. Generate aliases:
     cm export
     ${sourceCmd}

  4. Launch models:
     cm1    # Launch #1 ranked model
     cm2    # Launch #2 model
     cma    # Auto-try models until one works

Examples:
  # Interactive model selection with probe status
  cm probe --limit 10
  cm select --only-working

  # Cache management
  cm cache stats    # Show cache usage
  cm cache clear    # Clear cached models

  # Get machine-readable output for scripting
  cm list --json | jq -r '.[0].id'

  # Update the CLI (dry-run first)
  cm self-update --dry-run
  cm self-update

  # View recent activity logs
  cm logs

  # Validate configuration
  cm config validate

  # Edit config file
  ${isWin ? 'cm config edit' : '${EDITOR:-nano} ~/.claude-models-cli/config.json'}

Providers:
  OpenRouter  ✅ Active - 10+ free models
  Ollama      🚧 Planned - Local models
  HuggingFace 🚧 Planned - Free inference

GitHub: ${REPO_URL}
License: MIT
`);
}

async function handleProbe(cm: ClaudeModels, args: string[]) {
  try {
    const models = await cm.getModels();

    if (models.length === 0) {
      console.log('No models available. Run "cm update" first.');
      return;
    }

    // Parse options
    const jsonFlag = args.includes('--json') || args.includes('-j');
    const forceFlag = args.includes('--force');
    const limitArg = args.find(arg => arg.startsWith('--limit='));
    const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 10;
    const concurrencyArg = args.find(arg => arg.startsWith('--concurrency='));
    const concurrency = concurrencyArg ? parseInt(concurrencyArg.split('=')[1], 10) : 3; // Default to 3 concurrent probes

    const actualCount = Math.min(models.length, limit);

    // Cost warning
    if (!jsonFlag) {
      console.log('\n⚠️  Probing models may consume OpenRouter API credits.');
      console.log(`   Will test up to ${actualCount} model(s) with max_tokens=1.`);
      console.log('   Press Ctrl+C to cancel.\n');

      // Simple confirmation (non-blocking, just a notice)
      // In a future version we could add a --yes flag to skip this
    }

    try {
      const config = cm['configManager'];
      const cacheManager = config.getCacheManager();
      const probeManager = new ProbeManager(config.getConfigDir(), cacheManager);

      const results = await probeManager.probeAll(models, {
        limit,
        concurrency,
        force: forceFlag,
      });

      if (jsonFlag) {
        console.log(JSON.stringify({ results, summary: { tested: results.length, ok: results.filter(r => r.status === 'ok').length, failed: results.filter(r => r.status === 'fail').length } }, null, 2));
      }
    } catch (error: any) {
      if (jsonFlag) {
        console.error(JSON.stringify({ error: error.message }));
        process.exit(1);
      } else {
        console.error('❌ Probing failed:', error.message);
      }
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

async function handleSelect(cm: ClaudeModels, args: string[]) {
  try {
    const models = await cm.getModels();

    if (models.length === 0) {
      console.log('No models available. Run "cm update" first.');
      return;
    }

    // Parse options
    const onlyWorking = args.includes('--only-working') || args.includes('-w');

    // Load probe results in background (non-blocking)
    let probeResults: Map<string, any> = new Map();
    if (onlyWorking) {
      try {
        const config = cm['configManager'];
        const cacheManager = config.getCacheManager();
        const ProbeManagerClass = (await import('./probing.js')).ProbeManager;
        const probeManager = new ProbeManagerClass(config.getConfigDir(), cacheManager);
        probeResults = await probeManager.loadResults();
      } catch (error) {
        console.debug('Could not load probe results:', error);
      }
    }

    // Filter models if --only-working flag is set
    let displayModels = models;
    if (onlyWorking) {
      displayModels = models.filter(m => {
        const probe = probeResults.get(m.id);
        return probe && probe.status === 'ok';
      });
      if (displayModels.length === 0) {
        console.log('\n⚠️  No models have successful probe results.');
        console.log('Run "cm probe" to test models first, or remove --only-working flag.\n');
        return;
      }
    }

    console.log('\n🔝 Select a Model:\n');
    console.log('================================\n');

    // Display models with probe status
    for (const model of displayModels) {
      const rank = `[${model.rank}]`.padEnd(4);
      const id = model.id.padEnd(40);
      const context = model.contextLength ? `${Math.round(model.contextLength / 1000)}K`.padEnd(5) : 'N/A'.padEnd(5);

      // Show probe status indicator if available
      const probeResult = probeResults.get(model.id);
      let statusIndicator = '';
      if (probeResult) {
        if (probeResult.status === 'ok') {
          statusIndicator = '\x1b[32m✓\x1b[0m '; // green ✓
        } else {
          statusIndicator = '\x1b[31m✗\x1b[0m '; // red ✗
        }
      } else {
        statusIndicator = '\x1b[90m?\x1b[0m '; // gray ?
      }

      console.log(`${rank} ${statusIndicator}${cyan(id)} ${gray(context)} - ${white(model.description || 'Free tier model')}`);
    }

    console.log('\n  0) Cancel');
    console.log('\n  Legend: \x1b[32m✓ working\x1b[0m  \x1b[31m✗ failing\x1b[0m  \x1b[90m? not tested\x1b[0m');
    if (onlyWorking) {
      console.log('  (showing only working models)');
    }

    // Prompt for selection
    console.log('\nEnter model number (1-' + models.length + '):');

    // Simple readline implementation
    const { stdin, stdout } = process;
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    const prompt = new Promise<string>((resolve) => {
      stdin.once('data', (data) => {
        stdin.setRawMode?.(false);
        stdin.pause();
        resolve(data.toString().trim());
      });
    });

    const choice = await prompt;
    const num = parseInt(choice);

    if (isNaN(num) || num < 1 || num > models.length) {
      console.log('Cancelled or invalid selection.');
      return;
    }

    const selected = models.find(m => m.rank === num);
    if (selected) {
      console.log(`\n✅ Selected: ${selected.id}`);
      console.log(`   Score: ${selected.score}`);
      console.log(`   Provider: ${selected.provider}`);

      // Set as environment variable for current session
      console.log(`\n💡 To use this model, run:`);
      if (process.platform === 'win32') {
        console.log(`   $env:ANTHROPIC_MODEL = "${selected.id}"`);
        console.log(`   claude`);
        console.log(`\n📝 Or create a shortcut:`);
        console.log(`   function global:cm-selected { $env:ANTHROPIC_MODEL = "${selected.id}"; claude @args }`);
      } else {
        console.log(`   export ANTHROPIC_MODEL="${selected.id}"`);
        console.log(`   claude`);
        console.log(`\n📝 Or create a shortcut:`);
        console.log(`   function cm-selected() { export ANTHROPIC_MODEL="${selected.id}"; claude "$@"; }`);
      }
    }
  } catch (error: any) {
    console.error('❌ Selection failed:', error.message);
  }
}

async function handleSelfUpdate(cm: ClaudeModels, args: string[]): Promise<void> {
  console.log('=== SELF_UPDATE START ===');
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
    } else {
      await configManager.log(`Self-update: failed - ${result.error}`);
    }

    // Output
    if (jsonFlag) {
      console.log(JSON.stringify(result, null, 2));
    } else {
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

// Self-update helper functions
function getInstallDir(configManager: any): string {
  try {
    const config = configManager.loadConfigSync?.() || (configManager as any).loadConfig();
    if (config?.installDir) {
      return config.installDir;
    }
  } catch {
    // Fall through
  }

  const envDir = process.env.CLAUDE_MODELS_INSTALL_DIR;
  if (envDir) {
    return envDir;
  }

  const home = process.env.HOME || process.env.USERPROFILE || require('os').homedir();
  return resolve(home, '.claude-models-cli-repo');
}

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

async function getGitInfo(installDir: string): Promise<{ version: string; commit: string } | null> {
  try {
    const pkgPath = resolve(installDir, 'package.json');
    // Quick sync check to avoid hanging on non-existent file
    if (!existsSync(pkgPath)) {
      return null;
    }
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
        exec('git rev-parse HEAD', { cwd: installDir }, (err, stdout) => {
          err ? reject(err) : resolve(stdout.trim());
        });
      });

      const remoteCommit = await new Promise<string>((resolve, reject) => {
        exec('git rev-parse origin/master', { cwd: installDir }, (err, stdout) => {
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
        exec('git show origin/master:package.json', { cwd: installDir }, (err, stdout) => {
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
      exec('git status --porcelain', { cwd: installDir }, (err, stdout) => {
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

          const wrappedError = new Error(parsedError) as any;
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

// ANSI color codes for terminal output
function cyan(text: string): string {
  return `\x1b[36m${text}\x1b[0m`;
}

function gray(text: string): string {
  return `\x1b[90m${text}\x1b[0m`;
}

function magenta(text: string): string {
  return `\x1b[35m${text}\x1b[0m`;
}

function white(text: string): string {
  return `\x1b[97m${text}\x1b[0m`;
}

main().catch(console.error);
