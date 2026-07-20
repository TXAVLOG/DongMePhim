interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class CacheServiceManager {
  private store = new Map<string, CacheEntry<any>>();

  /**
   * Gets an item from cache if present and not expired.
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  /**
   * Sets an item in cache with a TTL (in milliseconds).
   */
  set<T>(key: string, value: T, ttlMs: number = 60 * 1000): void {
    // Limit memory usage by cleaning up when cache gets large
    if (this.store.size > 2000) {
      const now = Date.now();
      for (const [k, v] of this.store.entries()) {
        if (now > v.expiresAt) {
          this.store.delete(k);
        }
      }
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs
    });
  }

  /**
   * Wrapper function: returns cached value or executes fetcher and caches the result.
   */
  async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttlMs: number = 60 * 1000): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const value = await fetcher();
    if (value !== null && value !== undefined) {
      this.set(key, value, ttlMs);
    }
    return value;
  }

  /**
   * Deletes a specific cache key.
   */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Invalidates all cache keys matching a prefix or regex pattern.
   */
  invalidatePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(`^${pattern.replace('*', '.*')}`) : pattern;
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clears entire cache.
   */
  clear(): void {
    this.store.clear();
  }
}

export const CacheService = new CacheServiceManager();
