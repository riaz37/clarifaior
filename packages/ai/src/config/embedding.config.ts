export type EmbeddingProviderType = 'openai' | 'cohere' | 'huggingface' | 'tensorflow' | 'custom';

export interface EmbeddingProviderConfig {
  provider: EmbeddingProviderType;
  apiKey: string;
  model: string;
  dimensions?: number;
  batchSize?: number;
  timeout?: number;
  retries?: number;
  baseUrl?: string;
  headers?: Record<string, string>;
}

export interface EmbeddingCacheConfig {
  enabled: boolean;
  ttl: number; // seconds
  maxSize: number; // number of embeddings to cache
  strategy: 'lru' | 'fifo' | 'ttl';
}

export interface EmbeddingRateLimiting {
  enabled: boolean;
  requestsPerMinute: number;
  tokensPerMinute: number;
}

export interface EmbeddingMonitoring {
  enabled: boolean;
  trackUsage: boolean;
  trackLatency: boolean;
  trackErrors: boolean;
  alertThresholds: {
    errorRate: number;
    p99Latency: number; // ms
  };
}

export interface EmbeddingConfig {
  defaultProvider: EmbeddingProviderConfig;
  fallbackProviders: EmbeddingProviderConfig[];
  cache: EmbeddingCacheConfig;
  rateLimiting: EmbeddingRateLimiting;
  monitoring: EmbeddingMonitoring;
  security: {
    enableContentFiltering: boolean;
    maxTextLength: number;
  };
}

export const defaultEmbeddingConfig: EmbeddingConfig = {
  defaultProvider: {
    provider: 'openai',
    apiKey: process.env.OPENAI_EMBEDDING_API_KEY || process.env.OPENAI_API_KEY || '',
    model: 'text-embedding-3-small',
    dimensions: 1536,
    batchSize: 32,
    timeout: 30000,
    retries: 3,
  },
  fallbackProviders: [
    {
      provider: 'huggingface',
      apiKey: process.env.HUGGINGFACE_API_KEY || '',
      model: 'sentence-transformers/all-mpnet-base-v2',
      dimensions: 768,
    },
  ],
  cache: {
    enabled: true,
    ttl: 604800, // 1 week
    maxSize: 10000,
    strategy: 'lru',
  },
  rateLimiting: {
    enabled: true,
    requestsPerMinute: 60,
    tokensPerMinute: 1000000,
  },
  monitoring: {
    enabled: true,
    trackUsage: true,
    trackLatency: true,
    trackErrors: true,
    alertThresholds: {
      errorRate: 0.05, // 5%
      p99Latency: 1000, // 1 second
    },
  },
  security: {
    enableContentFiltering: true,
    maxTextLength: 10000,
  },
};

export function createEmbeddingConfig(overrides: Partial<EmbeddingConfig> = {}): EmbeddingConfig {
  return {
    ...defaultEmbeddingConfig,
    ...overrides,
    defaultProvider: {
      ...defaultEmbeddingConfig.defaultProvider,
      ...overrides.defaultProvider,
    },
    fallbackProviders: overrides.fallbackProviders || defaultEmbeddingConfig.fallbackProviders,
    cache: {
      ...defaultEmbeddingConfig.cache,
      ...overrides.cache,
    },
    rateLimiting: {
      ...defaultEmbeddingConfig.rateLimiting,
      ...overrides.rateLimiting,
    },
    monitoring: {
      ...defaultEmbeddingConfig.monitoring,
      ...overrides.monitoring,
      alertThresholds: {
        ...defaultEmbeddingConfig.monitoring.alertThresholds,
        ...overrides.monitoring?.alertThresholds,
      },
    },
    security: {
      ...defaultEmbeddingConfig.security,
      ...overrides.security,
    },
  };
}

export function validateEmbeddingConfig(config: EmbeddingConfig): { valid: boolean; errors: string[] } {
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

  // Validate cache config
  if (config.cache.enabled) {
    if (config.cache.ttl <= 0) {
      errors.push('Cache TTL must be positive');
    }
    if (config.cache.maxSize <= 0) {
      errors.push('Cache max size must be positive');
    }
  }

  // Validate rate limiting
  if (config.rateLimiting.enabled) {
    if (config.rateLimiting.requestsPerMinute <= 0) {
      errors.push('Requests per minute must be positive');
    }
    if (config.rateLimiting.tokensPerMinute <= 0) {
      errors.push('Tokens per minute must be positive');
    }
  }

  // Validate security
  if (config.security.maxTextLength <= 0) {
    errors.push('Max text length must be positive');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Helper function to get provider config by type
export function getProviderConfig(
  config: EmbeddingConfig,
  providerType?: EmbeddingProviderType
): EmbeddingProviderConfig {
  if (providerType && providerType !== config.defaultProvider.provider) {
    const fallback = config.fallbackProviders.find(p => p.provider === providerType);
    if (fallback) return fallback;
  }
  return config.defaultProvider;
}