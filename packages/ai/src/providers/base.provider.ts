import { LLMProviderConfig } from '@ai/config/llm.config';
import { LLMResponse, EmbeddingResponse, StreamingResponse } from './types/provider';

export abstract class BaseLLMProvider {
  protected config: LLMProviderConfig;
  protected name: string;
  protected baseUrl: string;

  constructor(config: LLMProviderConfig, baseUrl?: string) {
    this.config = config;
    this.name = config.provider;
    this.baseUrl = baseUrl || config.baseUrl || '';
    this.validateConfig();
  }

  abstract generateCompletion(
    prompt: string,
    options?: Partial<LLMProviderConfig>
  ): Promise<LLMResponse>;

  abstract generateEmbedding(text: string): Promise<EmbeddingResponse>;

  abstract streamCompletion(
    prompt: string,
    options?: Partial<LLMProviderConfig>
  ): AsyncGenerator<StreamingResponse>;

  abstract generateStructuredOutput<T>(
    prompt: string,
    schema: any,
    options?: Partial<LLMProviderConfig>
  ): Promise<T>;

  getName(): string {
    return this.name;
  }

  getModel(): string {
    return this.config.model;
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
export { LLMResponse };
