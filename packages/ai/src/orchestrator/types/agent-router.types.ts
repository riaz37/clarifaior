import { Logger } from '../../utils/logger';

export interface AgentCapabilities {
  [key: string]: {
    weight: number;
    priority?: number;
    metadata?: Record<string, any>;
  };
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  capabilities: AgentCapabilities;
  isAvailable: () => Promise<boolean>;
  handle: (request: any, context?: any) => Promise<any>;
  getLoad?: () => Promise<number>;
  getMetadata?: () => Record<string, any>;
  version?: string;
  timeout?: number;
}

export interface RoutingRule {
  condition: (request: any, context?: any) => boolean | Promise<boolean>;
  targetAgentId: string;
  priority?: number;
  metadata?: Record<string, any>;
}

export interface RouterConfig {
  defaultAgentId?: string;
  enableLoadBalancing?: boolean;
  enableFallback?: boolean;
  requestTimeout?: number;
  maxRetries?: number;
  logger?: Logger;
}

export interface AgentStats {
  requestCount: number;
  errorCount: number;
  averageTime: number;
  lastUsed: Date | null;
}

export interface RouterMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  agentStats: Record<string, AgentStats>;
}

export interface AgentMatch {
  agent: Agent;
  score: number;
  reason?: string;
}

export interface AgentResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string | number;
    details?: any;
  };
  metadata?: {
    agentId: string;
    duration: number;
    timestamp: Date;
  };
}

export interface AgentRequest<T = any> {
  id?: string;
  type: string;
  payload: T;
  context?: Record<string, any>;
  metadata?: {
    timestamp?: Date;
    priority?: number;
    timeout?: number;
    retryCount?: number;
  };
}

export interface AgentRegistrationOptions {
  autoStart?: boolean;
  healthCheckInterval?: number;
  maxConcurrentRequests?: number;
  circuitBreaker?: {
    enabled: boolean;
    failureThreshold: number;
    resetTimeout: number;
  };
}

export interface AgentHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastChecked: Date;
  uptime: number;
  metrics: {
    requestRate: number;
    errorRate: number;
    averageResponseTime: number;
    activeRequests: number;
  };
  resources?: {
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
    };
    cpu: {
      user: number;
      system: number;
    };
  };
  errors?: Array<{
    message: string;
    timestamp: Date;
    details?: any;
  }>;
}

export interface AgentDiscoveryOptions {
  discoveryInterval?: number;
  discoveryTimeout?: number;
  filter?: (agent: Agent) => boolean;
  onAgentAdded?: (agent: Agent) => void;
  onAgentRemoved?: (agentId: string) => void;
}

export interface AgentLoadBalancingOptions {
  strategy: 'round-robin' | 'least-connections' | 'random' | 'weighted';
  weights?: Record<string, number>;
  healthCheck?: boolean;
  healthCheckInterval?: number;
}

export interface AgentRouterEvents {
  'agent:registered': (agent: Agent) => void;
  'agent:unregistered': (agentId: string) => void;
  'request:start': (request: AgentRequest) => void;
  'request:complete': (request: AgentRequest, response: AgentResponse, duration: number) => void;
  'request:error': (request: AgentRequest, error: Error) => void;
  'health:check': (status: AgentHealthStatus) => void;
  'error': (error: Error) => void;
}
