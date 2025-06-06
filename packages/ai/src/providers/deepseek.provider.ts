import { BaseLLMProvider, LLMConfig, LLMResponse, EmbeddingResponse, StreamingResponse } from './base.provider';

interface DeepSeekConfig extends LLMConfig {
  baseUrl?: string;
}

export class DeepSeekProvider extends BaseLLMProvider {
  private baseUrl: string;

  constructor(config: DeepSeekConfig) {
    super(config, 'DeepSeek');
    this.baseUrl = config.baseUrl || 'https://api.deepseek.com/v1';
    this.validateConfig();
  }

  async generateCompletion(
    prompt: string,
    options?: Partial<LLMConfig>
  ): Promise<LLMResponse> {
    const requestConfig = { ...this.config, ...options };
    
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${requestConfig.apiKey}`,
        },
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
        throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
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
      throw new Error(`DeepSeek completion failed: ${error.message}`);
    }
  }

  async generateEmbedding(text: string): Promise<EmbeddingResponse> {
    // DeepSeek doesn't have embeddings API, so we'll throw an error
    throw new Error('DeepSeek provider does not support embeddings. Use OpenAI or another provider for embeddings.');
  }

  async *streamCompletion(
    prompt: string,
    options?: Partial<LLMConfig>
  ): AsyncGenerator<StreamingResponse> {
    const requestConfig = { ...this.config, ...options };
    
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${requestConfig.apiKey}`,
        },
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
        throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
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
      throw new Error(`DeepSeek streaming failed: ${error.message}`);
    }
  }

  async generateStructuredOutput<T>(
    prompt: string,
    schema: any,
    options?: Partial<LLMConfig>
  ): Promise<T> {
    const structuredPrompt = `${prompt}\n\nPlease respond with valid JSON that matches this schema:\n${JSON.stringify(schema, null, 2)}`;
    
    const response = await this.generateCompletion(structuredPrompt, options);
    
    try {
      return JSON.parse(response.content) as T;
    } catch (error) {
      throw new Error(`Failed to parse structured output: ${error.message}`);
    }
  }

  protected calculateCost(tokensUsed: number, model: string): number {
    // DeepSeek pricing (approximate)
    const pricePerToken = model.includes('chat') ? 0.00014 / 1000 : 0.00007 / 1000;
    return tokensUsed * pricePerToken;
  }
}