#!/usr/bin/env bun

import { ClaudeModels } from './index';
import { PKG_VERSION, PKG_NAME, REPO_URL } from './version';
import { PKG_VERSION, PKG_NAME, REPO_URL } from './version';

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
    const stats = Bun.file(config.getModelsFile()).statSync();
    console.log(`Models last updated: ${stats.mtime}`);
    console.log(`Number of models: ${JSON.parse(Bun.file(config.getModelsFile()).textSync()).length}`);
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
  providers, -p       List configured providers
  config, -c          Edit configuration file
  logs, -L            View recent activity logs
  export, -e          Generate shell aliases (cm1-cm10, cla)
  version, -v         Show version
  info, -i            Show environment information
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
