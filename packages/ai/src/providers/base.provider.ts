export interface LLMConfig {
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  retries?: number;
}

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

export abstract class BaseLLMProvider {
  protected config: LLMConfig;
  protected name: string;

  constructor(config: LLMConfig, name: string) {
    this.config = config;
    this.name = name;
  }

  abstract generateCompletion(
    prompt: string,
    options?: Partial<LLMConfig>
  ): Promise<LLMResponse>;

  abstract generateEmbedding(text: string): Promise<EmbeddingResponse>;

  abstract streamCompletion(
    prompt: string,
    options?: Partial<LLMConfig>
  ): AsyncGenerator<StreamingResponse>;

  abstract generateStructuredOutput<T>(
    prompt: string,
    schema: any,
    options?: Partial<LLMConfig>
  ): Promise<T>;

  getName(): string {
    return this.name;
  }

  getModel(): string {
    return this.config.model;
  }

  protected calculateCost(tokensUsed: number, model: string): number {
    // Base implementation - override in specific providers
    return 0;
  }

  protected validateConfig(): void {
    if (!this.config.apiKey) {
      throw new Error(`API key is required for ${this.name} provider`);
    }
    if (!this.config.model) {
      throw new Error(`Model is required for ${this.name} provider`);
    }
  }
}