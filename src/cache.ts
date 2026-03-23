import { stat, readFile, writeFile, unlink, access } from 'fs/promises';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export class CacheManager {
  private cacheDir: string;
  private cacheFile: string;

  constructor(configDir: string) {
    this.cacheDir = configDir;
    this.cacheFile = `${configDir}/models.cache.json`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (!(await this.fileExists(this.cacheFile))) {
        return null;
      }

      const content = await readFile(this.cacheFile, 'utf-8');
      const cache = JSON.parse(content) as Record<string, CacheEntry<T>>;

      const entry = cache[key];
      if (!entry) {
        return null;
      }

      // Check if entry is expired
      const now = Date.now();
      if (now - entry.timestamp > entry.ttl) {
        await this.delete(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.debug('Cache read error:', error);
      return null;
    }
  }

  async set<T>(key: string, data: T, ttlMs: number = 24 * 60 * 60 * 1000): Promise<void> {
    try {
      let cache: Record<string, CacheEntry<T>> = {};

      if (await this.fileExists(this.cacheFile)) {
        const content = await readFile(this.cacheFile, 'utf-8');
        cache = JSON.parse(content);
      }

      cache[key] = {
        data,
        timestamp: Date.now(),
        ttl: ttlMs,
      };

      await writeFile(this.cacheFile, JSON.stringify(cache, null, 2), 'utf-8');
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      if (!(await this.fileExists(this.cacheFile))) {
        return;
      }

      const content = await readFile(this.cacheFile, 'utf-8');
      const cache = JSON.parse(content) as Record<string, CacheEntry<any>>;

      delete cache[key];

      if (Object.keys(cache).length === 0) {
        await unlink(this.cacheFile);
      } else {
        await writeFile(this.cacheFile, JSON.stringify(cache, null, 2), 'utf-8');
      }
    } catch (error) {
      console.debug('Cache delete error:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      if (await this.fileExists(this.cacheFile)) {
        await unlink(this.cacheFile);
      }
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  async getStats(): Promise<{ entries: number; size: number }> {
    try {
      if (!(await this.fileExists(this.cacheFile))) {
        return { entries: 0, size: 0 };
      }

      const content = await readFile(this.cacheFile, 'utf-8');
      const cache = JSON.parse(content);
      const stats = await stat(this.cacheFile);

      return {
        entries: Object.keys(cache).length,
        size: stats.size,
      };
    } catch {
      return { entries: 0, size: 0 };
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
}
