import { supabase } from './supabase';

interface IdempotencyRecord {
  responseData: any;
  statusCode: number;
  createdAt: number;
}

class IdempotencyServiceManager {
  private cache = new Map<string, IdempotencyRecord>();
  private readonly DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Retrieves an idempotency record if it exists and has not expired.
   */
  async check(key: string): Promise<{ isProcessed: boolean; responseData?: any; statusCode?: number } | null> {
    if (!key || !key.trim()) return null;
    const cleanKey = key.trim();

    // 1. Check in-memory fast cache
    const cached = this.cache.get(cleanKey);
    if (cached) {
      if (Date.now() - cached.createdAt < this.DEFAULT_TTL_MS) {
        return {
          isProcessed: true,
          responseData: cached.responseData,
          statusCode: cached.statusCode
        };
      } else {
        this.cache.delete(cleanKey);
      }
    }

    // 2. Fallback check to Supabase database (txa_idempotency_keys table)
    try {
      const { data, error } = await supabase
        .from('txa_idempotency_keys')
        .select('response_data, status_code, created_at')
        .eq('idempotency_key', cleanKey)
        .maybeSingle();

      if (!error && data) {
        const createdAt = new Date(data.created_at).getTime();
        if (Date.now() - createdAt < this.DEFAULT_TTL_MS) {
          // Sync into memory cache
          this.cache.set(cleanKey, {
            responseData: data.response_data,
            statusCode: data.status_code || 200,
            createdAt
          });

          return {
            isProcessed: true,
            responseData: data.response_data,
            statusCode: data.status_code || 200
          };
        }
      }
    } catch (err) {
      console.warn('[IdempotencyService] Supabase check warning:', err);
    }

    return null;
  }

  /**
   * Saves an idempotency record to both memory cache and database.
   */
  async save(key: string, responseData: any, statusCode: number = 200, ttlMs: number = this.DEFAULT_TTL_MS): Promise<void> {
    if (!key || !key.trim()) return;
    const cleanKey = key.trim();
    const now = Date.now();

    // 1. Store in memory cache
    this.cache.set(cleanKey, {
      responseData,
      statusCode,
      createdAt: now
    });

    // 2. Persist to Supabase database asynchronously
    try {
      await supabase.from('txa_idempotency_keys').upsert({
        idempotency_key: cleanKey,
        response_data: responseData,
        status_code: statusCode,
        created_at: new Date(now).toISOString()
      }, { onConflict: 'idempotency_key' });
    } catch (err) {
      console.warn('[IdempotencyService] Supabase save warning:', err);
    }
  }

  /**
   * Extracts Idempotency Key from Request headers or body payload.
   */
  extractKey(request: Request, body?: any): string | null {
    const headerKey = request.headers.get('x-idempotency-key') ||
                      request.headers.get('X-Idempotency-Key') ||
                      request.headers.get('idempotency-key') ||
                      request.headers.get('Idempotency-Key');

    if (headerKey && headerKey.trim()) {
      return headerKey.trim();
    }

    if (body) {
      if (typeof body.idempotencyKey === 'string' && body.idempotencyKey.trim()) {
        return body.idempotencyKey.trim();
      }
      if (typeof body.txid === 'string' && body.txid.trim()) {
        return `txid_${body.txid.trim()}`;
      }
    }

    return null;
  }
}

export const IdempotencyService = new IdempotencyServiceManager();
