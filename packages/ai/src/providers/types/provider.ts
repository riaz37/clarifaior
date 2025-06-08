export interface LLMResponse {
    content: string;
    model: string;
    tokensUsed: number;
    cost?: number;
    metadata?: Record<string, any>;
  }
  
  export interface EmbeddingResponse {
    embedding: number[];
    model: string;
    tokensUsed: number;
    cost?: number;
  }
  
  export interface StreamingResponse {
    content: string;
    done: boolean;
    model: string;
    tokensUsed?: number;
}

export * from '@ai/config/llm.config';