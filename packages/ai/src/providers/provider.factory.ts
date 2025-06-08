import { BaseLLMProvider, LLMConfig } from "./base.provider";
import { DeepSeekProvider } from "./deepseek.provider";
import { OpenAIProvider } from "./openai.provider";

export type ProviderType = "deepseek" | "openai" | "anthropic" | "google";

export interface ProviderConfig extends LLMConfig {
  provider: ProviderType;
  [key: string]: any;
}

export class ProviderFactory {
  private static providers = new Map<string, BaseLLMProvider>();

  static createProvider(config: ProviderConfig): BaseLLMProvider {
    const cacheKey = `${config.provider}-${config.model}-${config.apiKey.slice(-8)}`;

    // Return cached provider if exists
    if (this.providers.has(cacheKey)) {
      return this.providers.get(cacheKey)!;
    }

    let provider: BaseLLMProvider;

    switch (config.provider) {
      case "deepseek":
        provider = new DeepSeekProvider(config);
        break;

      case "openai":
        provider = new OpenAIProvider(config);
        break;

      case "anthropic":
        throw new Error("Anthropic provider not yet implemented");

      case "google":
        throw new Error("Google provider not yet implemented");

      default:
        throw new Error(`Unknown provider: ${config.provider}`);
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
