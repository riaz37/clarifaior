import { MemoryStoreOptions } from './base/memory-store-options';

export interface VectorMemoryOptions extends MemoryStoreOptions {
  /** Number of dimensions in the vector */
  dimensions: number;
  
  /** Similarity threshold for vector search (0-1) */
  similarityThreshold?: number;
  
  /** Whether to normalize vectors during storage and search */
  normalizeVectors?: boolean;
  
  /** Distance metric to use for vector search */
  distanceMetric?: 'cosine' | 'euclidean' | 'dot';
}
