#!/usr/bin/env bun

import { ClaudeModels } from './index';

async function main() {
  const args = process.argv.slice(2);
  const cm = new ClaudeModels();

  await cm.initialize();

  const command = args[0];

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
        await cm.listModels();
      } catch (error: any) {
        console.error('❌ Error:', error.message);
        console.log('Run "cm update" to fetch models first.');
      }
      break;

    case 'providers':
    case '--providers':
    case '-p':
      console.log('Available providers:');
      console.log('  - openrouter (default, free tier)');
      console.log('  - ollama (local models)');
      console.log('  - huggingface (coming soon)');
      break;

    case 'config':
    case '--config':
    case '-c':
      const configPath = await cm.initialize().then(() => cm['configManager'].getConfigDir() + '/config.json');
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
      const logFile = await cm.initialize().then(() => cm['configManager'].getLogFile());
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
      console.log('claude-models-cli v1.0.0');
      break;

    case 'help':
    case '--help':
    case '-h':
    default:
      printHelp();
      break;
  }
}

function printHelp() {
  console.log(`
🚀 Claude Models CLI - Cross-platform model manager

Usage: cm <command> [options]

Commands:
  update, -u          Fetch and rank latest free models
  list, -l            Show current top 10 models
  providers, -p       List configured providers
  config, -c          Edit configuration file
  logs, -L            View recent activity logs
  export, -e          Generate shell aliases (cm1-cm10, cla)
  version, -v         Show version
  help, -h            Show this help message

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

GitHub: https://github.com/yourusername/claude-models-cli
License: MIT
`);
}

main().catch(console.error);
