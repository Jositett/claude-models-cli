import { Config, DEFAULT_CONFIG } from '../types.js';

export interface ValidationError {
  field: string;
  message: string;
  suggestion?: string;
}

export function validateConfig(config: any): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  // If config is null/undefined, use defaults
  if (!config || typeof config !== 'object') {
    return { valid: true, errors: [] }; // Will use defaults
  }

  // Validate version (should be string)
  if (config.version !== undefined && typeof config.version !== 'string') {
    errors.push({
      field: 'version',
      message: 'must be a string',
      suggestion: `Set to "${DEFAULT_CONFIG.version}" or your desired version`,
    });
  }

  // Validate defaultProvider
  if (config.defaultProvider !== undefined) {
    if (typeof config.defaultProvider !== 'string') {
      errors.push({
        field: 'defaultProvider',
        message: 'must be a string',
        suggestion: `Valid providers: openrouter, ollama, huggingface`,
      });
    } else {
      const allowed = ['openrouter', 'ollama', 'huggingface'];
      if (!allowed.includes(config.defaultProvider)) {
        errors.push({
          field: 'defaultProvider',
          message: `"${config.defaultProvider}" is not a valid provider`,
          suggestion: `Use one of: ${allowed.join(', ')}`,
        });
      }
    }
  }

  // Validate autoUpdate
  if (config.autoUpdate !== undefined && typeof config.autoUpdate !== 'boolean') {
    errors.push({
      field: 'autoUpdate',
      message: 'must be a boolean (true or false)',
      suggestion: `Set to true to enable automatic model updates, false to disable`,
    });
  }

  // Validate updateIntervalHours
  if (config.updateIntervalHours !== undefined) {
    if (typeof config.updateIntervalHours !== 'number' || isNaN(config.updateIntervalHours)) {
      errors.push({
        field: 'updateIntervalHours',
        message: 'must be a number',
        suggestion: `Hours between model updates (1-720, default: ${DEFAULT_CONFIG.updateIntervalHours})`,
      });
    } else if (config.updateIntervalHours < 1 || config.updateIntervalHours > 720) {
      errors.push({
        field: 'updateIntervalHours',
        message: `must be between 1 and 720 (got ${config.updateIntervalHours})`,
        suggestion: `24 hours is recommended for daily updates`,
      });
    }
  }

  // Validate maxModels
  if (config.maxModels !== undefined) {
    if (typeof config.maxModels !== 'number' || isNaN(config.maxModels)) {
      errors.push({
        field: 'maxModels',
        message: 'must be a number',
        suggestion: `Number of top models to keep (1-100, default: ${DEFAULT_CONFIG.maxModels})`,
      });
    } else if (config.maxModels < 1 || config.maxModels > 100) {
      errors.push({
        field: 'maxModels',
        message: `must be between 1 and 100 (got ${config.maxModels})`,
        suggestion: `10 is a good default for most users`,
      });
    }
  }

  // Validate preferredContext
  if (config.preferredContext !== undefined) {
    if (typeof config.preferredContext !== 'string') {
      errors.push({
        field: 'preferredContext',
        message: 'must be a string',
        suggestion: `Common values: "coding", "chat", "balanced" (default: "${DEFAULT_CONFIG.preferredContext}")`,
      });
    }
  }

  // Validate rateLimitHandling
  if (config.rateLimitHandling !== undefined) {
    const allowed = ['rotate', 'fail', 'retry'];
    if (!allowed.includes(config.rateLimitHandling)) {
      errors.push({
        field: 'rateLimitHandling',
        message: `"${config.rateLimitHandling}" is not a valid option`,
        suggestion: `Use one of: ${allowed.join(', ')}`,
      });
    }
  }

  // Validate logActivity
  if (config.logActivity !== undefined && typeof config.logActivity !== 'boolean') {
    errors.push({
      field: 'logActivity',
      message: 'must be a boolean (true or false)',
      suggestion: `Set to true to keep activity logs, false to disable`,
    });
  }

  // Validate providers object if present (optional but check structure if exists)
  if (config.providers !== undefined) {
    if (typeof config.providers !== 'object' || config.providers === null || Array.isArray(config.providers)) {
      errors.push({
        field: 'providers',
        message: 'must be an object',
        suggestion: `Provider configuration structure: {"openrouter": {"enabled": true, "priority": 1}}`,
      });
    } else {
      const allowedProviders = ['openrouter', 'ollama', 'huggingface'];
      for (const [providerName, providerConfig] of Object.entries(config.providers)) {
        if (!allowedProviders.includes(providerName)) {
          errors.push({
            field: 'providers',
            message: `Unknown provider: "${providerName}"`,
            suggestion: `Valid providers: ${allowedProviders.join(', ')}`,
          });
        } else if (providerConfig && typeof providerConfig === 'object') {
          const pConf = providerConfig as any;
          if (pConf.enabled !== undefined && typeof pConf.enabled !== 'boolean') {
            errors.push({
              field: `providers.${providerName}.enabled`,
              message: 'must be a boolean',
            });
          }
          if (pConf.priority !== undefined && (typeof pConf.priority !== 'number' || pConf.priority < 1 || pConf.priority > 10)) {
            errors.push({
              field: `providers.${providerName}.priority`,
              message: 'must be a number between 1 and 10',
            });
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Merge user config with defaults, ensuring all required fields exist
 */
export function normalizeConfig(config: any): Config {
  // If config is totally empty, return defaults
  if (!config || typeof config !== 'object') {
    return { ...DEFAULT_CONFIG };
  }

  // Merge with defaults
  const normalized: Config = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  // Ensure rateLimitHandling is one of the allowed values
  const allowed = ['rotate', 'fail', 'retry'] as const;
  if (!allowed.includes(normalized.rateLimitHandling)) {
    normalized.rateLimitHandling = DEFAULT_CONFIG.rateLimitHandling;
  }

  return normalized;
}

/**
 * Full load, validate, and normalize config
 */
export function loadAndValidateConfig(rawConfig: any): Config {
  const validation = validateConfig(rawConfig);

  if (!validation.valid) {
    const errorMessages = validation.errors.map(e => `${e.field}: ${e.message}${e.suggestion ? ` (${e.suggestion})` : ''}`);
    throw new Error(`Invalid configuration:\n${errorMessages.join('\n')}`);
  }

  return normalizeConfig(rawConfig);
}
