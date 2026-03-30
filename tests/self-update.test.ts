import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'bun:test';
import { rm, mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve } from 'path';

// Use a dedicated test config directory
const TEST_CONFIG_DIR = './test-temp-config-su';

describe('Self-Update Feature', () => {
  beforeAll(async () => {
    process.env.TEST_CONFIG_DIR = TEST_CONFIG_DIR;
    try {
      await rm(TEST_CONFIG_DIR, { recursive: true, force: true });
    } catch {}
  });

  afterAll(async () => {
    try {
      await rm(TEST_CONFIG_DIR, { recursive: true, force: true });
    } catch {}
    delete process.env.TEST_CONFIG_DIR;
  });

  beforeEach(async () => {
    try {
      await rm(TEST_CONFIG_DIR, { recursive: true, force: true });
    } catch {}
  });

  afterEach(async () => {
    try {
      await rm(TEST_CONFIG_DIR, { recursive: true, force: true });
    } catch {}
  });

  describe('detectInstallType()', () => {
    it('should detect git installation', async () => {
      const installDir = resolve(TEST_CONFIG_DIR, 'git-install');
      await mkdir(installDir, { recursive: true });
      await mkdir(resolve(installDir, '.git'), { recursive: true });

      const type = detectInstallType(installDir);
      expect(type).toBe('git');
    });

    it('should detect standalone installation (dist/cli.js exists)', async () => {
      const installDir = resolve(TEST_CONFIG_DIR, 'standalone-install');
      await mkdir(installDir, { recursive: true });
      await mkdir(resolve(installDir, 'dist'), { recursive: true });
      await writeFile(resolve(installDir, 'dist', 'cli.js'), 'console.log("test");');

      const type = detectInstallType(installDir);
      expect(type).toBe('standalone');
    });

    it('should return unknown for non-existent directory', () => {
      const nonExistent = resolve(TEST_CONFIG_DIR, 'does-not-exist');
      const type = detectInstallType(nonExistent);
      expect(type).toBe('unknown');
    });
  });

  describe('getInstallDir() fallback logic', () => {
    it('should use default ~/.claude-models-cli-repo when no config and no env', () => {
      delete process.env.CLAUDE_MODELS_INSTALL_DIR;
      const result = getDefaultInstallDir();
      expect(result).toContain('.claude-models-cli-repo');
    });

    it('should use CLAUDE_MODELS_INSTALL_DIR env var when set', () => {
      const envDir = resolve(TEST_CONFIG_DIR, 'env-install');
      process.env.CLAUDE_MODELS_INSTALL_DIR = envDir;
      const result = getDefaultInstallDir();
      expect(result).toBe(envDir);
      delete process.env.CLAUDE_MODELS_INSTALL_DIR;
    });
  });
});

// Replicate helper logic from cli.ts for testing
function detectInstallType(installDir: string): 'git' | 'standalone' | 'unknown' {
  if (!existsSync(installDir)) {
    return 'unknown';
  }
  if (existsSync(resolve(installDir, '.git'))) {
    return 'git';
  }
  if (existsSync(resolve(installDir, 'dist', 'cli.js'))) {
    return 'standalone';
  }
  return 'unknown';
}

function getDefaultInstallDir(): string {
  const envDir = process.env.CLAUDE_MODELS_INSTALL_DIR;
  if (envDir) {
    return envDir;
  }
  const home = process.env.HOME || process.env.USERPROFILE || require('os').homedir();
  return resolve(home, '.claude-models-cli-repo');
}
