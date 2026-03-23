export interface Model {
  id: string;
  name: string;
  provider: string;
  contextLength: number;
  description: string;
  score: number;
  source: string;
  rank?: number;
  lastUpdated?: string;
}

export interface Config {
  version: string;
  defaultProvider: string;
  autoUpdate: boolean;
  updateIntervalHours: number;
  maxModels: number;
  preferredContext: string;
  rateLimitHandling: 'rotate' | 'fail' | 'retry';
  logActivity: boolean;
}

export interface Provider {
  name: string;
  fetchModels(limit: number): Promise<Model[]>;
}

export const DEFAULT_CONFIG: Config = {
  version: '1.0.0',
  defaultProvider: 'openrouter',
  autoUpdate: true,
  updateIntervalHours: 24,
  maxModels: 10,
  preferredContext: 'coding',
  rateLimitHandling: 'rotate',
  logActivity: true,
};

export function getConfigDir(): string {
  if (typeof Bun !== 'undefined') {
    return Bun.get env('HOME') + '/.claude-models-cli' ||
           Bun.get env('USERPROFILE') + '\\.claude-models-cli' ||
           './.claude-models-cli';
  }
  // Fallback for non-Bun environments
  const home = process.env.HOME || process.env.USERPROFILE || './';
  return home + '/.claude-models-cli';
}
