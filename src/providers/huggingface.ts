import { Model } from '../types.js';

export class HuggingFaceProvider {
  async fetchModels(limit: number = 10): Promise<Model[]> {
    console.log('HuggingFace provider not yet implemented. Contributions welcome!');
    return [];
  }
}
