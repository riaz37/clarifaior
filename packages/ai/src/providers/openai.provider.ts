import { BaseLLMProvider, LLMConfig, LLMResponse, EmbeddingResponse, StreamingResponse } from './base.provider';

interface OpenAIConfig extends LLMConfig {
  organization?: string;
  baseUrl?: string;
}

export class OpenAIProvider extends BaseLLMProvider {
  private baseUrl: string;
  private organization?: string;

  constructor(config: OpenAIConfig) {
    super(config, 'OpenAI');
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.organization = config.organization;
    this.validateConfig();
  }

  async generateCompletion(
    prompt: string,
    options?: Partial<LLMConfig>
  ): Promise<LLMResponse> {
    const requestConfig = { ...this.config, ...options };
    
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${requestConfig.apiKey}`,
      };

      if (this.organization) {
        headers['OpenAI-Organization'] = this.organization;
      }

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: requestConfig.model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: requestConfig.temperature || 0.7,
          max_tokens: requestConfig.maxTokens || 1000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const tokensUsed = data.usage?.total_tokens || 0;

      return {
        content: data.choices[0]?.message?.content || '',
        model: data.model,
        tokensUsed,
        cost: this.calculateCost(tokensUsed, data.model),
        metadata: {
          finishReason: data.choices[0]?.finish_reason,
          usage: data.usage,
        },
      };
    } catch (error) {
      throw new Error(`OpenAI completion failed: ${error.message}`);
    }
  }

  async generateEmbedding(text: string): Promise<EmbeddingResponse> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      };

      if (this.organization) {
        headers['OpenAI-Organization'] = this.organization;
      }

      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const tokensUsed = data.usage?.total_tokens || 0;

      return {
        embedding: data.data[0]?.embedding || [],
        model: data.model,
        tokensUsed,
        cost: this.calculateCost(tokensUsed, data.model),
      };
    } catch (error) {
      throw new Error(`OpenAI embedding failed: ${error.message}`);
    }
  }

  async *streamCompletion(
    prompt: string,
    options?: Partial<LLMConfig>
  ): AsyncGenerator<StreamingResponse> {
    const requestConfig = { ...this.config, ...options };
    
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${requestConfig.apiKey}`,
      };

      if (this.organization) {
        headers['OpenAI-Organization'] = this.organization;
      }

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: requestConfig.model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: requestConfig.temperature || 0.7,
          max_tokens: requestConfig.maxTokens || 1000,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} ${errorData.error?.message || response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          yield {
            content: '',
            done: true,
            model: requestConfig.model,
          };
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              
              if (content) {
                yield {
                  content,
                  done: false,
                  model: parsed.model,
                  tokensUsed: parsed.usage?.total_tokens,
                };
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      throw new Error(`OpenAI streaming failed: ${error.message}`);
    }
  }

  async generateStructuredOutput<T>(
    prompt: string,
    schema: any,
    options?: Partial<LLMConfig>
  ): Promise<T> {
    const requestConfig = { ...this.config, ...options };
    
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${requestConfig.apiKey}`,
      };

      if (this.organization) {
        headers['OpenAI-Organization'] = this.organization;
      }

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: requestConfig.model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: requestConfig.temperature || 0.1,
          max_tokens: requestConfig.maxTokens || 1000,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';

      try {
        return JSON.parse(content) as T;
      } catch (parseError) {
        throw new Error(`Failed to parse structured output: ${parseError.message}`);
      }
    } catch (error) {
      throw new Error(`OpenAI structured output failed: ${error.message}`);
    }
  }

  protected calculateCost(tokensUsed: number, model: string): number {
    // OpenAI pricing (approximate, as of 2024)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 0.03 / 1000, output: 0.06 / 1000 },
      'gpt-4-turbo': { input: 0.01 / 1000, output: 0.03 / 1000 },
      'gpt-3.5-turbo': { input: 0.0015 / 1000, output: 0.002 / 1000 },
      'text-embedding-3-small': { input: 0.00002 / 1000, output: 0 },
      'text-embedding-3-large': { input: 0.00013 / 1000, output: 0 },
    };

    const modelPricing = pricing[model] || pricing['gpt-3.5-turbo'];
    // Simplified calculation - in reality, you'd need to track input vs output tokens
    return tokensUsed * modelPricing.input;
  }
}