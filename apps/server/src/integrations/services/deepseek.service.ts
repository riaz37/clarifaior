import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { LoggerService } from '@common/services/logger.service';
import { LLMRequest, LLMResponse } from '../integration.service';

@Injectable()
export class DeepSeekService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.deepseek.com/v1';

  constructor(private logger: LoggerService) {
    this.logger.setContext('DeepSeekService');
    this.apiKey = process.env.DEEPSEEK_API_KEY;

    if (!this.apiKey) {
      this.logger.warn('DeepSeek API key not configured');
    }
  }

  async callLLM(request: LLMRequest): Promise<LLMResponse> {
    if (!this.apiKey) {
      throw new BadRequestException('DeepSeek API key not configured');
    }

    const { prompt, model, temperature = 0.7, maxTokens = 1000 } = request;

    this.logger.log(`Calling DeepSeek API`, {
      model,
      promptLength: prompt.length,
      temperature,
      maxTokens,
    });

    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.mapModel(model),
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature,
          max_tokens: maxTokens,
          stream: false,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 second timeout
        },
      );

      const { choices, usage } = response.data;

      if (!choices || choices.length === 0) {
        throw new Error('No response from DeepSeek API');
      }

      const content = choices[0].message?.content;
      if (!content) {
        throw new Error('Empty response from DeepSeek API');
      }

      const tokensUsed = usage?.total_tokens || 0;
      const cost = this.calculateCost(tokensUsed, model);

      this.logger.log(`DeepSeek API call successful`, {
        model,
        tokensUsed,
        cost,
        responseLength: content.length,
      });

      return {
        response: content,
        model: model,
        tokensUsed,
        cost,
      };
    } catch (error) {
      this.logger.error(`DeepSeek API call failed`, error.stack, {
        model,
        promptLength: prompt.length,
        error: error.message,
      });

      if (error.response?.status === 401) {
        throw new BadRequestException('Invalid DeepSeek API key');
      } else if (error.response?.status === 429) {
        throw new BadRequestException('DeepSeek API rate limit exceeded');
      } else if (error.response?.status === 400) {
        throw new BadRequestException(
          `DeepSeek API error: ${error.response.data?.error?.message || 'Bad request'}`,
        );
      }

      throw new BadRequestException(
        `DeepSeek API call failed: ${error.message}`,
      );
    }
  }

  private mapModel(model: string): string {
    // Map our generic model names to DeepSeek specific models
    const modelMap: Record<string, string> = {
      'deepseek-chat': 'deepseek-chat',
      'deepseek-coder': 'deepseek-coder',
      'gpt-4': 'deepseek-chat', // Fallback to DeepSeek chat
      'gpt-3.5-turbo': 'deepseek-chat',
      'claude-3': 'deepseek-chat',
    };

    return modelMap[model] || 'deepseek-chat';
  }

  private calculateCost(tokensUsed: number, model: string): number {
    // DeepSeek pricing (approximate - check current pricing)
    const pricingMap: Record<string, { input: number; output: number }> = {
      'deepseek-chat': { input: 0.00014, output: 0.00028 }, // per 1K tokens
      'deepseek-coder': { input: 0.00014, output: 0.00028 },
    };

    const pricing =
      pricingMap[this.mapModel(model)] || pricingMap['deepseek-chat'];

    // Simplified cost calculation (assuming 50/50 input/output split)
    const inputTokens = tokensUsed * 0.5;
    const outputTokens = tokensUsed * 0.5;

    return (inputTokens * pricing.input + outputTokens * pricing.output) / 1000;
  }

  async testConnection(): Promise<boolean> {
    try {
      const testResponse = await this.callLLM({
        prompt: 'Hello, this is a test. Please respond with "Test successful".',
        model: 'deepseek-chat',
        temperature: 0.1,
        maxTokens: 50,
      });

      return testResponse.response.toLowerCase().includes('test successful');
    } catch (error) {
      this.logger.error('DeepSeek connection test failed', error.stack);
      return false;
    }
  }
}
