import {
  BaseLLMProvider,
  LLMConfig,
  LLMResponse,
  EmbeddingResponse,
  StreamingResponse,
} from "./base.provider";
import OpenAI from "openai";

// Configuration from environment
const OPENROUTER_API_KEY =
  process.env.OPENROUTER_API_KEY ||
  " npx ts-node --transpile-only src/test-llm.ts";
const SITE_URL = process.env.SITE_URL || "http://localhost:3000";
const SITE_NAME = process.env.SITE_NAME || "Local Development";

interface OpenAIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface DeepSeekConfig extends Omit<LLMConfig, "model"> {
  baseUrl?: string;
  openRouterApiKey?: string;
  siteUrl?: string;
  siteName?: string;
  model: string; // Make model required in the config
}

export class DeepSeekProvider extends BaseLLMProvider {
  private openai: OpenAI;
  private openRouterApiKey: string;
  private siteUrl: string;
  private siteName: string;
  private model: string;

  constructor(config: DeepSeekConfig) {
    super(config, "DeepSeek");

    // Use provided config or fall back to environment variables
    this.openRouterApiKey = config.openRouterApiKey || OPENROUTER_API_KEY;
    this.siteUrl = config.siteUrl || SITE_URL;
    this.siteName = config.siteName || SITE_NAME;
    this.model = config.model || "deepseek/deepseek-r1-0528:free";

    if (!this.openRouterApiKey) {
      throw new Error(
        "OpenRouter API key is required. Set OPENROUTER_API_KEY in your environment variables."
      );
    }

    this.openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: this.openRouterApiKey,
      defaultHeaders: {
        "HTTP-Referer": this.siteUrl,
        "X-Title": this.siteName,
      },
    });

    this.validateConfig();
  }

  async generateCompletion(
    prompt: string,
    options?: Partial<LLMConfig>
  ): Promise<LLMResponse> {
    const requestConfig = { ...this.config, ...options };

    try {
      const messages: OpenAIMessage[] = [
        {
          role: "user",
          content: prompt,
        },
      ];

      const completion = await this.openai.chat.completions.create(
        {
          model: this.model,
          messages,
          temperature: requestConfig.temperature || 0.7,
          max_tokens: requestConfig.maxTokens || 1000,
        },
        {
          headers: {
            "HTTP-Referer": this.siteUrl,
            "X-Title": this.siteName,
          },
        }
      );

      return {
        content: completion.choices[0]?.message?.content || "",
        model: completion.model,
        tokensUsed: completion.usage?.total_tokens || 0,
        cost: this.calculateCost(
          completion.usage?.total_tokens || 0,
          completion.model
        ),
        metadata: {
          finishReason: completion.choices[0]?.finish_reason,
          usage: completion.usage,
        },
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("DeepSeek completion error:", error);
      throw new Error(`DeepSeek completion failed: ${errorMessage}`);
    }
  }

  async generateEmbedding(
    text: string,
    options?: Partial<LLMConfig>
  ): Promise<EmbeddingResponse> {
    const requestConfig = { ...this.config, ...options };

    try {
      const response = await this.openai.embeddings.create(
        {
          model: requestConfig.model || "text-embedding-ada-002",
          input: text,
        },
        {
          headers: {
            "HTTP-Referer": this.siteUrl,
            "X-Title": this.siteName,
          },
        }
      );

      return {
        embedding: response.data[0].embedding,
        model: response.model,
        tokensUsed: response.usage?.total_tokens || 0,
        cost: this.calculateCost(
          response.usage?.total_tokens || 0,
          response.model
        ),
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("DeepSeek embedding error:", error);
      throw new Error(`DeepSeek embedding failed: ${errorMessage}`);
    }
  }

  async *streamCompletion(
    prompt: string,
    options?: Partial<LLMConfig>
  ): AsyncGenerator<StreamingResponse> {
    const requestConfig = { ...this.config, ...options };

    try {
      const response = await fetch(
        `https://api.deepseek.com/v1/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${requestConfig.apiKey}`,
          },
          body: JSON.stringify({
            model: requestConfig.model,
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: requestConfig.temperature || 0.7,
            max_tokens: requestConfig.maxTokens || 1000,
            stream: true,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `DeepSeek API error: ${response.status} ${response.statusText}`
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Failed to get response reader");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          yield {
            content: "",
            done: true,
            model: requestConfig.model,
          };
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || "";

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
    const pricePerToken = model.includes("chat")
      ? 0.00014 / 1000
      : 0.00007 / 1000;
    return tokensUsed * pricePerToken;
  }
}
