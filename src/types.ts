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
  installDir?: string;
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
  // Allow override for testing
  if (process.env.TEST_CONFIG_DIR) {
    return process.env.TEST_CONFIG_DIR;
  }

  // Use process.env which works in both Bun and Node
  const isWin = process.platform === 'win32';
  const home = process.env.HOME || process.env.USERPROFILE || (isWin ? process.env.USERPROFILE : process.env.HOME) || './';
  const sep = isWin ? '\\' : '/';

  // Ensure no trailing separator to avoid double sep
  const cleanHome = home.endsWith(sep) ? home.slice(0, -1) : home;
  return `${cleanHome}${sep}.claude-models-cli`;
}
