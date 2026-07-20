interface RateLimitWindow {
  timestamps: number[];
}

class RateLimiterManager {
  private ipWindows = new Map<string, RateLimitWindow>();

  /**
   * Helper to clean up old timestamps
   */
  private cleanup(now: number, windowMs: number) {
    if (this.ipWindows.size > 5000) {
      for (const [ip, data] of this.ipWindows.entries()) {
        const valid = data.timestamps.filter(ts => now - ts < windowMs);
        if (valid.length === 0) {
          this.ipWindows.delete(ip);
        } else {
          data.timestamps = valid;
        }
      }
    }
  }

  /**
   * Checks whether a request from the given IP address is allowed under the rate limit.
   */
  check(
    ip: string,
    routeType: 'payment' | 'auth' | 'general' = 'general'
  ): { allowed: boolean; limit: number; remaining: number; retryAfterSeconds: number } {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window

    // Limits per route type
    let limit = 120;
    if (routeType === 'payment') limit = 15;
    else if (routeType === 'auth') limit = 25;

    const key = `${routeType}:${ip}`;
    this.cleanup(now, windowMs);

    let windowData = this.ipWindows.get(key);
    if (!windowData) {
      windowData = { timestamps: [] };
      this.ipWindows.set(key, windowData);
    }

    // Filter out timestamps outside the sliding window
    windowData.timestamps = windowData.timestamps.filter(ts => now - ts < windowMs);

    if (windowData.timestamps.length >= limit) {
      const oldestTimestamp = windowData.timestamps[0];
      const retryAfterMs = windowMs - (now - oldestTimestamp);
      const retryAfterSeconds = Math.ceil(Math.max(1, retryAfterMs / 1000));

      return {
        allowed: false,
        limit,
        remaining: 0,
        retryAfterSeconds
      };
    }

    windowData.timestamps.push(now);
    const remaining = limit - windowData.timestamps.length;

    return {
      allowed: true,
      limit,
      remaining,
      retryAfterSeconds: 0
    };
  }

  /**
   * Helper to extract client IP from Request headers
   */
  getClientIp(request: Request): string {
    const cfIp = request.headers.get('cf-connecting-ip');
    if (cfIp) return cfIp.trim();

    const xForwardedFor = request.headers.get('x-forwarded-for');
    if (xForwardedFor) {
      return xForwardedFor.split(',')[0].trim();
    }

    const realIp = request.headers.get('x-real-ip');
    if (realIp) return realIp.trim();

    return '127.0.0.1';
  }
}

export const RateLimiter = new RateLimiterManager();
