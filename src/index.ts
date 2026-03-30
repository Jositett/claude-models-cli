import { ConfigManager } from './config.js';
import { Model, DEFAULT_CONFIG } from './types.js';
import { OpenRouterProvider } from './providers/openrouter.js';
import { OllamaProvider } from './providers/ollama.js';
import { HuggingFaceProvider } from './providers/huggingface.js';

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

    // If no models were fetched from providers, preserve existing models instead of overwriting with empty array
    if (ranked.length === 0) {
      console.error('❌ Failed to fetch models from any provider.');
      console.log('ℹ️ Preserving existing models (if any exist).');
      // Try to load and return existing models from cache/file
      try {
        const existingModels = await this.configManager.loadModels();
        if (existingModels && existingModels.length > 0) {
          console.log(`✓ Loaded ${existingModels.length} models from cache.`);
          return existingModels;
        }
      } catch {
        // No existing models to fall back to
      }
      // No models available at all
      throw new Error('No models available and could not fetch from providers. Check network and API key.');
    }

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
    const isWin = process.platform === 'win32';
    const configDir = this.configManager.getConfigDir();
    const modelsFile = this.configManager.getModelsFile();
    const logFile = this.configManager.getLogFile();
    const aliasesFile = this.configManager.getAliasesFile();

    let aliasScript = '';

    if (isWin) {
      // PowerShell version
      aliasScript = `# Claude Models CLI - Auto-generated Aliases
# Generated: ${new Date().toISOString()}
# Version: ${config.version}

# Environment setup
$env:ANTHROPIC_BASE_URL = "https://openrouter.ai/api"

# Ensure auth token is set
if (-not $env:ANTHROPIC_AUTH_TOKEN -and $env:OPENROUTER_API_KEY) {
  $env:ANTHROPIC_AUTH_TOKEN = $env:OPENROUTER_API_KEY
}

`;
      for (const model of models) {
        aliasScript += `function global:cm${model.rank} {
  param([Parameter(ValueFromRemainingArguments=$true)] $args)
  $env:ANTHROPIC_MODEL = "${model.id}"
  if ($args.Count -eq 0) {
    claude
  } else {
    claude @args
  }
}
`;
      }

      aliasScript += `
function global:cm {
  param(
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$Args
  )
  $wrapper = "$env:USERPROFILE\\bin\\cm.ps1"
  if (-not (Test-Path $wrapper)) {
    Write-Error "cm wrapper not found at $wrapper. Please ensure the CLI is installed."
    return 1
  }
  & $wrapper @Args
}

function global:cma {
  $modelsFile = "${modelsFile}"
  if (-not (Test-Path $modelsFile)) {
    Write-Error "No models found. Run 'cm update' first."
    return 1
  }
  $models = Get-Content $modelsFile | ConvertFrom-Json
  foreach ($model in $models) {
    $id = $model.id
    Write-Host "Trying $id..."
    $env:ANTHROPIC_MODEL = $id
    claude
    if ($LASTEXITCODE -eq 0) {
      break
    }
  }
}
`;
    } else {
      // Bash/zsh/fish version
      const envSetup = `# Claude Models CLI - Auto-generated Aliases
# Generated: ${new Date().toISOString()}
# Version: ${config.version}

# Environment setup
export ANTHROPIC_BASE_URL="https://openrouter.ai/api"

# Ensure auth token is set
if [ -z "$ANTHROPIC_AUTH_TOKEN" ] && [ -n "$OPENROUTER_API_KEY" ]; then
  export ANTHROPIC_AUTH_TOKEN="$OPENROUTER_API_KEY"
fi
`;

      aliasScript = envSetup + '\n';

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
      // Add cma auto-fallback function (cm1-cm10 already added)
      aliasScript += `
function cma() {
  # Smart launcher with fallback
  local models=$(cat "${modelsFile}" | jq -r '.[] | "\(.rank) \(.id)"' 2>/dev/null || echo "")
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
    }

    // Write the alias script
    await Bun.write(aliasesFile, aliasScript);

    // Suggest how to activate
    console.log(`\n✅ Aliases exported to: ${aliasesFile}`);
    if (isWin) {
      console.log(`📝 Add to your PowerShell profile: Add-Content $PROFILE "source ${aliasesFile}"`);
      console.log(`   Or run: . ${aliasesFile}`);
    } else {
      const shellRc = process.env.SHELL?.includes('zsh') ? '~/.zshrc' :
                     process.env.SHELL?.includes('bash') ? '~/.bashrc' :
                     process.env.SHELL?.includes('fish') ? '~/.config/fish/config.fish' :
                     '~/.profile';
      console.log(`📝 Add to your shell config: echo "source ${aliasesFile}" >> ${shellRc}`);
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

    console.log('\n💡 Pro tip: Use "cma" to auto-try models until one works');
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
