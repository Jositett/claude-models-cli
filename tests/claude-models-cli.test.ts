import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'bun:test';
import { rm, mkdir, access } from 'fs/promises';
import { ClaudeModels } from '../src/index';
import { ConfigManager } from '../src/config';

// Use a dedicated test config directory
const TEST_CONFIG_DIR = './test-temp-config';

describe('ClaudeModelsCLI', () => {
  beforeAll(async () => {
    // Set env var to use test config dir
    process.env.TEST_CONFIG_DIR = TEST_CONFIG_DIR;
    // Clean up any previous leftover
    try {
      await rm(TEST_CONFIG_DIR, { recursive: true, force: true });
    } catch {}
  });

  afterAll(async () => {
    // Cleanup
    try {
      await rm(TEST_CONFIG_DIR, { recursive: true, force: true });
    } catch {}
    delete process.env.TEST_CONFIG_DIR;
  });

  beforeEach(async () => {
    // Ensure clean state before each test
    try {
      await rm(TEST_CONFIG_DIR, { recursive: true, force: true });
    } catch {}
  });

  describe('ConfigManager', () => {
    it('should create config directory and default config', async () => {
      const cm = new ClaudeModels();
      await cm.initialize();

      const configManager = (cm as any).configManager;
      const configDir = configManager.getConfigDir();
      expect(configDir).toBe(TEST_CONFIG_DIR);

      // Check directory exists using fs.access (will throw if not exists)
      await access(configDir);

      // Check config file exists
      const configFile = `${configDir}/config.json`;
      await access(configFile);

      // Verify default config content
      const config = await configManager.loadConfig();
      expect(config.version).toBe('1.0.0');
      expect(config.defaultProvider).toBe('openrouter');
      expect(config.maxModels).toBe(10);
    });

    it('should save and load config', async () => {
      const cm = new ClaudeModels();
      await cm.initialize();

      const configManager = (cm as any).configManager;
      const original = await configManager.loadConfig();
      expect(original.maxModels).toBe(10);

      // Modify and save
      const modified = { ...original, maxModels: 15 };
      await configManager.saveConfig(modified);

      const reloaded = await configManager.loadConfig();
      expect(reloaded.maxModels).toBe(15);
    });

    it('should log messages', async () => {
      const cm = new ClaudeModels();
      await cm.initialize();

      const configManager = (cm as any).configManager;
      await configManager.log('Test log entry');

      const logFile = configManager.getLogFile();
      const content = await Bun.file(logFile).text();
      expect(content).toContain('Test log entry');
    });
  });

  describe('OpenRouterProvider', () => {
    it('should fetch models from API', async () => {
      const { OpenRouterProvider } = await import('../src/providers/openrouter');
      const provider = new OpenRouterProvider();

      const models = await provider.fetchModels(5);

      expect(Array.isArray(models)).toBe(true);
      // Could be empty if network issue, but shouldn't throw
    });
  });

  describe('Model management', () => {
    it('should throw when getting models before update', async () => {
      const cm = new ClaudeModels();
      // Do NOT call initialize to simulate no models
      await expect(cm.getModels()).rejects.toThrow('No models found');
    });

    it('should update models from OpenRouter', async () => {
      const cm = new ClaudeModels();
      await cm.initialize();

      const models = await cm.updateModels(true, ['openrouter']);
      expect(Array.isArray(models)).toBe(true);
      // May return many models
    });

    it('should rank models by score', { timeout: 15000 }, async () => {
      const cm = new ClaudeModels();
      await cm.initialize();

      const models = await cm.updateModels(true, ['openrouter']);

      if (models.length > 1) {
        for (let i = 0; i < models.length - 1; i++) {
          expect(models[i].score).toBeGreaterThanOrEqual(models[i + 1].score);
        }
      }
    });

    it('should respect maxModels config', async () => {
      const cm = new ClaudeModels();
      await cm.initialize(); // ensure config exists

      const configManager = (cm as any).configManager;
      const current = await configManager.loadConfig();
      await configManager.saveConfig({
        ...current,
        maxModels: 5,
      });

      const models = await cm.updateModels(true, ['openrouter']);
      expect(models.length).toBeLessThanOrEqual(5);
    });
  });
});

