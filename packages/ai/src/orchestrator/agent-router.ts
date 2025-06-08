import { Logger } from '../../utils/logger';
import {
  Agent,
  AgentCapabilities,
  RouterConfig,
  RouterMetrics,
  RoutingRule,
  AgentMatch,
  AgentRequest,
  AgentResponse,
  AgentStats
} from './types/agent-router.types';

export class AgentRouter {
  private agents: Map<string, Agent>;
  private routingRules: RoutingRule[];
  private config: Required<RouterConfig>;
  private metrics: RouterMetrics;
  private logger: Logger;
  private isProcessing: boolean;
  private requestQueue: Array<{
    request: AgentRequest;
    context?: Record<string, any>;
    resolve: (value: AgentResponse | PromiseLike<AgentResponse>) => void;
    reject: (reason?: any) => void;
  }>;

  constructor(config: RouterConfig = {}) {
    this.agents = new Map();
    this.routingRules = [];
    this.config = {
      defaultAgentId: '',
      enableLoadBalancing: true,
      enableFallback: true,
      requestTimeout: 30000, // 30 seconds
      maxRetries: 3,
      logger: new Logger('AgentRouter'),
      ...config,
    };
    this.logger = this.config.logger!;
    this.isProcessing = false;
    this.requestQueue = [];
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      agentStats: {},
    };
  }

  /**
   * Register a new agent with the router
   */
  registerAgent(agent: Agent): void {
    if (this.agents.has(agent.id)) {
      this.logger.warn(`Agent with ID ${agent.id} already exists. Updating.`);
    }
    this.agents.set(agent.id, agent);
    
    // Initialize metrics for the agent
    if (!this.metrics.agentStats[agent.id]) {
      this.metrics.agentStats[agent.id] = {
        requestCount: 0,
        errorCount: 0,
        averageTime: 0,
        lastUsed: null,
      };
    }
    
    this.logger.info(`Registered agent: ${agent.name} (${agent.id})`);
  }

  /**
   * Unregister an agent from the router
   */
  unregisterAgent(agentId: string): boolean {
    const result = this.agents.delete(agentId);
    if (result) {
      delete this.metrics.agentStats[agentId];
      this.logger.info(`Unregistered agent: ${agentId}`);
    } else {
      this.logger.warn(`Attempted to unregister non-existent agent: ${agentId}`);
    }
    return result;
  }

  /**
   * Add a routing rule to the router
   */
  addRoutingRule(rule: RoutingRule): void {
    this.routingRules.push({
      priority: 0,
      ...rule,
    });
    // Sort rules by priority (highest first)
    this.routingRules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    this.logger.info(`Added routing rule for agent: ${rule.targetAgentId}`);
  }

  /**
   * Remove a routing rule from the router
   */
  removeRoutingRule(condition: (request: AgentRequest) => boolean): void {
    const initialLength = this.routingRules.length;
    this.routingRules = this.routingRules.filter(rule => rule.condition !== condition);
    const removed = initialLength - this.routingRules.length;
    if (removed > 0) {
      this.logger.info(`Removed ${removed} routing rules`);
    }
  }

  /**
   * Route a request to the most suitable agent
   */
  async route(request: AgentRequest, context: Record<string, any> = {}): Promise<AgentResponse> {
    const startTime = Date.now();
    this.metrics.totalRequests++;
    
    try {
      // Find the most suitable agent
      const { agent, reason } = await this.findSuitableAgent(request, context);
      
      if (!agent) {
        throw new Error('No suitable agent found to handle the request');
      }
      
      this.logger.debug(`Routing request to agent: ${agent.name} (${agent.id}) - ${reason}`);
      
      // Update agent metrics
      const agentStats = this.metrics.agentStats[agent.id];
      agentStats.requestCount++;
      agentStats.lastUsed = new Date();
      
      // Execute the request with timeout
      const result = await this.executeWithTimeout(
        agent.handle(request, context),
        agent.timeout || this.config.requestTimeout
      ) as AgentResponse;
      
      // Update metrics
      const duration = Date.now() - startTime;
      this.updateMetrics(agent.id, duration, false);
      
      return result;
      
    } catch (error) {
      // Update metrics
      const duration = Date.now() - startTime;
      this.metrics.failedRequests++;
      
      if (error && typeof error === 'object' && 'agentId' in error) {
        const agentStats = this.metrics.agentStats[error.agentId as string];
        if (agentStats) {
          agentStats.errorCount++;
        }
      }
      
      this.logger.error('Request routing failed:', error);
      
      if (this.config.enableFallback && this.config.defaultAgentId) {
        this.logger.info('Attempting fallback to default agent');
        return this.handleFallback(request, context);
      }
      
      throw error;
    }
  }

  /**
   * Process the request queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    try {
      while (this.requestQueue.length > 0) {
        const { request, context, resolve, reject } = this.requestQueue.shift()!;
        
        try {
          const result = await this.route(request, context);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Queue a request for processing
   */
  queueRequest(request: AgentRequest, context: Record<string, any> = {}): Promise<AgentResponse> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ request, context, resolve, reject });
      this.processQueue().catch(error => {
        this.logger.error('Error processing queue:', error);
      });
    });
  }

  /**
   * Get the current router metrics
   */
  getMetrics(): RouterMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset the router metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      agentStats: Object.fromEntries(
        Object.keys(this.metrics.agentStats).map(agentId => [
          agentId,
          {
            requestCount: 0,
            errorCount: 0,
            averageTime: 0,
            lastUsed: null,
          },
        ])
      ),
    };
  }

  /**
   * Find the most suitable agent for a request
   */
  private async findSuitableAgent(
    request: AgentRequest,
    context: Record<string, any>
  ): Promise<{ agent: Agent | null; reason: string }> {
    // Check routing rules first
    for (const rule of this.routingRules) {
      try {
        const matches = await rule.condition(request, context);
        if (matches) {
          const agent = this.agents.get(rule.targetAgentId);
          if (agent && await this.isAgentAvailable(agent)) {
            return {
              agent,
              reason: `Matched routing rule with priority ${rule.priority}`,
            };
          }
        }
      } catch (error) {
        this.logger.error('Error evaluating routing rule:', error);
      }
    }

    // If no rules match, find agent by capability matching
    if (request.payload && typeof request.payload === 'object' && 'capability' in request.payload) {
      const capableAgents = await this.findAgentsByCapability(
        request.payload.capability as string,
        (request.payload as any).capabilityWeight || 0.5
      );

      if (capableAgents.length > 0) {
        return {
          agent: capableAgents[0].agent,
          reason: `Best match for capability: ${request.payload.capability}`,
        };
      }
    }

    // Fall back to default agent if available
    if (this.config.defaultAgentId) {
      const defaultAgent = this.agents.get(this.config.defaultAgentId);
      if (defaultAgent && await this.isAgentAvailable(defaultAgent)) {
        return { agent: defaultAgent, reason: 'Using default agent' };
      }
    }

    return { agent: null, reason: 'No suitable agent found' };
  }

  /**
   * Find agents that match a specific capability
   */
  private async findAgentsByCapability(
    capability: string,
    minWeight: number = 0.5
  ): Promise<AgentMatch[]> {
    const capableAgents: AgentMatch[] = [];

    for (const [_, agent] of this.agents.entries()) {
      if (await this.isAgentAvailable(agent)) {
        const capabilityInfo = agent.capabilities[capability];
        
        if (capabilityInfo && capabilityInfo.weight >= minWeight) {
          // Calculate a score based on capability weight, priority, and load
          let score = capabilityInfo.weight;
          
          // Adjust score based on agent priority (if available)
          if (capabilityInfo.priority) {
            score *= (capabilityInfo.priority / 10);
          }
          
          // Adjust score based on agent load (if available)
          if (this.config.enableLoadBalancing && agent.getLoad) {
            try {
              const load = await agent.getLoad();
              score *= (1 - Math.min(load, 0.9)); // Reduce score based on load, but never below 10%
            } catch (error) {
              this.logger.error(`Error getting load for agent ${agent.id}:`, error);
            }
          }
          
          capableAgents.push({ agent, score });
        }
      }
    }

    // Sort by score (highest first)
    return capableAgents.sort((a, b) => b.score - a.score);
  }

  /**
   * Check if an agent is available to handle a request
   */
  private async isAgentAvailable(agent: Agent): Promise<boolean> {
    try {
      return await agent.isAvailable();
    } catch (error) {
      this.logger.error(`Error checking availability for agent ${agent.id}:`, error);
      return false;
    }
  }

  /**
   * Handle fallback to default agent
   */
  private async handleFallback(
    request: AgentRequest,
    context: Record<string, any>
  ): Promise<AgentResponse> {
    const defaultAgent = this.agents.get(this.config.defaultAgentId!);
    if (!defaultAgent) {
      throw new Error('No default agent available for fallback');
    }

    this.logger.info(`Falling back to default agent: ${defaultAgent.name} (${defaultAgent.id})`);
    
    try {
      const result = await this.executeWithTimeout(
        defaultAgent.handle(request, context),
        defaultAgent.timeout || this.config.requestTimeout
      ) as AgentResponse;
      
      // Update metrics
      this.metrics.successfulRequests++;
      const agentStats = this.metrics.agentStats[defaultAgent.id];
      if (agentStats) {
        agentStats.requestCount++;
        agentStats.lastUsed = new Date();
      }
      
      return result;
    } catch (error) {
      this.metrics.failedRequests++;
      const agentStats = this.metrics.agentStats[defaultAgent.id];
      if (agentStats) {
        agentStats.errorCount++;
      }
      throw error;
    }
  }

  /**
   * Execute a promise with a timeout
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    let timeout: NodeJS.Timeout;
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        reject(new Error(`Request timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timeout!);
    }
  }

  /**
   * Update metrics after a request
   */
  private updateMetrics(agentId: string, duration: number, isError: boolean): void {
    this.metrics.successfulRequests++;
    
    // Update average response time
    this.metrics.averageResponseTime = 
      ((this.metrics.averageResponseTime * (this.metrics.totalRequests - 1)) + duration) / 
      this.metrics.totalRequests;
    
    // Update agent-specific metrics
    const agentStats = this.metrics.agentStats[agentId];
    if (agentStats) {
      agentStats.averageTime = 
        ((agentStats.averageTime * (agentStats.requestCount - 1)) + duration) / 
        agentStats.requestCount;
      
      if (isError) {
        agentStats.errorCount++;
      }
    }
  }
}
