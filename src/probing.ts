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

// Simple semaphore for concurrency control
class Semaphore {
  private maxConcurrent: number;
  private current: number = 0;
  private queue: (() => void)[] = [];

  constructor(maxConcurrent: number) {
    this.maxConcurrent = maxConcurrent;
  }

  async acquire(): Promise<void> {
    return new Promise(resolve => {
      if (this.current < this.maxConcurrent) {
        this.current++;
        resolve();
      } else {
        this.queue.push(resolve);
      }
    });
  }

  release(): void {
    this.current--;
    if (this.queue.length > 0) {
      this.current++;
      const next = this.queue.shift();
      next?.();
    }
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
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

  async getProbeStatus(modelId: string): Promise<ProbeResult | null> {
    const results = await this.loadResults();
    return results.get(modelId) || null;
  }

  async hasProbeResult(modelId: string): Promise<boolean> {
    const results = await this.loadResults();
    return results.has(modelId);
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

    const semaphore = new Semaphore(concurrency);
    const results: ProbeResult[] = [];

    // Create array of tasks
    const tasks = modelsToProbe.map(async (model, index) => {
      const rank = index + 1;
      const rankDisplay = `[${rank}]`.padStart(4);

      try {
        const result = await semaphore.run(() => this.probeModel(model, force));

        if (result.status === 'ok') {
          const time = result.responseTimeMs !== undefined ? `${(result.responseTimeMs / 1000).toFixed(1)}s`.padStart(5) : 'N/A'.padStart(5);
          const ctx = result.contextLength ? `${Math.round(result.contextLength / 1000)}k`.padStart(5) : 'N/A'.padStart(5);
          console.log(`${rankDisplay} ✓ ${model.id.padEnd(40)} [${time}] ${ctx} context`);
        } else {
          const error = result.error || 'Unknown error';
          const errorShort = error.length > 30 ? error.substring(0, 30) + '...' : error;
          console.log(`${rankDisplay} ✗ ${model.id.padEnd(40)} ${errorShort}`);
        }

        return result;
      } catch (error: any) {
        console.log(`${rankDisplay} ✗ ${model.id.padEnd(40)} Unexpected: ${error.message?.substring(0, 30) || 'Error'}`);
        return {
          modelId: model.id,
          status: 'fail' as const,
          error: error.message,
          timestamp: Date.now(),
        };
      }
    });

    // Wait for all to complete
    const completedResults: ProbeResult[] = await Promise.all(tasks);
    results.push(...completedResults);

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
