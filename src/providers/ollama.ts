import { Model } from '../types.js';
import { retryWithBackoff } from '../utils/retry.js';

export class OllamaProvider {
  private readonly API_URL = 'http://localhost:11434/api/tags';

  async fetchModels(limit: number = 10): Promise<Model[]> {
    // Get retry configuration from environment
    const maxAttempts = parseInt(process.env.OLLAMA_RETRY_ATTEMPTS || '2', 10);
    const baseDelayMs = parseInt(process.env.OLLAMA_RETRY_DELAY_MS || '500', 10);

    try {
      const response = await retryWithBackoff(async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(this.API_URL, {
          method: 'GET',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          const error: any = new Error(`Ollama API error: ${res.status}`);
          error.status = res.status;
          throw error;
        }

        return res;
      }, {
        maxAttempts,
        baseDelayMs,
        maxDelayMs: 5000,
        shouldRetry: (error, attempt) => {
          // Don't retry 404 (not found) or 4xx client errors
          if (error.status === 404) return false;
          if (error.status >= 400 && error.status < 500) return false;
          return true;
        },
      });

      // If response is an error (caught and rethrown after retries exhausted), throw it
      if (response instanceof Error) {
        throw response;
      }

      const data: any = await response.json();

      const models = (data.models || [])
        .slice(0, limit)
        .map((model: any) => ({
          id: `ollama/${model.name}`,
          name: model.name,
          provider: 'Ollama',
          contextLength: 4096,
          description: `Local model: ${model.name}`,
          score: 50,
          source: 'Ollama',
        }) as Model);

      return models;
    } catch (error) {
      console.debug('Ollama not available:', error.message || error);
      return [];
    }
  }
}
