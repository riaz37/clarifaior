import { BaseMemory } from './base/base-memory';
import { MemoryData, MemorySearchResult, MemoryStoreOptions } from './base/memory-interface';

export interface VectorMemoryOptions extends MemoryStoreOptions {
  /**
   * Dimensionality of the vector embeddings
   */
  dimensions: number;
  
  /**
   * Similarity metric to use (cosine, euclidean, dot)
   */
  similarity?: 'cosine' | 'euclidean' | 'dot';
  
  /**
   * Whether to normalize vectors (recommended for cosine similarity)
   */
  normalizeVectors?: boolean;
}

export interface VectorMemoryData<T = unknown> {
  /**
   * The content being stored
   */
  content: T;
  
  /**
   * The vector embedding for the content
   */
  vector: number[];
  
  /**
   * Optional metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Memory store that supports vector similarity search
 */
export class VectorMemory<T = unknown> extends BaseMemory<VectorMemoryData<T>> {
  private dimensions: number;
  private similarityMetric: 'cosine' | 'euclidean' | 'dot';
  private normalizeVectors: boolean;

  constructor(options: VectorMemoryOptions) {
    super(options);
    this.dimensions = options.dimensions;
    this.similarityMetric = options.similarity || 'cosine';
    this.normalizeVectors = options.normalizeVectors ?? true;
    
    if (this.dimensions <= 0) {
      throw new Error('Dimensions must be a positive number');
    }
  }

  /**
   * Add a new vector to the memory
   */
  async addVector(
    content: T,
    vector: number[],
    options: {
      importance?: number;
      tags?: string[];
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<MemoryData<VectorMemoryData<T>>> {
    this.validateVector(vector);
    
    if (this.normalizeVectors) {
      vector = this.normalizeVector(vector);
    }
    
    const vectorData: VectorMemoryData<T> = {
      content,
      vector,
      metadata: options.metadata || {}
    };
    
    // Create a new memory data object with required fields
    const now = new Date();
    const memoryData: Omit<MemoryData<VectorMemoryData<T>>, 'id'> = {
      content: vectorData,
      importance: options.importance ?? 1.0,
      tags: options.tags ?? [],
      metadata: {},
      createdAt: now,
      lastAccessedAt: now
    };
    
    // Add to the store and return the result
    // The base class will handle generating the ID and timestamps
    return this.add({
      ...memoryData,
      // @ts-ignore - The base class will handle the ID generation
      id: 'temporary-id',
      // The base class will update these timestamps if needed
      createdAt: now,
      lastAccessedAt: now
    } as MemoryData<VectorMemoryData<T>>);
  }

  /**
   * Update an existing vector
   */
  async updateVector(
    id: string,
    updates: {
      content?: T;
      vector?: number[];
      metadata?: Record<string, unknown>;
    }
  ): Promise<MemoryData<VectorMemoryData<T>> | undefined> {
    if (updates.vector) {
      this.validateVector(updates.vector);
      
      if (this.normalizeVectors) {
        updates.vector = this.normalizeVector(updates.vector);
      }
    }
    
    const current = await this.get(id);
    if (!current) return undefined;
    
    // Create the updated vector data
    const updatedVectorData: VectorMemoryData<T> = {
      ...current.content,
      ...updates,
      vector: updates.vector || current.content.vector,
      metadata: {
        ...current.content.metadata,
        ...(updates.metadata || {})
      }
    };
    
    // Update the memory with the new vector data
    // The base class will handle updating the timestamps
    return this.update(id, {
      ...current,
      content: updatedVectorData,
      lastAccessedAt: new Date()
    } as MemoryData<VectorMemoryData<T>>);
  }

  /**
   * Find similar vectors using similarity search
   */
  async similaritySearch(
    queryVector: number[],
    options: {
      k?: number;
      minScore?: number;
      filter?: (item: MemoryData<VectorMemoryData<T>>) => boolean;
    } = {}
  ): Promise<Array<{
    item: MemoryData<VectorMemoryData<T>>;
    score: number;
  }>> {
    this.validateVector(queryVector);
    
    if (this.normalizeVectors) {
      queryVector = this.normalizeVector(queryVector);
    }
    
    const allItems = await this.list();
    const filteredItems = options.filter 
      ? allItems.filter(options.filter)
      : allItems;
    
    // Calculate similarity scores
    const results = filteredItems.map(item => ({
      item,
      score: this.calculateSimilarity(queryVector, item.content.vector)
    }));
    
    // Sort by score (descending)
    results.sort((a, b) => b.score - a.score);
    
    // Apply min score filter
    const minScore = options.minScore ?? -Infinity;
    const filteredResults = results.filter(r => r.score >= minScore);
    
    // Apply limit
    return options.k ? filteredResults.slice(0, options.k) : filteredResults;
  }

  /**
   * Implementation of abstract search method
   */
  /**
   * Search for similar vectors or by metadata
   */
  public async search(
    query: string | Record<string, unknown>,
    options: {
      limit?: number;
      minScore?: number;
      tags?: string[];
    } = {}
  ): Promise<MemorySearchResult<VectorMemoryData<T>>[]> {
    // For string queries, delegate to similarity search if it's a vector query
    if (typeof query === 'string' && this.isVectorString(query)) {
      const vector = this.parseVectorString(query);
      const results = await this.similaritySearch(vector, {
        k: options.limit,
        minScore: options.minScore,
        filter: options.tags ? item => 
          item.tags?.some(tag => options.tags?.includes(tag)) ?? false : undefined
      });
      
      return results.map(({ item, score }) => ({
        ...item,
        score
      }));
    }
    
    // Fall back to in-memory search for other query types
    const allItems = await this.list();
    const filteredItems = options.tags 
      ? allItems.filter(item => item.tags?.some(tag => options.tags?.includes(tag)))
      : allItems;
    
    const results: MemorySearchResult<VectorMemoryData<T>>[] = [];
    
    // Simple string search in content and metadata
    if (typeof query === 'string') {
      const queryLower = query.toLowerCase();
      for (const item of filteredItems) {
        let score = 0;
        
        // Check content if it's a string
        const contentStr = String(item.content);
        if (contentStr.toLowerCase().includes(queryLower)) {
          score = 0.8;
        }
        
        // Check metadata
        if (item.metadata) {
          const metadataStr = JSON.stringify(item.metadata).toLowerCase();
          if (metadataStr.includes(queryLower)) {
            score = Math.max(score, 0.5);
          }
        }
        
        if (score > 0) {
          results.push({
            ...item,
            score
          });
        }
      }
    } 
    // Object query
    else if (typeof query === 'object' && query !== null) {
      for (const item of filteredItems) {
        let matchScore = 0;
        let matchedFields = 0;
        
        for (const [key, value] of Object.entries(query)) {
          // Check if the key exists in the item
          if (key in item) {
            const itemValue = (item as any)[key];
            if (JSON.stringify(itemValue) === JSON.stringify(value)) {
              matchedFields++;
            }
          }
        }
        
        if (Object.keys(query).length > 0) {
          matchScore = matchedFields / Object.keys(query).length;
        }
        
        if (matchScore > 0) {
          results.push({
            ...item,
            score: matchScore
          });
        }
      }
    }
    
    // Sort by score and apply limit
    return results
      .sort((a, b) => b.score - a.score)
      .filter(r => r.score >= (options.minScore || 0))
      .slice(0, options.limit);
  }

  /**
   * Calculate similarity between two vectors
   */
  private calculateSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same dimensions');
    }
    
    switch (this.similarityMetric) {
      case 'cosine':
        return this.cosineSimilarity(a, b);
      case 'euclidean':
        return 1 / (1 + this.euclideanDistance(a, b));
      case 'dot':
        return this.dotProduct(a, b);
      default:
        throw new Error(`Unsupported similarity metric: ${this.similarityMetric}`);
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    if (normA === 0 || normB === 0) return 0;
    return dot / (normA * normB);
  }

  /**
   * Calculate Euclidean distance between two vectors
   */
  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.pow(a[i] - b[i], 2);
    }
    return Math.sqrt(sum);
  }

