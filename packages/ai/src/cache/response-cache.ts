// Using a simple counter for demo purposes
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const requestCounter = 0;

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl?: number; // Time to live in milliseconds
  metadata?: Record<string, any>;
}

export interface ResponseCacheConfig {
  maxSize?: number;
  defaultTTL?: number; // Default TTL in milliseconds
  cleanupInterval?: number; // Cleanup interval in milliseconds
}

export class ResponseCache<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private readonly maxSize: number;
  private readonly defaultTTL: number;
  // Marked as used to prevent unused warning
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private cleanupInterval: NodeJS.Timeout | null = null;
  private accessTimes: Map<string, number> = new Map();

  constructor(config: ResponseCacheConfig = {}) {
    this.cache = new Map();
    this.maxSize = config.maxSize || 1000;
    this.defaultTTL = config.defaultTTL || 60 * 60 * 1000; // 1 hour default
    
    // Only set up cleanup in non-test environments
    if (process.env.NODE_ENV !== 'test' && config.cleanupInterval && config.cleanupInterval > 0) {
      this.cleanupInterval = setInterval(() => this.cleanup(), config.cleanupInterval).unref();
    }
  }

  /**
   * Generate a cache key from the request parameters
   */
  generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${JSON.stringify(params[key])}`)
      .join('&');
    return `${prefix}:${sortedParams}`;
  }

  /**
   * Store a response in the cache
   */
  set(
    key: string,
    data: T,
    options: { ttl?: number; metadata?: Record<string, any> } = {}
  ): void {
    // Evict least recently used items if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: options.ttl ?? this.defaultTTL,
      metadata: options.metadata,
    };

    this.cache.set(key, entry);
    this.accessTimes.set(key, Date.now());
  }

  /**
   * Retrieve a response from the cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.accessTimes.delete(key);
      return undefined;
    }

    // Update last access time
    this.accessTimes.set(key, Date.now());
    return entry.data;
  }

  /**
   * Check if a key exists in the cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.accessTimes.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete an entry from the cache
   */
  delete(key: string): boolean {
    this.accessTimes.delete(key);
    return this.cache.delete(key);
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
    this.accessTimes.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.calculateHitRate(),
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        age: Date.now() - entry.timestamp,
        ttl: entry.ttl,
        size: this.getObjectSize(entry.data),
      })),
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    this.cleanupExpired();
  }

  private cleanupExpired(): void {
    const now = Date.now();
    let deletedCount = 0;
    for (const [key, entry] of this.cache.entries()) {
      const ttl = entry.ttl ?? this.defaultTTL;
      if (now - entry.timestamp > ttl) {
        this.cache.delete(key);
        this.accessTimes.delete(key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`Cleaned up ${deletedCount} expired cache entries`);
    }
  }

  /**
   * Evict the least recently used items
   */
  private evictOldest(count: number = 1): void {
    const entries = Array.from(this.accessTimes.entries())
      .sort((a, b) => a[1] - b[1])
      .slice(0, count);

    for (const [key] of entries) {
      this.cache.delete(key);
      this.accessTimes.delete(key);
    }
  }

  /**
   * Check if a cache entry has expired
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    if (!entry.ttl) return false;
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Calculate cache hit rate (for monitoring)
   */
  private calculateHitRate(): { hits: number; misses: number; rate: number } {
    let hits = 0;
    let misses = 0;

    for (const entry of this.cache.values()) {
      if (this.isExpired(entry)) {
        misses++;
      } else {
        hits++;
      }
    }

    const total = hits + misses;
    return {
      hits,
      misses,
      rate: total > 0 ? hits / total : 0,
    };
  }

  /**
   * Get the size of an object in bytes (approximate)
   */
  private getObjectSize(obj: any): number {
    if (obj === null || obj === undefined) return 0;
    
    let bytes = 0;
    
    if (typeof obj === 'string') {
      bytes = obj.length * 2; // 2 bytes per character for UTF-16
    } else if (typeof obj === 'number') {
      bytes = 8; // 8 bytes for 64-bit float
    } else if (typeof obj === 'boolean') {
      bytes = 1; // 1 byte for boolean
    } else if (obj instanceof Buffer) {
      bytes = obj.length;
    } else if (Array.isArray(obj)) {
      bytes = obj.reduce((acc, val) => acc + this.getObjectSize(val), 0);
    } else if (typeof obj === 'object') {
      bytes = Object.keys(obj).reduce(
        (acc, key) => acc + key.length * 2 + this.getObjectSize(obj[key]),
        0
      );
    }
    
    return bytes;
  }
}

// Default export with default configuration
export const defaultResponseCache = new ResponseCache();
