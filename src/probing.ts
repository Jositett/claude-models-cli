import { Model } from './types.js';
import { CacheManager } from './cache.js';
import { OpenRouterProvider } from './providers/openrouter.js';

export interface ProbeResult {
  modelId: string;
  status: 'ok' | 'fail';
  responseTimeMs?: number;
  error?: string;
  contextLength?: number;
  timestamp: number;
}

export class ProbeManager {
  private configDir: string;
  private cacheManager: CacheManager;
  private provider: OpenRouterProvider;

  constructor(configDir: string, cacheManager: CacheManager) {
    this.configDir = configDir;
    this.cacheManager = cacheManager;
    this.provider = new OpenRouterProvider();
  }

  async loadResults(): Promise<Map<string, ProbeResult>> {
    try {
      const cached = await this.cacheManager.get<{ [modelId: string]: ProbeResult }>('probe_results');
      if (cached) {
        return new Map(Object.entries(cached));
      }
    } catch (error) {
      console.debug('Failed to load probe results:', error);
    }
    return new Map();
  }

  async saveResults(results: ProbeResult[]): Promise<void> {
    const resultsMap: { [modelId: string]: ProbeResult } = {};
    for (const result of results) {
      resultsMap[result.modelId] = result;
    }
    // Cache for 24 hours
    await this.cacheManager.set('probe_results', resultsMap, 24 * 60 * 60 * 1000);
  }

  async probeModel(model: Model, force: boolean = false): Promise<ProbeResult> {
    // Check cache first if not forcing
    if (!force) {
      const cachedResults = await this.loadResults();
      const cached = cachedResults.get(model.id);
      if (cached) {
        return cached;
      }
    }

    // Probe using the provider
    const result = await this.provider.testModel(model.id);

    // Add context length from model metadata (more accurate than what provider might return)
    if (result.status === 'ok') {
      result.contextLength = model.contextLength;
    }

    result.timestamp = Date.now();
    return result;
  }

  async probeAll(
    models: Model[],
    options: { limit?: number; concurrency?: number; force?: boolean } = {}
  ): Promise<ProbeResult[]> {
    const { limit = 10, concurrency = 1, force = false } = options;

    // Take top N models
    const modelsToProbe = models.slice(0, limit);

    console.log(`\n🔍 Probing ${modelsToProbe.length} models (sequential to avoid rate limits)...\n`);

    const results: ProbeResult[] = [];

    for (let i = 0; i < modelsToProbe.length; i++) {
      const model = modelsToProbe[i];
      const rank = i + 1;
      const rankDisplay = `[${rank}]`.padStart(4);

      try {
        const result = await this.probeModel(model, force);

        if (result.status === 'ok') {
          const time = result.responseTimeMs !== undefined ? `${(result.responseTimeMs / 1000).toFixed(1)}s`.padStart(5) : 'N/A'.padStart(5);
          const ctx = result.contextLength ? `${Math.round(result.contextLength / 1000)}k`.padStart(5) : 'N/A'.padStart(5);
          console.log(`${rankDisplay} ✓ ${model.id.padEnd(40)} [${time}] ${ctx} context`);
        } else {
          const error = result.error || 'Unknown error';
          const errorShort = error.length > 30 ? error.substring(0, 30) + '...' : error;
          console.log(`${rankDisplay} ✗ ${model.id.padEnd(40)} ${errorShort}`);
        }

        results.push(result);

        // Small delay to be nice to the API
        if (i < modelsToProbe.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error: any) {
        console.log(`${rankDisplay} ✗ ${model.id.padEnd(40)} Unexpected: ${error.message?.substring(0, 30) || 'Error'}`);
        const result: ProbeResult = {
          modelId: model.id,
          status: 'fail',
          error: error.message,
          timestamp: Date.now(),
        };
        results.push(result);
      }
    }

    // Save results to cache
    await this.saveResults(results);

    // Print summary
    const okCount = results.filter(r => r.status === 'ok').length;
    const failCount = results.length - okCount;

    console.log('\n📊 Probe Summary:');
    console.log(`   Tested: ${results.length} models`);
    console.log(`   ✓ Working: ${okCount}`);
    console.log(`   ✗ Failed: ${failCount}`);

    // Show top 3 working models
    const working = results.filter(r => r.status === 'ok').sort((a, b) => (a.responseTimeMs || 0) - (b.responseTimeMs || 0));
    if (working.length > 0) {
      console.log('\n🎯 Recommended working models:');
      for (let i = 0; i < Math.min(3, working.length); i++) {
        const r = working[i];
        const time = r.responseTimeMs !== undefined ? ` (${(r.responseTimeMs / 1000).toFixed(1)}s)` : '';
        console.log(`   ${i + 1}. ${r.modelId}${time}`);
      }
    }

    console.log('');

    return results;
  }
}
