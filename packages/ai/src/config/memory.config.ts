export type MemoryType = 'conversation' | 'vector' | 'cache' | 'persistent';
export type MemoryBackend = 'in-memory' | 'redis' | 'postgres' | 'chroma' | 'pinecone' | 'weaviate';

export interface MemoryBaseConfig {
  enabled: boolean;
  type: MemoryType;
  backend: MemoryBackend;
  ttl?: number; // seconds
  maxSize?: number; // max entries or size in MB
}

export interface ConversationMemoryConfig extends MemoryBaseConfig {
  type: 'conversation';
  maxHistory: number; // max number of messages to keep
  includeMetadata: boolean;
  summarizeThreshold?: number; // number of messages after which to summarize
}

export interface VectorMemoryConfig extends MemoryBaseConfig {
  type: 'vector';
  dimensions: number;
  distanceMetric: 'cosine' | 'euclidean' | 'dot';
  collectionName: string;
  embeddingModel: string;
}

export interface CacheMemoryConfig extends MemoryBaseConfig {
  type: 'cache';
  strategy: 'lru' | 'ttl' | 'fifo';
  maxItems: number;
}

export interface PersistentMemoryConfig extends MemoryBaseConfig {
  type: 'persistent';
  persistInterval: number; // seconds
  backupCount: number;
  encryption: boolean;
}

export type MemoryConfig = 
  | ConversationMemoryConfig 
  | VectorMemoryConfig 
  | CacheMemoryConfig 
  | PersistentMemoryConfig;

export interface MemoryManagerConfig {
  defaultBackend: MemoryBackend;
  memories: Record<string, MemoryConfig>;
  redis?: {
    url: string;
    tls?: boolean;
  };
  postgres?: {
    connectionString: string;
    tablePrefix?: string;
  };
  vectorStores?: {
    chroma?: {
      url: string;
    };
    pinecone?: {
      apiKey: string;
      environment: string;
    };
    weaviate?: {
      url: string;
      apiKey?: string;
    };
  };
  security: {
    encryptionKey?: string;
    encryptAtRest: boolean;
  };
}

export const defaultMemoryConfig: MemoryManagerConfig = {
  defaultBackend: 'in-memory',
  memories: {
    conversation: {
      type: 'conversation',
      backend: 'in-memory',
      enabled: true,
      maxHistory: 10,
      includeMetadata: true,
      summarizeThreshold: 20,
      ttl: 86400, // 24 hours
    },
    vector: {
      type: 'vector',
      backend: 'in-memory',
      enabled: true,
      dimensions: 1536, // Default for text-embedding-3-small
      distanceMetric: 'cosine',
      collectionName: 'default',
      embeddingModel: 'text-embedding-3-small',
      ttl: 604800, // 1 week
    },
    cache: {
      type: 'cache',
      backend: 'in-memory',
      enabled: true,
      strategy: 'lru',
      maxItems: 1000,
      ttl: 3600, // 1 hour
    },
    persistent: {
      type: 'persistent',
      backend: 'in-memory',
      enabled: false, // Disabled by default as it requires setup
      persistInterval: 300, // 5 minutes
      backupCount: 3,
      encryption: true,
    },
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    tls: process.env.REDIS_TLS === 'true',
  },
  postgres: {
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/ai_memory',
    tablePrefix: 'memory_',
  },
  vectorStores: {
    chroma: {
      url: process.env.CHROMA_URL || 'http://localhost:8000',
    },
    pinecone: {
      apiKey: process.env.PINECONE_API_KEY || '',
      environment: process.env.PINECONE_ENVIRONMENT || 'us-west1-gcp',
    },
    weaviate: {
      url: process.env.WEAVIATE_URL || 'http://localhost:8080',
      apiKey: process.env.WEAVIATE_API_KEY,
    },
  },
  security: {
    encryptionKey: process.env.MEMORY_ENCRYPTION_KEY,
    encryptAtRest: process.env.ENCRYPT_AT_REST === 'true',
  },
};

export function createMemoryConfig(overrides: Partial<MemoryManagerConfig> = {}): MemoryManagerConfig {
  return {
    ...defaultMemoryConfig,
    ...overrides,
    memories: {
      ...defaultMemoryConfig.memories,
      ...overrides.memories,
    },
    redis: {
      ...defaultMemoryConfig.redis,
      ...overrides.redis,
    },
    postgres: {
      ...defaultMemoryConfig.postgres,
      ...overrides.postgres,
    },
    vectorStores: {
      ...defaultMemoryConfig.vectorStores,
      ...overrides.vectorStores,
    },
    security: {
      ...defaultMemoryConfig.security,
      ...overrides.security,
    },
  };
}

export function validateMemoryConfig(config: MemoryManagerConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate backend configurations if they're enabled
  if (Object.values(config.memories).some(m => m.backend === 'redis' && !config.redis?.url)) {
    errors.push('Redis URL is required when using Redis backend');
  }

  if (Object.values(config.memories).some(m => m.backend === 'postgres' && !config.postgres?.connectionString)) {
    errors.push('PostgreSQL connection string is required when using PostgreSQL backend');
  }

  // Validate vector store configurations if they're used
  if (Object.values(config.memories).some(m => m.type === 'vector' && m.backend === 'pinecone' && !config.vectorStores?.pinecone?.apiKey)) {
    errors.push('Pinecone API key is required when using Pinecone vector store');
  }

  // Validate security settings
  if (config.security.encryptAtRest && !config.security.encryptionKey) {
    errors.push('Encryption key is required when encryption at rest is enabled');
  }

  // Validate individual memory configurations
  Object.entries(config.memories).forEach(([name, memory]) => {
    if (memory.enabled) {
      if (memory.ttl && memory.ttl <= 0) {
        errors.push(`Memory '${name}': TTL must be positive`);
      }
      
      if ('maxSize' in memory && memory.maxSize && memory.maxSize <= 0) {
        errors.push(`Memory '${name}': Max size must be positive`);
      }

      if (memory.type === 'conversation' && memory.summarizeThreshold && memory.summarizeThreshold <= 0) {
        errors.push(`Memory '${name}': Summarize threshold must be positive`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Helper function to get memory configuration by type
export function getMemoryConfig<T extends MemoryConfig>(
  config: MemoryManagerConfig,
  type: T['type']
): T | undefined {
  return Object.values(config.memories).find(m => m.type === type) as T | undefined;
}

// Helper to get backend URL based on backend type
export function getBackendUrl(config: MemoryManagerConfig, backend: MemoryBackend): string | undefined {
  switch (backend) {
    case 'redis':
      return config.redis?.url;
    case 'postgres':
      return config.postgres?.connectionString;
    case 'chroma':
      return config.vectorStores?.chroma?.url;
    case 'pinecone':
      return `https://${config.vectorStores?.pinecone?.environment}.pinecone.io`;
    case 'weaviate':
      return config.vectorStores?.weaviate?.url;
    case 'in-memory':
    default:
      return undefined;
  }
}