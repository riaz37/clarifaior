import { v4 as uuidv4 } from 'uuid';
import { IMemoryStore, MemoryData, MemorySearchResult, MemoryStoreOptions } from './memory-interface';

/**
 * Abstract base class for memory stores
 * Implements common functionality that can be shared across different memory implementations
 */
export abstract class BaseMemory<T = unknown> implements IMemoryStore<T> {
  protected options: Required<MemoryStoreOptions>;
  protected memories: Map<string, MemoryData<T>> = new Map();
  private lastPruned?: Date;

  constructor(options: MemoryStoreOptions = {}) {
    this.options = {
      maxSize: options.maxSize ?? 1000,
      defaultImportance: options.defaultImportance ?? 0.5,
      autoPrune: options.autoPrune ?? true,
    };
  }

  /**
   * Add a new memory
   */
  async add(
    content: T,
    options: {
      importance?: number;
      tags?: string[];
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<MemoryData<T>> {
    const now = new Date();
    const memory: MemoryData<T> = {
      id: uuidv4(),
      content,
      createdAt: now,
      lastAccessedAt: now,
      importance: options.importance ?? this.options.defaultImportance,
      tags: options.tags,
      metadata: options.metadata,
    };

    // Auto-prune if needed
    if (this.options.autoPrune && this.memories.size >= this.options.maxSize) {
      await this.prune(1);
    }

    this.memories.set(memory.id, memory);
    return memory;
  }

  /**
   * Get a memory by ID
   */
  async get(id: string): Promise<MemoryData<T> | undefined> {
    const memory = this.memories.get(id);
    if (memory) {
      // Update last accessed time
      memory.lastAccessedAt = new Date();
      this.memories.set(id, memory);
    }
    return memory;
  }

  /**
   * Update an existing memory
   */
  async update(
    id: string,
    updates: Partial<Omit<MemoryData<T>, 'id' | 'createdAt'>>
  ): Promise<MemoryData<T> | undefined> {
    const memory = await this.get(id);
    if (!memory) return undefined;

    const updatedMemory: MemoryData<T> = {
      ...memory,
      ...updates,
      lastAccessedAt: new Date(),
    };

    this.memories.set(id, updatedMemory);
    return updatedMemory;
  }

  /**
   * Delete a memory
   */
  async delete(id: string): Promise<boolean> {
    return this.memories.delete(id);
  }

  /**
   * List all memories, optionally filtered
   */
  async list(options: {
    limit?: number;
    offset?: number;
    tags?: string[];
    minImportance?: number;
  } = {}): Promise<MemoryData<T>[]> {
    let result = Array.from(this.memories.values());

    // Apply filters
    if (options.tags?.length) {
      result = result.filter(memory => 
        memory.tags?.some(tag => options.tags?.includes(tag))
      );
    }

    if (options.minImportance !== undefined) {
      result = result.filter(memory => memory.importance >= options.minImportance!);
    }

    // Apply pagination
    const offset = options.offset ?? 0;
    const limit = options.limit ?? result.length;
    
    return result.slice(offset, offset + limit);
  }

  /**
   * Clear all memories
   */
  async clear(): Promise<void> {
    this.memories.clear();
  }

  /**
   * Get memory statistics
   */
  async stats() {
    let sizeInBytes = 0;
    
    // Calculate approximate size in bytes
    for (const memory of this.memories.values()) {
      try {
        sizeInBytes += JSON.stringify(memory).length * 2; // Rough estimate
      } catch (e) {
        // Skip if memory can't be serialized
      }
    }

    return {
      total: this.memories.size,
      sizeInBytes,
      lastPruned: this.lastPruned,
    };
  }

  /**
   * Prune old or less important memories
   * @param count Number of items to remove
   */
  protected async prune(count: number): Promise<void> {
    if (count <= 0) return;

    // Get all memories sorted by importance and last accessed time
    const sortedMemories = Array.from(this.memories.entries())
      .sort((a, b) => {
        // First sort by importance, then by last accessed time
        if (a[1].importance !== b[1].importance) {
          return a[1].importance - b[1].importance;
        }
        return a[1].lastAccessedAt.getTime() - b[1].lastAccessedAt.getTime();
      });

    // Remove the least important/oldest memories
    for (let i = 0; i < Math.min(count, sortedMemories.length); i++) {
      this.memories.delete(sortedMemories[i][0]);
    }

    this.lastPruned = new Date();
  }

  // Abstract methods that must be implemented by subclasses
  abstract search(
    query: string | Record<string, unknown>,
    options?: {
      limit?: number;
      minScore?: number;
      tags?: string[];
    }
  ): Promise<MemorySearchResult<T>[]>;
}

export default BaseMemory;