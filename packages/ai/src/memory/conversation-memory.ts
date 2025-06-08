import { BaseMemory } from './base/base-memory';
import { MemoryData, MemorySearchResult } from './base/memory-interface';

export interface Message {
  /**
   * Unique ID of the message
   */
  id: string;
  
  /**
   * The content of the message
   */
  content: string;
  
  /**
   * Role of the message sender (user, assistant, system, etc.)
   */
  role: 'user' | 'assistant' | 'system' | 'function' | 'tool';
  
  /**
   * When the message was created
   */
  timestamp: Date;
  
  /**
   * Optional metadata about the message
   */
  metadata?: Record<string, unknown>;
  
  /**
   * For function/tool calls, the name of the function/tool
   */
  name?: string;
  
  /**
   * For function/tool calls, the function call details
   */
  function_call?: {
    name: string;
    arguments: string;
  };
}

export interface ConversationData {
  /**
   * Unique ID of the conversation
   */
  id: string;
  
  /**
   * Title or name of the conversation (can be auto-generated)
   */
  title: string;
  
  /**
   * Messages in the conversation
   */
  messages: Message[];
  
  /**
   * When the conversation was created
   */
  createdAt: Date;
  
  /**
   * When the conversation was last updated
   */
  updatedAt: Date;
  
  /**
   * Optional metadata about the conversation
   */
  metadata?: Record<string, unknown>;
  
  /**
   * Tags for categorization
   */
  tags?: string[];
  
  /**
   * Whether this conversation is archived
   */
  isArchived?: boolean;
  
  /**
   * User ID of the conversation owner
   */
  userId?: string;
}

/**
 * Specialized memory for managing conversation history
 */
export class ConversationMemory extends BaseMemory<ConversationData> {
  /**
   * Add a message to a conversation
   */
  async addMessage(
    conversationId: string,
    message: Omit<Message, 'id' | 'timestamp'>,
    options: { updateTimestamp?: boolean } = { updateTimestamp: true }
  ): Promise<Message | undefined> {
    const conversation = await this.get(conversationId);
    if (!conversation) return undefined;
    
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    
    conversation.content.messages.push(newMessage);
    
    if (options.updateTimestamp) {
      conversation.content.updatedAt = new Date();
    }
    
    await this.update(conversationId, conversation.content);
    return newMessage;
  }
  
  /**
   * Get messages from a conversation
   */
  async getMessages(
    conversationId: string,
    options: { 
      limit?: number; 
      before?: Date; 
      after?: Date;
      role?: Message['role'];
    } = {}
  ): Promise<Message[]> {
    const conversation = await this.get(conversationId);
    if (!conversation) return [];
    
    let messages = [...conversation.content.messages];
    
    // Apply filters
    if (options.before) {
      messages = messages.filter(m => m.timestamp < options.before!);
    }
    
    if (options.after) {
      messages = messages.filter(m => m.timestamp > options.after!);
    }
    
    if (options.role) {
      messages = messages.filter(m => m.role === options.role);
    }
    
    // Apply limit (most recent first)
    if (options.limit) {
      messages = messages.slice(-options.limit);
    }
    
    return messages;
  }
  
  /**
   * Find conversations by user ID
   */
  async findByUserId(
    userId: string,
    options: { 
      limit?: number; 
      includeArchived?: boolean;
    } = {}
  ): Promise<MemoryData<ConversationData>[]> {
    const allConversations = await this.list();
    let filtered = allConversations.filter(
      conv => conv.content.userId === userId
    );
    
    if (!options.includeArchived) {
      filtered = filtered.filter(conv => !conv.content.isArchived);
    }
    
    if (options.limit) {
      filtered = filtered.slice(0, options.limit);
    }
    
    return filtered;
  }
  
