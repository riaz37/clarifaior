// No uuid import needed here as it's only used in the base class
import { BaseMemory } from './base/base-memory';
import { MemoryData, MemorySearchResult } from './base/memory-interface';

export interface ContextData {
  /**
   * The actual content of the context
   */
  content: string | Record<string, unknown>;
  
  /**
   * The type of context (e.g., 'user_preference', 'conversation', 'system')
   */
  type: string;
  
  /**
   * When this context expires (if applicable)
   */
  expiresAt?: Date;
  
  /**
   * Priority of this context (higher = more important)
   */
  priority?: number;
  
  /**
   * Related entities (e.g., user IDs, conversation IDs)
   */
  entities?: Record<string, string[]>;
}

/**
 * Specialized memory for managing contextual information
 */
export class ContextMemory extends BaseMemory<ContextData> {
  /**
   * Find context by type
   */
  async findByType(type: string, options: { limit?: number } = {}): Promise<MemoryData<ContextData>[]> {
    const allMemories = await this.list();
    const filtered = allMemories.filter(memory => memory.content.type === type);
    
    if (options.limit) {
      return filtered.slice(0, options.limit);
    }
    return filtered;
  }
  
  /**
   * Find context by entity
   */
  async findByEntity(
    entityType: string, 
    entityId: string,
    options: { limit?: number } = {}
  ): Promise<MemoryData<ContextData>[]> {
    const allMemories = await this.list();
    const filtered = allMemories.filter(memory => 
      memory.content.entities?.[entityType]?.includes(entityId)
    );
    
    if (options.limit) {
      return filtered.slice(0, options.limit);
    }
    return filtered;
  }
  
  /**
   * Search through context content
   */
  async search(
    query: string | Record<string, unknown>,
    options: {
      limit?: number;
      minScore?: number;
      tags?: string[];
      type?: string;
    } = {}
  ): Promise<MemorySearchResult<ContextData>[]> {
    // Simple implementation - in a real app, you might use a vector database or more advanced search
    const minScore = options.minScore ?? 0.3;
    const allMemories = await this.list({ tags: options.tags });
    
    // Filter by type if specified
    const filteredMemories = options.type
      ? allMemories.filter(m => m.content.type === options.type)
      : allMemories;
    
    // Simple text search implementation
    if (typeof query === 'string') {
      const queryLower = query.toLowerCase();
      const results = filteredMemories
        .map(memory => {
          const contentStr = typeof memory.content.content === 'string' 
            ? memory.content.content 
            : JSON.stringify(memory.content.content);
          
          // Simple relevance scoring
          let score = 0;
          if (contentStr.toLowerCase().includes(queryLower)) {
            score = 0.5; // Base score for containing the query
            
            // Increase score if query is at the start or is a complete word
            const contentLower = contentStr.toLowerCase();
            if (contentLower.startsWith(queryLower)) score += 0.3;
            if (contentLower.includes(` ${queryLower} `)) score += 0.2;
          }
          
          // Boost score based on priority
          if (memory.content.priority) {
            score += memory.content.priority * 0.1;
          }
          
          return { ...memory, score };
        })
        .filter(result => result.score >= minScore)
        .sort((a, b) => b.score - a.score);
      
      return options.limit ? results.slice(0, options.limit) : results;
    }
    
    // Object query (search in metadata)
    const results = filteredMemories
      .map(memory => {
        // Skip if content is a string when we need to search in an object
        if (typeof memory.content.content === 'string') return null;
        
        let matchScore = 0;
        const content = memory.content.content as Record<string, unknown>;
        let matchedFields = 0;
        
        // Calculate how many query fields match
        for (const [key, value] of Object.entries(query)) {
          if (JSON.stringify(content[key]) === JSON.stringify(value)) {
            matchedFields++;
          }
        }
        
        if (matchedFields > 0) {
          matchScore = matchedFields / Object.keys(query).length;
        }
        
        // Include priority in score
        if (memory.content.priority) {
          matchScore += memory.content.priority * 0.1;
        }
        
        return matchScore >= minScore 
          ? { ...memory, score: matchScore }
          : null;
      })
      .filter((result): result is MemorySearchResult<ContextData> => result !== null)
      .sort((a, b) => b.score - a.score);
    
    return options.limit ? results.slice(0, options.limit) : results;
  }
  
  /**
   * Clean up expired contexts
   */
  async cleanupExpired(): Promise<number> {
    const now = new Date();
    const allMemories = await this.list();
    let removedCount = 0;
    
    for (const memory of allMemories) {
      if (memory.content.expiresAt && memory.content.expiresAt < now) {
        await this.delete(memory.id);
        removedCount++;
      }
    }
    
    return removedCount;
  }
  
  /**
   * Get active contexts (non-expired and with highest priority)
   */
  async getActiveContexts(options: {
    limit?: number;
    minPriority?: number;
    types?: string[];
  } = {}): Promise<MemoryData<ContextData>[]> {
    const now = new Date();
    const allMemories = await this.list();
    
    const activeMemories = allMemories.filter(memory => {
      // Filter out expired contexts
      if (memory.content.expiresAt && memory.content.expiresAt < now) {
        return false;
      }
      
      // Filter by minimum priority if specified
      if (options.minPriority !== undefined && 
          (memory.content.priority ?? 0) < options.minPriority) {
        return false;
      }
      
      // Filter by type if specified
      if (options.types && !options.types.includes(memory.content.type)) {
        return false;
      }
      
      return true;
    });
    
    // Sort by priority (descending) and then by last accessed (descending)
    activeMemories.sort((a, b) => {
      const priorityDiff = (b.content.priority ?? 0) - (a.content.priority ?? 0);
      if (priorityDiff !== 0) return priorityDiff;
      return b.lastAccessedAt.getTime() - a.lastAccessedAt.getTime();
    });
    
    return options.limit ? activeMemories.slice(0, options.limit) : activeMemories;
  }
}

export default ContextMemory;