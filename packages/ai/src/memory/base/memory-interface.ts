// Core memory interfaces for the AI memory system

export interface MemoryData<T = unknown> {
  /**
   * Unique identifier for the memory
   */
  id: string;
  
  /**
   * The actual content of the memory
   */
  content: T;
  
  /**
   * When the memory was created
   */
  createdAt: Date;
  
  /**
   * When the memory was last accessed
   */
  lastAccessedAt: Date;
  
  /**
   * Importance score (0-1) for the memory
   */
  importance: number;
  
  /**
   * Optional tags for categorization
   */
  tags?: string[];
  
  /**
   * Optional metadata
   */
  metadata?: Record<string, unknown>;
}

export interface MemorySearchResult<T = unknown> extends MemoryData<T> {
  /**
   * Relevance score from search (0-1)
   */
  score: number;
}

export interface MemoryStoreOptions {
  /**
   * Maximum number of memories to store (optional)
   */
  maxSize?: number;
  
  /**
   * Default importance for new memories
   */
  defaultImportance?: number;
  
  /**
   * Whether to automatically clean up old memories when limit is reached
   */
  autoPrune?: boolean;
}

export interface IMemoryStore<T = unknown> {
  /**
   * Add a new memory
   */
  add(content: T, options?: {
    importance?: number;
    tags?: string[];
    metadata?: Record<string, unknown>;
  }): Promise<MemoryData<T>>;
  
  /**
   * Get a memory by ID
   */
  get(id: string): Promise<MemoryData<T> | undefined>;
  
  /**
   * Update an existing memory
   */
  update(id: string, updates: Partial<Omit<MemoryData<T>, 'id' | 'createdAt'>>): Promise<MemoryData<T> | undefined>;
  
  /**
   * Delete a memory
   */
  delete(id: string): Promise<boolean>;
  
  /**
   * Search memories by content or metadata
   */
  search(
    query: string | Record<string, unknown>,
    options?: {
      limit?: number;
      minScore?: number;
      tags?: string[];
    }
  ): Promise<MemorySearchResult<T>[]>;
  
  /**
   * List all memories, optionally filtered
   */
  list(options?: {
    limit?: number;
    offset?: number;
    tags?: string[];
    minImportance?: number;
  }): Promise<MemoryData<T>[]>;
  
  /**
   * Clear all memories
   */
  clear(): Promise<void>;
  
  /**
   * Get memory statistics
   */
  stats(): Promise<{
    total: number;
    sizeInBytes: number;
    lastPruned?: Date;
  }>;
}