  /**
   * Calculate dot product of two vectors
   */
  private dotProduct(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += a[i] * b[i];
    }
    return sum;
  }

  /**
   * Normalize a vector to unit length
   */
  private normalizeVector(vector: number[]): number[] {
    const norm = Math.sqrt(vector.reduce((sum, x) => sum + x * x, 0));
    if (norm === 0) return vector; // Avoid division by zero
    return vector.map(x => x / norm);
  }

  /**
   * Validate that a vector has the correct dimensions
   */
  private validateVector(vector: number[]): void {
    if (!Array.isArray(vector)) {
      throw new Error('Vector must be an array of numbers');
    }
    
    if (vector.length !== this.dimensions) {
      throw new Error(`Expected vector of length ${this.dimensions}, got ${vector.length}`);
    }
    
    if (!vector.every(x => typeof x === 'number' && !isNaN(x))) {
      throw new Error('Vector must contain only finite numbers');
    }
  }

  /**
   * Check if a string represents a vector
   */
  private isVectorString(str: string): boolean {
    try {
      const vector = this.parseVectorString(str);
      return Array.isArray(vector) && vector.every(x => typeof x === 'number');
    } catch (e) {
      return false;
    }
  }

  /**
   * Parse a vector from a string
   */
  private parseVectorString(str: string): number[] {
    try {
      // Try parsing as JSON array first
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed) && parsed.every(x => typeof x === 'number')) {
        return parsed;
      }
      
      // Try parsing as space-separated or comma-separated values
      const separator = str.includes(',') ? /\s*,\s*/ : /\s+/;
      const vector = str.trim().split(separator).map(Number);
      
      if (vector.some(isNaN)) {
        throw new Error('Invalid vector format');
      }
      
      return vector;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to parse vector: ${errorMessage}`);
    }
  }
}

export default VectorMemory;