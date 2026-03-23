import { Model } from '../types';

export class OpenRouterProvider {
  private readonly API_URL = 'https://openrouter.ai/api/v1/models';

  async fetchModels(limit: number = 10): Promise<Model[]> {
    try {
      const response = await fetch(this.API_URL);

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('OpenRouter rate limit exceeded. Try again in 1 hour or use "cla" for auto-fallback.');
        } else if (response.status === 401) {
          throw new Error('Invalid OPENROUTER_API_KEY. Get a key at https://openrouter.ai/keys');
        } else if (response.status === 403) {
          throw new Error('OpenRouter access forbidden. Check your API key permissions.');
        }
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

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

      return scoredModels.sort((a, b) => b.score - a.score).slice(0, limit);
    } catch (error) {
      console.error('Failed to fetch OpenRouter models:', error);
      return [];
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
