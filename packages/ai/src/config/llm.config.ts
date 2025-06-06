export interface LLMProviderConfig {
  provider: 'deepseek' | 'openai' | 'anthropic' | 'google';
  apiKey: string;
  model: string;
  baseUrl?: string;
  organization?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  retries?: number;
}

export interface LLMConfig {
  defaultProvider: LLMProviderConfig;
  fallbackProviders: LLMProviderConfig[];
  enableCaching: boolean;
  cacheConfig: {
    ttl: number; // seconds
    maxSize: number; // number of entries
    strategy: 'lru' | 'fifo' | 'ttl';
  };
  rateLimiting: {
    enabled: boolean;
    requestsPerMinute: number;
    requestsPerHour: number;
    burstLimit: number;
  };
  monitoring: {
    enabled: boolean;
    trackTokenUsage: boolean;
    trackCosts: boolean;
    trackLatency: boolean;
    alertThresholds: {
      costPerHour: number;
      tokensPerHour: number;
      errorRate: number;
    };
  };
  security: {
    enableContentFiltering: boolean;
    enablePromptInjectionDetection: boolean;
    maxPromptLength: number;
    sensitiveDataDetection: boolean;
  };
}

export const defaultLLMConfig: LLMConfig = {
  defaultProvider: {
    provider: 'deepseek',
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    model: 'deepseek-chat',
    temperature: 0.7,
    maxTokens: 2000,
    timeout: 30000,
    retries: 3,
  },
  fallbackProviders: [
    {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY || '',
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 2000,
      timeout: 30000,
      retries: 2,
    },
  ],
  enableCaching: true,
  cacheConfig: {
    ttl: 3600, // 1 hour
    maxSize: 1000,
    strategy: 'lru',
  },
  rateLimiting: {
    enabled: true,
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    burstLimit: 10,
  },
  monitoring: {
    enabled: true,
    trackTokenUsage: true,
    trackCosts: true,
    trackLatency: true,
    alertThresholds: {
      costPerHour: 10.0,
      tokensPerHour: 100000,
      errorRate: 0.05,
    },
  },
  security: {
    enableContentFiltering: true,
    enablePromptInjectionDetection: true,
    maxPromptLength: 50000,
    sensitiveDataDetection: true,
  },
};

export function validateLLMConfig(config: LLMConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate default provider
  if (!config.defaultProvider.apiKey) {
    errors.push('Default provider API key is required');
  }

  if (!config.defaultProvider.model) {
    errors.push('Default provider model is required');
  }

  // Validate fallback providers
  config.fallbackProviders.forEach((provider, index) => {
    if (!provider.apiKey) {
      errors.push(`Fallback provider ${index} API key is required`);
    }
    if (!provider.model) {
      errors.push(`Fallback provider ${index} model is required`);
    }
  });

  // Validate rate limiting
  if (config.rateLimiting.enabled) {
    if (config.rateLimiting.requestsPerMinute <= 0) {
      errors.push('Requests per minute must be positive');
    }
    if (config.rateLimiting.requestsPerHour <= 0) {
      errors.push('Requests per hour must be positive');
    }
  }

  // Validate cache config
  if (config.enableCaching) {
    if (config.cacheConfig.ttl <= 0) {
      errors.push('Cache TTL must be positive');
    }
    if (config.cacheConfig.maxSize <= 0) {
      errors.push('Cache max size must be positive');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function createLLMConfig(overrides: Partial<LLMConfig> = {}): LLMConfig {
  return {
    ...defaultLLMConfig,
    ...overrides,
    defaultProvider: {
      ...defaultLLMConfig.defaultProvider,
      ...overrides.defaultProvider,
    },
    fallbackProviders: overrides.fallbackProviders || defaultLLMConfig.fallbackProviders,
    cacheConfig: {
      ...defaultLLMConfig.cacheConfig,
      ...overrides.cacheConfig,
    },
    rateLimiting: {
      ...defaultLLMConfig.rateLimiting,
      ...overrides.rateLimiting,
    },
    monitoring: {
      ...defaultLLMConfig.monitoring,
      ...overrides.monitoring,
    },
    security: {
      ...defaultLLMConfig.security,
      ...overrides.security,
    },
  };
}