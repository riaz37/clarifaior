import { BaseMemory } from './base/base-memory';
import { MemoryData, MemorySearchResult } from './base/memory-interface';

export interface UserPreferences {
  /**
   * User's preferred language (e.g., 'en-US', 'es-ES')
   */
  language?: string;
  
  /**
   * User's timezone (e.g., 'America/New_York')
   */
  timezone?: string;
  
  /**
   * Notification preferences
   */
  notifications?: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
    frequency?: 'immediate' | 'hourly' | 'daily' | 'weekly';
  };
  
  /**
   * UI/UX preferences
   */
  ui?: {
    theme?: 'light' | 'dark' | 'system';
    fontSize?: 'small' | 'medium' | 'large';
    compactMode?: boolean;
  };
  
  /**
   * Privacy preferences
   */
  privacy?: {
    dataCollection?: boolean;
    personalizedAds?: boolean;
    shareAnalytics?: boolean;
  };
  
  /**
   * Custom user preferences
   */
  [key: string]: unknown;
}

export interface UserProfile {
  /**
   * Unique user ID
   */
  id: string;
  
  /**
   * User's display name
   */
  displayName?: string;
  
  /**
   * User's email address
   */
  email?: string;
  
  /**
   * URL to user's avatar/image
   */
  avatarUrl?: string;
  
  /**
   * User's timezone (e.g., 'America/New_York')
   */
  timezone?: string;
  
  /**
   * User's preferred language (e.g., 'en-US')
   */
  locale?: string;
  
  /**
   * When the user account was created
   */
  createdAt: Date;
  
  /**
   * When the user was last active
   */
  lastActiveAt: Date;
  
  /**
   * User preferences
   */
  preferences: UserPreferences;
  
  /**
   * Custom metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Specialized memory for managing user data and preferences
 */
export class UserMemory extends BaseMemory<UserProfile> {
  /**
   * Update user preferences
   */
  async updatePreferences(
    userId: string,
    updates: Partial<UserPreferences>,
    options: { merge?: boolean } = { merge: true }
  ): Promise<MemoryData<UserProfile> | undefined> {
    const user = await this.get(userId);
    if (!user) return undefined;
    
    const currentPrefs = { ...user.content.preferences };
    const updatedPrefs = options.merge 
      ? { ...currentPrefs, ...updates }
      : updates as UserPreferences;
    
    // Create the updated user profile
    const updatedProfile: UserProfile = {
      ...user.content,
      preferences: updatedPrefs,
      lastActiveAt: new Date()
    };
    
    // Update and return the memory data
    return this.update(userId, updatedProfile);
  }
  
  /**
   * Get a specific preference value
   */
  async getPreference<T = unknown>(
    userId: string,
    path: string
  ): Promise<T | undefined> {
    const user = await this.get(userId);
    if (!user) return undefined;
    
    // Simple dot notation path resolution
    return path.split('.').reduce((obj, key) => {
      if (obj && typeof obj === 'object' && key in obj) {
        return (obj as Record<string, unknown>)[key];
      }
      return undefined;
    }, user.content.preferences as unknown) as T | undefined;
  }
  
  /**
   * Update user metadata
   */
  async updateMetadata(
    userId: string,
    updates: Record<string, unknown>,
    options: { merge?: boolean } = { merge: true }
  ): Promise<MemoryData<UserProfile> | undefined> {
    const user = await this.get(userId);
    if (!user) return undefined;
    
    const currentMetadata = user.content.metadata || {};
    const updatedMetadata = options.merge
      ? { ...currentMetadata, ...updates }
      : updates;
    
    // Create the updated user profile
    const updatedProfile: UserProfile = {
      ...user.content,
      metadata: updatedMetadata,
      lastActiveAt: new Date()
    };
    
    // Update and return the memory data
    return this.update(userId, updatedProfile);
  }
  
  /**
   * Get user by email
   */
  async findByEmail(email: string): Promise<MemoryData<UserProfile> | undefined> {
    const users = await this.list();
    return users.find(user => user.content.email?.toLowerCase() === email.toLowerCase());
  }
  
  /**
   * Search users by various criteria
   */
  async searchUsers(
    criteria: {
      query?: string;
      tags?: string[];
      lastActiveAfter?: Date;
      createdAfter?: Date;
    } = {}
  ): Promise<MemoryData<UserProfile>[]> {
    let users = await this.list();
    
    if (criteria.query) {
      const queryLower = criteria.query.toLowerCase();
      users = users.filter(user => 
        (user.content.displayName?.toLowerCase().includes(queryLower)) ||
        (user.content.email?.toLowerCase().includes(queryLower))
      );
    }
    
    if (criteria.tags?.length) {
      users = users.filter(user => 
        user.tags?.some(tag => criteria.tags?.includes(tag))
      );
    }
    
    if (criteria.lastActiveAfter) {
      users = users.filter(user => 
        user.content.lastActiveAt > criteria.lastActiveAfter!
      );
    }
    
    if (criteria.createdAfter) {
      users = users.filter(user => 
        user.content.createdAt > criteria.createdAfter!
      );
    }
    
    return users;
  }
  
  /**
   * Implementation of abstract search method
   */
  async search(
    query: string | Record<string, unknown>,
    options: {
      limit?: number;
      minScore?: number;
      tags?: string[];
    } = {}
  ): Promise<MemorySearchResult<UserProfile>[]> {
    const minScore = options.minScore ?? 0.3;
    const allUsers = await this.list({ tags: options.tags });
    
    if (typeof query === 'string') {
      const queryLower = query.toLowerCase();
      
      const results = allUsers
        .map(user => {
          let score = 0;
          
          // Check display name
          if (user.content.displayName?.toLowerCase().includes(queryLower)) {
            score = Math.max(score, 0.7);
          }
          
          // Check email
          if (user.content.email?.toLowerCase() === queryLower) {
            score = Math.max(score, 1.0); // Exact email match is highest confidence
          } else if (user.content.email?.toLowerCase().includes(queryLower)) {
            score = Math.max(score, 0.5);
          }
          
          // Check metadata
          if (user.content.metadata) {
            const metadataStr = JSON.stringify(user.content.metadata).toLowerCase();
            if (metadataStr.includes(queryLower)) {
              score = Math.max(score, 0.4);
            }
          }
          
          return { ...user, score };
        })
        .filter(result => result.score >= minScore)
        .sort((a, b) => b.score - a.score);
      
      return options.limit ? results.slice(0, options.limit) : results;
    }
    
    // Object query (search in user properties)
    const results = allUsers
      .map(user => {
        let matchScore = 0;
        let matchedFields = 0;
        
        // Calculate how many query fields match
        for (const [key, value] of Object.entries(query)) {
          // Handle nested properties with dot notation
          const keys = key.split('.');
          let current: any = user.content;
          
          try {
            for (const k of keys) {
              current = current?.[k];
            }
            
            if (JSON.stringify(current) === JSON.stringify(value)) {
              matchedFields++;
            }
          } catch (e) {
            // Property doesn't exist or can't be accessed
          }
        }
        
        if (matchedFields > 0) {
          matchScore = matchedFields / Object.keys(query).length;
        }
        
        return matchScore >= minScore 
          ? { ...user, score: matchScore }
          : null;
      })
      .filter((result): result is MemorySearchResult<UserProfile> => result !== null)
      .sort((a, b) => b.score - a.score);
    
    return options.limit ? results.slice(0, options.limit) : results;
  }
}

export default UserMemory;