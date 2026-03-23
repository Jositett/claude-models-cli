import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { retryWithBackoff } from '../src/utils/retry';

describe('Retry Logic', () => {
  beforeEach(() => {
    // Reset any state if needed
  });

  it('should succeed on first try', async () => {
    let callCount = 0;
    const result = await retryWithBackoff(() => {
      callCount++;
      return Promise.resolve('success');
    });

    expect(result).toBe('success');
    expect(callCount).toBe(1);
  });

  it('should retry on 429 and eventually succeed', async () => {
    let callCount = 0;
    const result = await retryWithBackoff(() => {
      callCount++;
      if (callCount < 3) {
        const error: any = new Error('Rate limited');
        error.status = 429;
        throw error;
      }
      return Promise.resolve('success');
    }, { maxAttempts: 3 });

    expect(result).toBe('success');
    expect(callCount).toBe(3);
  });

  it('should throw after max attempts on 5xx', async () => {
    let callCount = 0;
    const error: any = new Error('Server error');
    error.status = 500;

    await expect(
      retryWithBackoff(() => {
        callCount++;
        throw error;
      }, { maxAttempts: 3 })
    ).rejects.toThrow(error);

    expect(callCount).toBe(3);
  });

  it('should not retry on 401 error', async () => {
    let callCount = 0;
    const error: any = new Error('Unauthorized');
    error.status = 401;

    await expect(
      retryWithBackoff(() => {
        callCount++;
        throw error;
      }, { maxAttempts: 3 })
    ).rejects.toThrow(error);

    expect(callCount).toBe(1); // Only called once, no retries
  });

  it('should use exponential backoff with jitter', async () => {
    let callCount = 0;
    const startTime = Date.now();

    await retryWithBackoff(() => {
      callCount++;
      if (callCount < 2) {
        const error: any = new Error('Rate limited');
        error.status = 429;
        throw error;
      }
      return Promise.resolve('success');
    }, { maxAttempts: 2, baseDelayMs: 10, maxDelayMs: 100 });

    const elapsed = Date.now() - startTime;
    // Should have waited at least baseDelayMs (10ms) plus jitter
    expect(callCount).toBe(2);
    expect(elapsed).toBeGreaterThanOrEqual(10);
  });
});
