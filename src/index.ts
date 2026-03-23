import { ConfigManager } from './config';
import { Model, DEFAULT_CONFIG } from './types';
import { OpenRouterProvider } from './providers/openrouter';
import { OllamaProvider } from './providers/ollama';
import { HuggingFaceProvider } from './providers/huggingface';

export class ClaudeModels {
  private configManager: ConfigManager;
  private providers: Map<string, any>;

  constructor() {
    this.configManager = new ConfigManager();
    this.providers = new Map([
      ['openrouter', new OpenRouterProvider()],
      ['ollama', new OllamaProvider()],
      ['huggingface', new HuggingFaceProvider()],
    ]);
  }

  async initialize(): Promise<void> {
    await this.configManager.initialize();
  }

  async updateModels(force: boolean = false, providers: string[] = ['openrouter']): Promise<Model[]> {
    const config = await this.configManager.loadConfig();
    const cache = this.configManager.getCacheManager();

    // If not forcing and we have fresh models file, use it
    if (!force) {
      const shouldUpdate = await this.configManager.shouldUpdate(config.updateIntervalHours);
      if (!shouldUpdate) {
        console.log('Models list is recent. Use --force to update anyway.');
        return this.configManager.loadModels();
      }

      // Also check cache for faster response
      const cachedModels = await cache.get<Model[]>('all_models');
      if (cachedModels && Array.isArray(cachedModels) && cachedModels.length > 0) {
        console.log('Using cached models (fresh from memory).');
        return cachedModels;
      }
    }

    console.log('Fetching latest free models...');

    const allModels: Model[] = [];

    for (const providerName of providers) {
      const provider = this.providers.get(providerName.toLowerCase());
      if (provider) {
        // Check cache for this provider first
        const cacheKey = `models_${providerName}_${config.maxModels}`;
        const cached = await cache.get<Model[]>(cacheKey);

        if (cached && Array.isArray(cached) && cached.length > 0 && !force) {
          console.log(`  ✓ Using cached ${providerName} models (${cached.length} models)`);
          allModels.push(...cached);
        } else {
          const models = await provider.fetchModels(config.maxModels);
          if (models && models.length > 0) {
            // Cache the provider results (1 hour TTL)
            await cache.set(cacheKey, models, 60 * 60 * 1000);
            allModels.push(...models);
          }
        }
      } else {
        console.warn(`Unknown provider: ${providerName}`);
      }
    }

    // Rank and limit
    const ranked = allModels
      .sort((a, b) => b.score - a.score)
      .slice(0, config.maxModels);

    // Add ranks
    const rankedWithRanks = ranked.map((model, index) => ({
      ...model,
      rank: index + 1,
      lastUpdated: new Date().toISOString().replace('T', ' ').substring(0, 19),
    }));

    await this.configManager.saveModels(rankedWithRanks);

    // Cache the final ranked models for quick access
    await cache.set('all_models', rankedWithRanks, config.updateIntervalHours * 60 * 60 * 1000);

    if (config.logActivity) {
      await this.configManager.log(
        `Updated models list: ${rankedWithRanks.length} models from ${providers.join(', ')}`
      );
    }

    console.log(`Updated ${rankedWithRanks.length} models`);
    return rankedWithRanks;
  }

  async getModels(): Promise<Model[]> {
    const models = await this.configManager.loadModels();
    if (!models) {
      throw new Error('No models found. Run update first.');
    }
    return models;
  }

  async exportAliases(): Promise<void> {
    const models = await this.getModels();
    const config = await this.configManager.loadConfig();
    const aliasesFile = this.configManager.getAliasesFile();

    const envSetup = `
# Claude Models CLI - Auto-generated Aliases
# Generated: ${new Date().toISOString()}
# Version: ${config.version}

# Environment setup
export ANTHROPIC_BASE_URL="https://openrouter.ai/api"

# Ensure auth token is set
if [ -z "$ANTHROPIC_AUTH_TOKEN" ] && [ -n "$OPENROUTER_API_KEY" ]; then
  export ANTHROPIC_AUTH_TOKEN="$OPENROUTER_API_KEY"
fi
`;

    let aliasScript = envSetup + '\n';

    // Generate cm1-cm10 aliases (cm = Claude Models)
    for (const model of models) {
      const aliasName = `cm${model.rank}`;
      aliasScript += `
function ${aliasName}() {
  export ANTHROPIC_MODEL="${model.id}"
  if [ $# -eq 0 ]; then
    claude
  else
    claude "$@"
  fi
}
alias ${aliasName}="${aliasName}"
`;
    }

    // Add utility functions
    aliasScript += `
function claude-models() {
  case "$1" in
    update|--update|-u)
      cm-update --force
      ;;
    list|--list|-l)
      cm-list
      ;;
    providers|--providers|-p)
      echo "Configured providers: openrouter, ollama, huggingface"
      ;;
    config|--config|-c)
      ${process.platform === 'win32' ? 'notepad' : '${EDITOR:-nano}'} "${this.configManager.getConfigDir()}/config.json"
      ;;
    logs|--logs|-L)
      tail -20 "${this.configManager.getLogFile()}" 2>/dev/null || echo "No logs yet"
      ;;
    *)
      echo "Usage: claude-models [update|list|providers|config|logs]"
      ;;
  esac
}

alias cm="claude-models"

function cla() {
  # Smart launcher with fallback
  local models=$(cat "${this.configManager.getModelsFile()}" | jq -r '.[] | "\(.rank) \(.id)"' 2>/dev/null || echo "")
  if [ -z "$models" ]; then
    echo "No models found. Run 'cm update' first."
    return 1
  fi

  while IFS= read -r rank id; do
    echo "Trying $id..."
    export ANTHROPIC_MODEL="$id"
    if claude; then
      break
    fi
  done <<< "$models"
}
`;

    // Write the alias script
    await Bun.write(aliasesFile, aliasScript);

    // Also create a symlink or copy to common locations for easy sourcing
    try {
      const shellRc = process.env.SHELL?.includes('zsh') ? '~/.zshrc' :
                     process.env.SHELL?.includes('bash') ? '~/.bashrc' :
                     process.env.SHELL?.includes('fish') ? '~/.config/fish/config.fish' :
                     '~/.profile';

      console.log(`\n✅ Aliases exported to: ${aliasesFile}`);
      console.log(`📝 Add to your shell config: echo "source ${aliasesFile}" >> ${shellRc}`);
    } catch {
      console.log(`\n✅ Aliases exported to: ${aliasesFile}`);
    }
  }

  async listModels(): Promise<void> {
    const models = await this.getModels();

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
