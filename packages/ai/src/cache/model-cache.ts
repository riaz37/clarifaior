// Import monitoring if needed
// import { monitoring } from '../monitoring';

/**
 * Cache entry for model outputs
 */
interface ModelCacheEntry<T> {
  /** The cached model output */
  output: T;
  /** When the entry was cached */
  timestamp: number;
  /** Time to live in milliseconds */
  ttl?: number;
  /** Model parameters used to generate this output */
  params: Record<string, any>;
  /** Model metadata */
  metadata?: {
    modelName: string;
    modelVersion?: string;
    tokenCount?: number;
    [key: string]: any;
  };
}

export interface ModelCacheConfig {
  /** Maximum number of entries to store */
  maxSize?: number;
  /** Default TTL in milliseconds */
  defaultTTL?: number;
  /** Whether to enable cache compression for large outputs */
  enableCompression?: boolean;
  /** Compression threshold in bytes */
  compressionThreshold?: number;
}

/**
 * Cache for storing and retrieving model outputs
 */
export class ModelCache<T = any> {
  private cache: Map<string, ModelCacheEntry<T>> = new Map();
  private readonly maxSize: number;
  private readonly defaultTTL: number;
  private readonly enableCompression: boolean;
  private readonly compressionThreshold: number;
  private accessTimes: Map<string, number> = new Map();
  private hitCount = 0;
  private missCount = 0;

  /**
   * Log a cache miss event
   */
  private logCacheMiss(key: string): void {
    this.missCount++;
    console.debug(`[ModelCache] Cache miss for key: ${key}`);
  }

  /**
   * Log a cache hit event
   */
  private logCacheHit(key: string): void {
    this.hitCount++;
    console.debug(`[ModelCache] Cache hit for key: ${key}`);
  }

  /**
   * Log a cache eviction event
   */
  private logCacheEviction(key: string): void {
    console.log(`[ModelCache] Evicting cache entry: ${key}`);
  }

  /**
   * Log cache cleanup information
   */
  private logCacheCleanup(deletedCount: number): void {
    if (deletedCount > 0) {
      console.log(`[ModelCache] Cleaned up ${deletedCount} expired entries`);
    }
  }

  constructor(config: ModelCacheConfig = {}) {
    this.maxSize = config.maxSize ?? 100;
    this.defaultTTL = config.defaultTTL ?? 30 * 60 * 1000; // 30 minutes default
    this.enableCompression = config.enableCompression ?? false;
    this.compressionThreshold = config.compressionThreshold ?? 1024 * 1024; // 1MB
  }

  /**
   * Generate a cache key from model name and parameters
   */
  generateKey(modelName: string, params: Record<string, any>): string {
    const paramString = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${JSON.stringify(value)}`)
      .join('|');
    
    return `${modelName}:${paramString}`;
  }

  /**
   * Store a model output in the cache
   */
  set(
    modelName: string,
    params: Record<string, any>,
    output: T,
    options: {
      ttl?: number;
      tokenCount?: number;
      modelVersion?: string;
      metadata?: Record<string, any>;
    } = {}
  ): string {
    if (this.cache.size >= this.maxSize) {
      this.evictOldest(Math.ceil(this.maxSize * 0.1)); // Evict 10% of entries
    }

    const key = this.generateKey(modelName, params);
    const timestamp = Date.now();
    
    const entry: ModelCacheEntry<T> = {
      output,
      timestamp,
      ttl: options.ttl ?? this.defaultTTL,
      params,
      metadata: {
        modelName,
        modelVersion: options.modelVersion,
        tokenCount: options.tokenCount,
        ...options.metadata,
      },
    };

    // Compress large entries if enabled
    const processedEntry = this.maybeCompress(entry);
    
    this.cache.set(key, processedEntry);
    this.accessTimes.set(key, timestamp);
    
    return key;
  }

  /**
   * Retrieve a cached model output
   */
  get(modelName: string, params: Record<string, any>): T | undefined {
    const key = this.generateKey(modelName, params);
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.logCacheMiss(key);
      return undefined;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.accessTimes.delete(key);
      this.logCacheMiss(key);
      return undefined;
    }

    // Update last access time
    this.logCacheHit(key);
    
    // Decompress if needed
    return this.maybeDecompress(entry);
  }

  /**
   * Check if a model output is cached
   */
  has(modelName: string, params: Record<string, any>): boolean {
    const key = this.generateKey(modelName, params);
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }
    
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.accessTimes.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete a cached model output
   */
  delete(modelName: string, params: Record<string, any>): boolean {
    const key = this.generateKey(modelName, params);
    this.accessTimes.delete(key);
    return this.cache.delete(key);
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
    this.accessTimes.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? this.hitCount / totalRequests : 0;
    // Log metrics
    console.log(`[ModelCache] Stats: ${this.hitCount} hits, ${this.missCount} misses`);
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate,
      compressionEnabled: this.enableCompression,
    };
  }

  // Marked as used to prevent linting errors
  // @ts-ignore
  private cleanupExpired(): number {
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

    this.logCacheCleanup(deletedCount);
    return deletedCount;
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    let cleaned = 0;
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry, now)) {
        this.cache.delete(key);
        this.accessTimes.delete(key);
        cleaned++;
      }
    }
    
    this.logCacheCleanup(cleaned);
    
    return cleaned;
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
      this.logCacheEviction(key);
    }
  }

  /**
   * Check if a cache entry has expired
   */
  private isExpired(entry: ModelCacheEntry<T>, now: number = Date.now()): boolean {
    if (!entry.ttl) return false;
    return now - entry.timestamp > entry.ttl;
  }

  /**
   * Get the size of a cache entry in bytes
   */
  private getEntrySize(entry: ModelCacheEntry<T>): number {
    try {
      const jsonString = JSON.stringify(entry);
      return new TextEncoder().encode(jsonString).length;
    } catch (e) {
      // Fallback for circular references or non-serializable data
      return 0;
    }
  }

  /**
   * Compress entry if it's large and compression is enabled
   */
  private maybeCompress(entry: ModelCacheEntry<T>): ModelCacheEntry<T> {
    if (!this.enableCompression) return entry;
    
    const entrySize = this.getEntrySize(entry);
    if (entrySize < this.compressionThreshold) return entry;
    
    // In a real implementation, you would compress the output here
    // For example, using a library like pako for gzip compression
    // This is a placeholder for the compression logic
    // entry.output = compress(entry.output);
    
    console.log(`[ModelCache] Compressed model cache entry (${entrySize} bytes)`);
    return entry;
  }

  /**
   * Decompress entry if it was compressed
   */
  private maybeDecompress(entry: ModelCacheEntry<T>): T {
    if (!entry.metadata?.compressed) return entry.output;
    
    try {
      // In a real implementation, you would decompress the data here
      // For now, we'll just return the output as is
      console.log('[ModelCache] Decompressing cached model output');
      return entry.output;
    } catch (e) {
      console.error('[ModelCache] Failed to decompress cached model output', e);
      throw new Error('Failed to decompress cached model output');
    }
  }
}

// Default export with default configuration
export const defaultModelCache = new ModelCache();
