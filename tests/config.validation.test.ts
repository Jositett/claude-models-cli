import { describe, it, expect } from 'bun:test';
import { validateConfig, loadAndValidateConfig } from '../src/config/validation.js';

describe('Config Validation', () => {
  it('should accept valid config', () => {
    const config = {
      version: '1.0.0',
      defaultProvider: 'openrouter',
      autoUpdate: true,
      updateIntervalHours: 24,
      maxModels: 10,
      preferredContext: 'coding',
      rateLimitHandling: 'rotate',
      logActivity: true,
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should accept empty config and use defaults', () => {
    const result = validateConfig({});
    expect(result.valid).toBe(true);
  });

  it('should reject invalid maxModels type', () => {
    const config = { maxModels: 'ten' };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'maxModels' && e.message.includes('must be a number'))).toBe(true);
  });

  it('should reject maxModels out of range', () => {
    const config = { maxModels: 150 };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'maxModels' && e.message.includes('between 1 and 100'))).toBe(true);
  });

  it('should reject invalid rateLimitHandling', () => {
    const config = { rateLimitHandling: 'fast' };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'rateLimitHandling' && e.message.includes('not a valid option'))).toBe(true);
  });

  it('should reject invalid defaultProvider', () => {
    const config = { defaultProvider: 'openai' };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'defaultProvider' && e.message.includes('not a valid provider'))).toBe(true);
  });

  it('should accept valid providers: openrouter, ollama, huggingface', () => {
    const validProviders = ['openrouter', 'ollama', 'huggingface'];
    for (const provider of validProviders) {
      const config = { defaultProvider: provider };
      const result = validateConfig(config);
      expect(result.valid).toBe(true);
    }
  });

  it('should reject autoUpdate if not boolean', () => {
    const config = { autoUpdate: 'yes' };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'autoUpdate' && e.message.includes('must be a boolean'))).toBe(true);
  });

  it('should validate updateIntervalHours range', () => {
    const config1 = { updateIntervalHours: 0 };
    let result = validateConfig(config1);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'updateIntervalHours' && e.message.includes('between 1 and 720'))).toBe(true);

    const config2 = { updateIntervalHours: 800 };
    result = validateConfig(config2);
    expect(result.valid).toBe(false);
  });

  it('should validate providers object structure', () => {
    const config = { providers: 'not an object' };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'providers' && e.message.includes('must be an object'))).toBe(true);
  });

  it('should validate nested provider config', () => {
    const config = {
      providers: {
        openrouter: {
          enabled: 'yes', // should be boolean
          priority: 15, // should be 1-10
        },
      },
    };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field.includes('enabled') && e.message.includes('must be a boolean'))).toBe(true);
    expect(result.errors.some(e => e.field.includes('priority') && e.message.includes('between 1 and 10'))).toBe(true);
  });

  it('loadAndValidateConfig should normalize valid config', () => {
    const config = {
      maxModels: 20,
      rateLimitHandling: 'fail',
    };
    const normalized = loadAndValidateConfig(config);
    expect(normalized.maxModels).toBe(20);
    expect(normalized.rateLimitHandling).toBe('fail');
    expect(normalized.version).toBe('1.0.0'); // default applied
  });

  it('loadAndValidateConfig should throw on invalid', () => {
    const config = { maxModels: -1 };
    expect(() => loadAndValidateConfig(config)).toThrow();
  });
});
