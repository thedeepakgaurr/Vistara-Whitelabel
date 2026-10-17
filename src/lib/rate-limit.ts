import { pool } from './db';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfterSeconds?: number;
}

/**
 * MySQL-backed rate limiter.
 * Uses atomic INSERT ... ON DUPLICATE KEY UPDATE so request counts survive
 * PM2 restarts and deployments without requiring Redis.
 *
 * @param userId - ID of the calling user
 * @param limit - Maximum requests permitted in the 60-second window (default 100)
 */
export async function checkRateLimit(userId: number, limit = 100): Promise<RateLimitResult> {
  const nowMs = Date.now();
  const nowEpochSec = Math.floor(nowMs / 1000);
  // Current 60-second window start in seconds
  const windowStart = Math.floor(nowEpochSec / 60) * 60;
  // Window resets at the beginning of the next minute
  const resetTime = windowStart + 60;
  const retryAfterSeconds = Math.max(1, resetTime - nowEpochSec);

  try {
    // 1. Atomically record or increment the counter for this window
    await pool.query(
      `INSERT INTO api_rate_limits (user_id, window_start, request_count)
       VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE request_count = request_count + 1`,
      [userId, windowStart]
    );

    // 2. Read the current count
    const [rows] = await pool.query(
      'SELECT request_count FROM api_rate_limits WHERE user_id = ? AND window_start = ? LIMIT 1',
      [userId, windowStart]
    );

    const count = Number((rows as { request_count: number }[])[0]?.request_count ?? 1);
    const allowed = count <= limit;
    const remaining = Math.max(0, limit - count);

    // 3. Asynchronously prune old window records older than 10 minutes (fire-and-forget)
    pool.query('DELETE FROM api_rate_limits WHERE window_start < ?', [windowStart - 600]).catch(() => {});

    return {
      allowed,
      remaining,
      resetTime,
      ...(allowed ? {} : { retryAfterSeconds }),
    };
  } catch (err) {
    console.error('[RATE-LIMIT] Error checking rate limit in MySQL, failing open:', err);
    // On unexpected DB failure, fail open to avoid dropping production API calls
    return {
      allowed: true,
      remaining: limit,
      resetTime,
    };
  }
}
