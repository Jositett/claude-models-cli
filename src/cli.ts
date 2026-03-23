#!/usr/bin/env bun

import { ClaudeModels } from './index.js';
import { PKG_VERSION, PKG_NAME, REPO_URL } from './version.js';
import { statSync, readFileSync } from 'fs';
import { ProbeManager } from './probing.js';

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
    case '--config':
    case '-c':
      const configPath = cm['configManager'].getConfigDir() + '/config.json';
      if (process.platform === 'win32') {
        import('child_process').then(({ exec }) => exec(`notepad "${configPath}"`));
      } else {
        const editor = process.env.EDITOR || 'nano';
        import('child_process').then(({ spawn }) => spawn(editor, [configPath], { stdio: 'inherit' }));
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

  console.log('\n💡 Pro tip: Use "cla" to auto-try models until one works');
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
  console.log(`
🚀 Claude Models CLI v${PKG_VERSION} - Cross-platform model manager

Usage: cm <command> [options]

Commands:
  update, -u          Fetch and rank latest free models
  list, -l            Show current top 10 models
  select              Interactive model selection
                      Options: --only-working (show only probed models)
  providers, -p       List configured providers
  config, -c          Edit configuration file
  logs, -L            View recent activity logs
  export, -e          Generate shell aliases (cm1-cm10, cla)
  version, -v         Show version
  info, -i            Show environment information
  cache               Manage model cache
                      Subcommands: clear, stats
  probe, scan         Test models to see which ones actually work
                      Options: --limit N (default 10), --force, --json
  help, -h            Show this help message

Options:
  --json, -j          Output in JSON format (for list command)
  --help, -h          Show this help message

Quick Start:
  1. Set your API key:
     export OPENROUTER_API_KEY="sk-or-v1-..."

  2. Fetch models:
     cm update

  3. Generate aliases:
     cm export
     source ~/.claude-models-cli/aliases.sh

  4. Launch models:
     cm1    # Launch #1 ranked model
     cm2    # Launch #2 model
     cla    # Auto-try models until one works

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
      console.log(`   export ANTHROPIC_MODEL="${selected.id}"`);
      console.log(`   claude`);

      // Also create a quick alias file suggestion
      const aliasName = `cm-selected`;
      console.log(`\n📝 Or create a shortcut:`);
      console.log(`   function ${aliasName}() { export ANTHROPIC_MODEL="${selected.id}"; claude "$@"; }`);
    }
  } catch (error: any) {
    console.error('❌ Selection failed:', error.message);
  }
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
