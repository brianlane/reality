/**
 * Simple in-memory rate limiter
 * For production with multiple instances, upgrade to Redis-based solution
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

/**
 * NOTE: Stale entries will remain in memory until their resetAt time is checked
 * during the next request. This is acceptable for single-instance development.
 *
 * IMPORTANT: In serverless environments (Vercel/AWS Lambda), module-level setInterval
 * causes memory leaks and unpredictable behavior as each invocation may load the module fresh.
 *
 * For production with multiple instances, upgrade to Redis-based rate limiting.
 */

export type RateLimitConfig = {
  interval: number; // in milliseconds
  maxRequests: number;
};

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

export function rateLimit(
  identifier: string,
  config: RateLimitConfig,
): RateLimitResult {
  const now = Date.now();

  // Opportunistic cleanup: Remove a few expired entries on each request
  // This prevents unbounded growth without the serverless issues of setInterval
  let cleaned = 0;
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key);
      cleaned++;
      if (cleaned >= 10) break; // Limit cleanup work per request
    }
  }

  const entry = store.get(identifier);

  if (!entry || entry.resetAt < now) {
    // Create new entry or reset expired one
    store.set(identifier, {
      count: 1,
      resetAt: now + config.interval,
    });

    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      reset: now + config.interval,
    };
  }

  // Increment existing entry
  entry.count++;

  if (entry.count > config.maxRequests) {
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      reset: entry.resetAt,
    };
  }

  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - entry.count,
    reset: entry.resetAt,
  };
}

// Predefined rate limit configs
export const RATE_LIMITS = {
  // Strict limits for auth endpoints
  AUTH: { interval: 15 * 60 * 1000, maxRequests: 5 }, // 5 requests per 15 minutes
  // Moderate limits for API endpoints
  API: { interval: 60 * 1000, maxRequests: 60 }, // 60 requests per minute
  // Generous limits for file uploads
  UPLOAD: { interval: 60 * 1000, maxRequests: 10 }, // 10 uploads per minute
  // Very strict for webhooks (internal only)
  WEBHOOK: { interval: 60 * 1000, maxRequests: 100 }, // 100 per minute
} as const;
