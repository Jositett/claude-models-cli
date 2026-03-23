import { Config, DEFAULT_CONFIG, getConfigDir } from './types.js';
import { readFile, writeFile, stat, access, mkdir } from 'fs/promises';
import { CacheManager } from './cache.js';

export class ConfigManager {
  private configDir: string;
  private configFile: string;
  private modelsFile: string;
  private providersFile: string;
  private aliasesFile: string;
  private logFile: string;
  private cacheManager: CacheManager;

  constructor() {
    this.configDir = getConfigDir();
    this.configFile = `${this.configDir}/config.json`;
    this.modelsFile = `${this.configDir}/models.json`;
    this.providersFile = `${this.configDir}/providers.json`;
    this.aliasesFile = `${this.configDir}/aliases.sh`;
    this.logFile = `${this.configDir}/activity.log`;
    this.cacheManager = new CacheManager(this.configDir);
  }

  getConfigDir(): string {
    return this.configDir;
  }

  getModelsFile(): string {
    return this.modelsFile;
  }

  getAliasesFile(): string {
    return this.aliasesFile;
  }

  getLogFile(): string {
    return this.logFile;
  }

  getCacheManager(): CacheManager {
    return this.cacheManager;
  }

  async initialize(): Promise<Config> {
    // Ensure config directory exists
    try {
      await mkdir(this.configDir, { recursive: true });
    } catch (error: any) {
      // EEXIST is fine - directory already exists
      if (error?.code !== 'EEXIST' && !(await this.dirExists(this.configDir))) {
        console.error('Failed to create config directory:', error);
        throw error;
      }
    }

    // Create default config if not exists
    if (!(await this.fileExists(this.configFile))) {
      await this.saveConfig(DEFAULT_CONFIG);
      return DEFAULT_CONFIG;
    }

    const config = await this.loadConfig();
    return config;
  }

  async loadConfig(): Promise<Config> {
    try {
      const content = await readFile(this.configFile, 'utf-8');
      return JSON.parse(content) as Config;
    } catch (error) {
      console.error('Failed to load config:', error);
      return DEFAULT_CONFIG;
    }
  }

  async saveConfig(config: Config): Promise<void> {
    await writeFile(this.configFile, JSON.stringify(config, null, 2), 'utf-8');
  }

  async loadModels(): Promise<any[] | null> {
    try {
      if (!(await this.fileExists(this.modelsFile))) {
        return null;
      }
      const content = await readFile(this.modelsFile, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to load models:', error);
      return null;
    }
  }

  async saveModels(models: any[]): Promise<void> {
    await writeFile(this.modelsFile, JSON.stringify(models, null, 2), 'utf-8');
  }

  async shouldUpdate(updateIntervalHours: number): Promise<boolean> {
    if (!(await this.fileExists(this.modelsFile))) {
      return true;
    }

    try {
      const stats = await stat(this.modelsFile);
      const hoursSince = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
      return hoursSince >= updateIntervalHours;
    } catch {
      return true;
    }
  }

  async log(message: string): Promise<void> {
    // Ensure log file exists
    if (!(await this.fileExists(this.logFile))) {
      try {
        await writeFile(this.logFile, '');
      } catch {
        // Directory might not exist, but that's okay
      }
    }

    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const logMessage = `[${timestamp}] ${message}\n`;

    try {
      // Append to file
      await writeFile(this.logFile, logMessage, { encoding: 'utf-8', flag: 'a' });
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  }

  private async dirExists(path: string): Promise<boolean> {
    try {
      const stats = await stat(path);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }
}
