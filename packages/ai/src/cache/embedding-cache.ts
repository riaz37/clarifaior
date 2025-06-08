import { monitoring } from '../monitoring';

/**
 * Represents a cached embedding with metadata
 */
interface EmbeddingCacheEntry {
  /** The embedding vector */
  vector: number[];
  /** When the entry was cached */
  timestamp: number;
  /** Time to live in milliseconds */
  ttl?: number;
  /** Metadata associated with the embedding */
  metadata?: {
    sourceId?: string;
    sourceType?: string;
    modelName?: string;
    tokenCount?: number;
    [key: string]: any;
  };
}

export interface EmbeddingCacheConfig {
  /** Maximum number of embeddings to store */
  maxSize?: number;
  /** Default TTL in milliseconds */
  defaultTTL?: number;
  /** Whether to enable similarity search */
  enableSimilaritySearch?: boolean;
  /** Similarity threshold (0-1) for search */
  similarityThreshold?: number;
  /** Whether to normalize vectors for similarity search */
  normalizeVectors?: boolean;
}

/**
 * Cache for storing and retrieving embedding vectors with optional similarity search
 */
export class EmbeddingCache {
  private cache: Map<string, EmbeddingCacheEntry> = new Map();
  private readonly maxSize: number;
  private readonly defaultTTL: number;
  private readonly enableSimilaritySearch: boolean;
  private readonly similarityThreshold: number;
  private readonly normalizeVectors: boolean;
  private accessTimes: Map<string, number> = new Map();
  private hitCount = 0;
  private missCount = 0;

  constructor(config: EmbeddingCacheConfig = {}) {
    this.maxSize = config.maxSize ?? 1000;
    this.defaultTTL = config.defaultTTL ?? 24 * 60 * 60 * 1000; // 24 hours default
    this.enableSimilaritySearch = config.enableSimilaritySearch ?? true;
    this.similarityThreshold = config.similarityThreshold ?? 0.8;
    this.normalizeVectors = config.normalizeVectors ?? true;
  }

  /**
   * Store an embedding in the cache
   */
  set(
    key: string,
    vector: number[],
    options: {
      ttl?: number;
      metadata?: Record<string, any>;
    } = {}
  ): void {
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const entry: EmbeddingCacheEntry = {
      vector: this.normalizeVectors ? this.normalizeVector(vector) : [...vector],
      timestamp: Date.now(),
      ttl: options.ttl ?? this.defaultTTL,
      metadata: options.metadata,
    };

    this.cache.set(key, entry);
    this.accessTimes.set(key, Date.now());
  }

  /**
   * Retrieve an embedding from the cache
   */
  get(key: string): number[] | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.missCount++;
      return undefined;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.accessTimes.delete(key);
      this.missCount++;
      return undefined;
    }

    // Update last access time
    this.accessTimes.set(key, Date.now());
    this.hitCount++;
    
    return [...entry.vector]; // Return a copy of the vector
  }

  /**
   * Find similar embeddings using cosine similarity
   */
  findSimilar(
    queryVector: number[],
    options: {
      limit?: number;
      minSimilarity?: number;
      filter?: (metadata: Record<string, any> | undefined) => boolean;
    } = {}
  ): Array<{ key: string; similarity: number; metadata?: Record<string, any> }> {
    if (!this.enableSimilaritySearch) {
      throw new Error('Similarity search is not enabled');
    }

    const normalizedQuery = this.normalizeVector(queryVector);
    const minSimilarity = options.minSimilarity ?? this.similarityThreshold;
    const results: Array<{ key: string; similarity: number; metadata?: Record<string, any> }> = [];
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      // Skip expired entries
      if (this.isExpired(entry, now)) {
        continue;
      }

      // Apply filter if provided
      if (options.filter && !options.filter(entry.metadata)) {
        continue;
      }

      const similarity = this.cosineSimilarity(normalizedQuery, entry.vector);
      
      if (similarity >= minSimilarity) {
        results.push({
          key,
          similarity,
          metadata: entry.metadata,
        });
      }
    }

    // Sort by similarity (descending)
    results.sort((a, b) => b.similarity - a.similarity);

    // Apply limit if specified
    return options.limit ? results.slice(0, options.limit) : results;
  }

  /**
   * Delete an embedding from the cache
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
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let vectorDimensions = 0;
    let expiredCount = 0;
    
    // Calculate stats
    for (const entry of this.cache.values()) {
      if (entry.vector.length > 0) {
        vectorDimensions = entry.vector.length;
      }
      
      if (this.isExpired(entry, now)) {
        expiredCount++;
      }
    }
    
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? this.hitCount / totalRequests : 0;
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      vectorDimensions,
      hitRate,
      hits: this.hitCount,
      misses: this.missCount,
      expiredCount,
      similaritySearchEnabled: this.enableSimilaritySearch,
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > (entry.ttl || this.defaultTTL)) {
        this.cache.delete(key);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      console.log(`Cleaned up ${expiredCount} expired embedding cache entries`);
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0; // Avoid division by zero
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Normalize a vector to unit length
   */
  private normalizeVector(vector: number[]): number[] {
    if (!this.normalizeVectors) {
      return [...vector];
    }

    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (norm === 0) return [...vector]; // Return original if norm is zero
    
    return vector.map(val => val / norm);
  }

  /**
   * Check if a cache entry has expired
   */
  private isExpired(entry: EmbeddingCacheEntry, now: number = Date.now()): boolean {
    if (!entry.ttl) return false;
    return now - entry.timestamp > entry.ttl;
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
}

// Default export with default configuration
export const defaultEmbeddingCache = new EmbeddingCache();