  /**
   * Search through conversation messages
   */
  async searchMessages(
    query: string,
    options: {
      conversationId?: string;
      userId?: string;
      limit?: number;
      role?: Message['role'];
    } = {}
  ): Promise<Array<{
    conversation: MemoryData<ConversationData>;
    message: Message;
    score: number;
  }>> {
    const queryLower = query.toLowerCase();
    const results: Array<{
      conversation: MemoryData<ConversationData>;
      message: Message;
      score: number;
    }> = [];
    
    // Get conversations to search through
    let conversations: MemoryData<ConversationData>[] = [];
    
    if (options.conversationId) {
      const conv = await this.get(options.conversationId);
      if (conv) conversations = [conv];
    } else if (options.userId) {
      conversations = await this.findByUserId(options.userId, { includeArchived: true });
    } else {
      conversations = await this.list();
    }
    
    // Search through messages
    for (const conv of conversations) {
      for (const message of conv.content.messages) {
        // Skip if role filter doesn't match
        if (options.role && message.role !== options.role) continue;
        
        // Simple text matching (in a real app, you might use a more sophisticated search)
        const contentLower = message.content.toLowerCase();
        if (contentLower.includes(queryLower)) {
          // Simple relevance scoring
          let score = 0.5; // Base score for containing the query
          
          if (contentLower.startsWith(queryLower)) score += 0.3;
          if (contentLower.includes(` ${queryLower} `)) score += 0.2;
          
          results.push({
            conversation: conv,
            message,
            score
          });
        }
      }
    }
    
    // Sort by score (highest first)
    results.sort((a, b) => b.score - a.score);
    
    return options.limit ? results.slice(0, options.limit) : results;
  }
  
  /**
   * Archive a conversation
   */
  async archive(conversationId: string): Promise<boolean> {
    const conversation = await this.get(conversationId);
    if (!conversation) return false;
    
    // Create an updated conversation with isArchived set to true
    const updatedConversation = {
      ...conversation.content,
      metadata: {
        ...conversation.content.metadata,
        isArchived: true,
      },
      updatedAt: new Date()
    };
    
    await this.update(conversationId, updatedConversation);
    return true;
  }
  
  /**
   * Restore an archived conversation
   */
  async restore(conversationId: string): Promise<boolean> {
    const conversation = await this.get(conversationId);
    if (!conversation) return false;
    
    // Create an updated conversation with isArchived set to false
    const updatedConversation = {
      ...conversation.content,
      metadata: {
        ...conversation.content.metadata,
        isArchived: false,
      },
      updatedAt: new Date()
    };
    
    await this.update(conversationId, updatedConversation);
    return true;
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
  ): Promise<MemorySearchResult<ConversationData>[]> {
    const minScore = options.minScore ?? 0.3;
    const allConversations = await this.list({ tags: options.tags });
    
    if (typeof query === 'string') {
      const queryLower = query.toLowerCase();
      
      const results = allConversations
        .map(conv => {
          // Search in title and messages
          const titleMatch = conv.content.title.toLowerCase().includes(queryLower) ? 0.5 : 0;
          
          // Check messages for matches
          let messageMatchScore = 0;
          for (const msg of conv.content.messages) {
            if (msg.content.toLowerCase().includes(queryLower)) {
              messageMatchScore = Math.max(messageMatchScore, 0.5);
              break;
            }
          }
          
          const score = Math.min(titleMatch + messageMatchScore, 1);
          return { ...conv, score };
        })
        .filter(result => result.score >= minScore)
        .sort((a, b) => b.score - a.score);
      
      return options.limit ? results.slice(0, options.limit) : results;
    }
    
    // Object query (search in metadata)
    const results = allConversations
      .map(conv => {
        let matchScore = 0;
        let matchedFields = 0;
        
        // Calculate how many query fields match
        for (const [key, value] of Object.entries(query)) {
          // Search in metadata or direct properties
          if (key in conv.content && 
              JSON.stringify(conv.content[key as keyof ConversationData]) === JSON.stringify(value)) {
            matchedFields++;
          } else if (conv.content.metadata && 
                    key in conv.content.metadata && 
                    JSON.stringify(conv.content.metadata[key]) === JSON.stringify(value)) {
            matchedFields++;
          }
        }
        
        if (matchedFields > 0) {
          matchScore = matchedFields / Object.keys(query).length;
        }
        
        return matchScore >= minScore 
          ? { ...conv, score: matchScore }
          : null;
      })
      .filter((result): result is MemorySearchResult<ConversationData> => result !== null)
      .sort((a, b) => b.score - a.score);
    
    return options.limit ? results.slice(0, options.limit) : results;
  }
}

export default ConversationMemory;