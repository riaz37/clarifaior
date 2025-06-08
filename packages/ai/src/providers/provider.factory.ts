import { LLMProviderConfig } from "@ai/config/llm.config";
import { BaseLLMProvider } from "./base.provider";
import { DeepSeekProvider } from "./deepseek.provider";
import { OpenAIProvider } from "./openai.provider";

export type ProviderType = "openai" | "deepseek";

export class ProviderFactory {
  private static providers = new Map<string, BaseLLMProvider>();

  static createProvider(
    type: ProviderType,
    config: Omit<LLMProviderConfig, "provider">
  ): BaseLLMProvider {
    // Create provider-specific config with the provider type
    const providerConfig: LLMProviderConfig = {
      ...config,
      provider: type,
    } as const;

    const cacheKey = `${type}-${config.model}-${config.apiKey?.slice(-8) || "default"}`;

    // Return cached provider if exists
    const cachedProvider = this.providers.get(cacheKey);
    if (cachedProvider) {
      return cachedProvider;
    }

    // Create new provider with appropriate type
    let provider: BaseLLMProvider;
    switch (type) {
      case "openai":
        provider = new OpenAIProvider({
          ...providerConfig,
          baseUrl: config.baseUrl || "https://api.openai.com/v1",
        });
        break;
      case "deepseek":
        provider = new DeepSeekProvider({
          ...providerConfig,
          baseUrl: config.baseUrl || "https://api.deepseek.com/v1",
        });
        break;
      default:
        throw new Error(`Unsupported provider type: ${type}`);
    }

    // Cache the provider
    this.providers.set(cacheKey, provider);
    return provider;
  }

  static getSupportedProviders(): ProviderType[] {
    return ["deepseek", "openai"];
  }

  static clearCache(): void {
    this.providers.clear();
  }

  static getProvider(cacheKey: string): BaseLLMProvider | undefined {
    return this.providers.get(cacheKey);
  }

  static removeProvider(cacheKey: string): boolean {
    return this.providers.delete(cacheKey);
  }
}
