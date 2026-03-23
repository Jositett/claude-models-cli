import { Model } from '../types.js';

export class OllamaProvider {
  private readonly API_URL = 'http://localhost:11434/api/tags';

  async fetchModels(limit: number = 10): Promise<Model[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(this.API_URL, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return [];
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
      console.debug('Ollama not available:', error);
      return [];
    }
  }
}
