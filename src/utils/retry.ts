/**
 * Retry logic with exponential backoff for transient failures
 */

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: any, attempt: number) => boolean;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  shouldRetry: defaultShouldRetry,
};

/**
 * Determines if an error should trigger a retry
 */
function defaultShouldRetry(error: any, attempt: number): boolean {
  // If we've exhausted max attempts, don't retry
  if (attempt >= (DEFAULT_OPTIONS.maxAttempts || 3) - 1) {
    return false;
  }

  // Network errors (fetch failed, no response)
  if (error.message?.includes('network') || error.message?.includes('ECONNREFUSED')) {
    return true;
  }

  // HTTP errors that are transient
  if (error.status) {
    // Rate limit (429) - always retry
    if (error.status === 429) {
      return true;
    }
    // Server errors (5xx) - retry
    if (error.status >= 500 && error.status < 600) {
      return true;
    }
    // Client errors (4xx) except 429 - don't retry (auth, validation, etc.)
    if (error.status >= 400 && error.status < 500) {
      return false;
    }
  }

  // Timeout errors
  if (error.message?.includes('timeout') || error.message?.includes('abort')) {
    return true;
  }

  return false;
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  const jitter = exponentialDelay * 0.1 * Math.random(); // ±10% jitter
  const delay = Math.min(exponentialDelay + jitter, maxDelayMs);
  return Math.floor(delay);
}

/**
 * Retry an async function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (!opts.shouldRetry!(error, attempt)) {
        throw error;
      }

      // Don't wait after the last attempt
      if (attempt >= opts.maxAttempts! - 1) {
        break;
      }

      const delayMs = calculateDelay(attempt, opts.baseDelayMs!, opts.maxDelayMs!);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

/**
 * Specialized retry for OpenRouter API with their specific error codes
 */
export function shouldRetryOpenRouter(error: any, attempt: number): boolean {
  // Rate limits (429) - always retry, but with awareness
  if (error.status === 429) {
    return true;
  }

  // OpenRouter specific: 402 (insufficient credits) - don't retry
  if (error.status === 402) {
    return false;
  }

  // 401 (unauthorized) - don't retry
  if (error.status === 401) {
    return false;
  }

  // 404 (model not found) - don't retry
  if (error.status === 404) {
    return false;
  }

  // 400 (bad request) - usually don't retry unless it's a timeout
  if (error.status === 400 && !error.message?.includes('max_tokens')) {
    return false;
  }

  // For other errors, use default logic
  return defaultShouldRetry(error, attempt);
}
