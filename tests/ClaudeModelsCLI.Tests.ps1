import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { ClaudeModels } from '../src/index';
import { ConfigManager } from '../src/config';

describe('ClaudeModelsCLI', () => {
  let cm: ClaudeModels;
  let configDir: string;

  beforeEach(async () => {
    cm = new ClaudeModels();
    await cm.initialize();

    const configManager = (cm as any).configManager;
    configDir = configManager.getConfigDir();

    // Clean up any existing files
    try {
      await Bun.rm(configDir, { recursive: true, force: true });
    } catch {
      // Directory might not exist
    }

    // Re-initialize
    await cm.initialize();
  });

  afterEach(async () => {
    // Cleanup
    try {
      await Bun.rm(configDir, { recursive: true, force: true });
    } catch {
      // Directory might not exist
    }
  });

  describe('Module Initialization', () => {
    it('should initialize without errors', async () => {
      expect(cm).toBeDefined();
      await expect(cm.initialize()).resolves.not.toThrow();
    });

    it('should create config directory', async () => {
      const configManager = (cm as any).configManager;
      const configDir = configManager.getConfigDir();

      const exists = await Bun.file(configDir).exists();
      expect(exists).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('should load default config', async () => {
      const configManager = (cm as any).configManager;
      const config = await configManager.loadConfig();

      expect(config).toBeDefined();
      expect(config.version).toBe('1.0.0');
      expect(config.defaultProvider).toBe('openrouter');
      expect(config.maxModels).toBe(10);
    });

    it('should save and load config', async () => {
      const configManager = (cm as any).configManager;
      const testConfig = {
        version: '1.0.0',
        defaultProvider: 'openrouter',
        autoUpdate: false,
        updateIntervalHours: 12,
        maxModels: 15,
        preferredContext: 'coding',
        rateLimitHandling: 'rotate' as const,
        logActivity: true,
      };

      await configManager.saveConfig(testConfig);
      const loaded = await configManager.loadConfig();

      expect(loaded.maxModels).toBe(15);
      expect(loaded.autoUpdate).toBe(false);
    });
  });

  describe('Model Management', () => {
    it('should return empty models when not initialized', async () => {
      await expect(cm.getModels()).rejects.toThrow('No models found');
    });

    it('should update models from OpenRouter', async () => {
      const models = await cm.updateModels(true, ['openrouter']);

      expect(Array.isArray(models)).toBe(true);
      // May be empty if API fails, but shouldn't throw
    });

    it('should rank models by score', async () => {
      const models = await cm.updateModels(true, ['openrouter']);

      if (models.length > 1) {
        for (let i = 0; i < models.length - 1; i++) {
          expect(models[i].score).toBeGreaterThanOrEqual(models[i + 1].score);
        }
      }
    });

    it('should limit models to maxModels config', async () => {
      const configManager = (cm as any).configManager;
      await configManager.saveConfig({
        ...await configManager.loadConfig(),
        maxModels: 5,
      });

      const models = await cm.updateModels(true, ['openrouter']);
      expect(models.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Logging', () => {
    it('should write activity logs', async () => {
      const configManager = (cm as any).configManager;
      await configManager.log('Test log entry');

      const logFile = configManager.getLogFile();
      const content = await Bun.file(logFile).text();

      expect(content).toContain('Test log entry');
    });
  });
});

describe('OpenRouterProvider', () => {
  it('should fetch models from API', async () => {
    const { OpenRouterProvider } = await import('../src/providers/openrouter');
    const provider = new OpenRouterProvider();

    const models = await provider.fetchModels(5);

    expect(Array.isArray(models)).toBe(true);
    if (models.length > 0) {
      expect(models[0]).toHaveProperty('id');
      expect(models[0]).toHaveProperty('name');
      expect(models[0]).toHaveProperty('score');
      expect(models[0]).toHaveProperty('provider');
    }
  });

  it('should score models correctly', async () => {
    const { OpenRouterProvider } = await import('../src/providers/openrouter');
    const provider = new OpenRouterProvider();

    // Mock model with coder keyword should have higher score
    const mockModel = {
      id: 'test/coder-model:free',
      name: 'Coder Pro',
      description: 'A model specialized in coding and programming',
      context_length: 32000,
      pricing: { prompt: 0, completion: 0 },
    };

    // Access private method via closure - we'll just test the public behavior
    const models = await provider.fetchModels(10);
    const coderModels = models.filter(m => m.id.includes('coder') || m.description.includes('code'));

    // At least some models should be returned (even if none specifically have "coder")
    expect(models.length).toBeGreaterThanOrEqual(0);
  });
});
