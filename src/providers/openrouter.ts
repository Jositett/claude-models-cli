import { Model } from '../types.js';
import { ProbeResult } from '../probing.js';
import { retryWithBackoff, shouldRetryOpenRouter } from '../utils/retry.js';

export class OpenRouterProvider {
  private readonly API_URL = 'https://openrouter.ai/api/v1/models';

  async fetchModels(limit: number = 10): Promise<Model[]> {
    // Get retry configuration from environment
    const maxAttempts = parseInt(process.env.OPENROUTER_RETRY_ATTEMPTS || '3', 10);
    const baseDelayMs = parseInt(process.env.OPENROUTER_RETRY_DELAY_MS || '1000', 10);

    try {
      const response = await retryWithBackoff(async () => {
        const res = await fetch(this.API_URL);
        if (!res.ok) {
          const error: any = new Error(`OpenRouter API error: ${res.status} ${res.statusText}`);
          error.status = res.status;
          return error;
        }
        return res;
      }, {
        maxAttempts,
        baseDelayMs,
        maxDelayMs: 10000,
        shouldRetry: shouldRetryOpenRouter,
      });

      // If response is an error (caught and rethrown), throw it
      if (response instanceof Error) {
        throw response;
      }

      const data: any = await response.json();

      // Filter free models
      const freeModels = data.data?.filter((model: any) => {
        return (
          model.id.includes(':free') ||
          (model.pricing?.prompt === 0 && model.pricing?.completion === 0)
        );
      }) || [];

      // Score models based on programming suitability
      const scoredModels = freeModels.map((model: any) => {
        const score = this.scoreModel(model);
        return {
          id: model.id,
          name: model.name,
          provider: model.id.split('/')[0],
          contextLength: model.context_length,
          description: model.description || '',
          score,
          source: 'OpenRouter',
        } as Model;
      });

      return scoredModels.sort((a: Model, b: Model) => b.score - a.score).slice(0, limit);
    } catch (error: any) {
      console.error('Failed to fetch OpenRouter models:', error.message || error);
      return [];
    }
  }

  async testModel(modelId: string): Promise<ProbeResult> {
    const startTime = Date.now();

    // Get retry configuration from environment
    const maxAttempts = parseInt(process.env.OPENROUTER_RETRY_ATTEMPTS || '3', 10);
    const baseDelayMs = parseInt(process.env.OPENROUTER_RETRY_DELAY_MS || '1000', 10);

    try {
      const response = await retryWithBackoff(async () => {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://github.com/Jositett/claude-models-cli',
          },
          body: JSON.stringify({
            model: modelId,
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 1,
            stream: false,
          }),
        });

        if (!res.ok) {
          const error: any = new Error(`HTTP ${res.status}`);
          error.status = res.status;
          try {
            const errorData: any = await res.json();
            error.message = errorData.error?.message || error.message;
          } catch {
            // Keep generic error
          }
          throw error;
        }

        return res;
      }, {
        maxAttempts,
        baseDelayMs,
        maxDelayMs: 10000,
        shouldRetry: shouldRetryOpenRouter,
      });

      // If response is an error (caught and rethrown after retries exhausted), throw it
      if (response instanceof Error) {
        throw response;
      }

      const responseTimeMs = Date.now() - startTime;

      // Success!
      return {
        modelId,
        status: 'ok',
        responseTimeMs,
        timestamp: Date.now(),
      };
    } catch (error: any) {
      const responseTimeMs = Date.now() - startTime;
      let errorMsg = error.message || 'Unknown error';

      // Provide helpful error messages for common cases
      if (error.status === 401) {
        errorMsg = 'Unauthorized - check OPENROUTER_API_KEY';
      } else if (error.status === 402) {
        errorMsg = 'Insufficient credits - add credits to continue';
      } else if (error.status === 429) {
        errorMsg = 'Rate limit exceeded - try again later';
      } else if (error.status === 404) {
        errorMsg = 'Model not found (404)';
      } else if (error.status === 400 && errorMsg.includes('max_tokens')) {
        errorMsg = 'Model cannot generate (max_tokens exceeded)';
      }

      return {
        modelId,
        status: 'fail',
        responseTimeMs,
        error: errorMsg,
        timestamp: Date.now(),
      };
    }
  }

  private scoreModel(model: any): number {
    let score = 0;
    const id = model.id.toLowerCase();
    const desc = (model.description + ' ' + model.name).toLowerCase();

    // Programming keywords (high priority)
    if (/coder|code|programming|dev|software|agent/.test(desc)) {
      score += 100;
    }
    if (/reasoning|thinking|instruct|chat/.test(desc)) {
      score += 50;
    }

    // Provider reputation
    if (/qwen|deepseek|mistral|meta|nvidia|anthropic/.test(id)) {
      score += 30;
    }

    // Context length bonus (larger context is better)
    if (model.context_length) {
      score += Math.min(50, Math.floor(model.context_length / 5000));
    }

    return score;
  }
}
