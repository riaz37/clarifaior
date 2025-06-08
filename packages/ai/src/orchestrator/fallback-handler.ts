import { Logger } from '@ai/utils/logger';
import { Agent, AgentRequest, AgentResponse } from './types/agent-router.types';

/**
 * Configuration options for the FallbackHandler
 */
export interface FallbackHandlerConfig {
  /** Maximum number of retry attempts before giving up */
  maxRetries?: number;
  
  /** Delay between retry attempts in milliseconds */
  retryDelay?: number;
  
  /** Whether to enable circuit breaking for failed requests */
  enableCircuitBreaker?: boolean;
  
  /** Number of failures after which the circuit will open */
  circuitBreakerThreshold?: number;
  
  /** Time in milliseconds after which to attempt closing the circuit */
  circuitBreakerResetTimeout?: number;
  
  /** Logger instance */
  logger?: Logger;
}

/**
 * Circuit state for the fallback handler
 */
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * FallbackHandler handles fallback scenarios when primary agent fails
 */
export class FallbackHandler {
  private readonly config: Required<FallbackHandlerConfig>;
  private readonly logger: Logger;
  private circuitState: CircuitState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private circuitOpenTime: number | null = null;

  constructor(config: FallbackHandlerConfig = {}) {
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 5,
      circuitBreakerResetTimeout: 30000, // 30 seconds
      logger: new Logger('FallbackHandler'),
      ...config,
    };
    this.logger = this.config.logger;
  }

  /**
   * Handles a failed request with fallback logic
   * @param request The original request that failed
   * @param error The error that occurred
   * @param fallbackAgents Array of fallback agents to try
   * @param context Additional context for the request
   * @returns A promise that resolves to the fallback response or rejects if all fallbacks fail
   */
  async handleFailure<T = any>(
    request: AgentRequest,
    error: Error,
    fallbackAgents: Agent[],
    context?: Record<string, any>
  ): Promise<AgentResponse<T>> {
    // Check circuit breaker state
    if (this.shouldOpenCircuit()) {
      this.openCircuit();
      
      if (this.circuitState === 'OPEN') {
        this.logger.warn('Circuit is open, failing fast');
        return this.createErrorResponse(
          'CIRCUIT_OPEN', 
          'Service unavailable due to circuit breaker',
          error
        );
      }
    }

    // Try fallback agents in order
    for (let i = 0; i < fallbackAgents.length; i++) {
      const agent = fallbackAgents[i];
      const attempt = i + 1;
      
      try {
        this.logger.debug(`Attempting fallback to agent: ${agent.id} (attempt ${attempt}/${fallbackAgents.length})`);
        
        // Check if agent is available
        if (agent.isAvailable && !(await agent.isAvailable())) {
          this.logger.warn(`Fallback agent ${agent.id} is not available`);
          continue;
        }
        
        // Execute the request with the fallback agent
        const response = await this.executeWithRetry(
          agent,
          request,
          context,
          attempt === fallbackAgents.length ? 0 : this.config.retryDelay
        );
        
        // If we got here, the request succeeded
        this.recordSuccess();
        return response as AgentResponse<T>;
        
      } catch (fallbackError) {
        this.recordFailure(fallbackError as Error);
        this.logger.error(
          `Fallback attempt ${attempt} failed for agent ${agent.id}:`, 
          fallbackError
        );
        
        // If this was the last agent, rethrow the error
        if (i === fallbackAgents.length - 1) {
          throw fallbackError;
        }
      }
    }
    
    // If we get here, all fallbacks failed
    throw new Error('All fallback agents failed to handle the request');
  }

  /**
   * Executes a request with retry logic
   */
  private async executeWithRetry<T>(
    agent: Agent,
    request: AgentRequest,
    context?: Record<string, any>,
    delay: number = 0
  ): Promise<AgentResponse<T>> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      if (attempt > 1) {
        this.logger.debug(`Retry attempt ${attempt}/${this.config.maxRetries} after ${delay}ms delay`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      try {
        const response = await agent.handle(request, context);
        
        // If we get here, the request was successful
        return response as AgentResponse<T>;
        
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `Attempt ${attempt} failed: ${error instanceof Error ? error.message : String(error)}`
        );
        
        // If this was the last attempt, rethrow the error
        if (attempt === this.config.maxRetries) {
          throw lastError;
        }
      }
    }
    
    // This should never be reached due to the throw in the loop
    throw lastError || new Error('Unknown error occurred during retry');
  }

  /**
   * Records a successful request and updates circuit state
   */
  private recordSuccess(): void {
    if (this.circuitState === 'HALF_OPEN') {
      this.closeCircuit();
    }
    this.failureCount = 0;
  }

  /**
   * Records a failed request and updates circuit state
   */
  private recordFailure(error: Error): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.config.enableCircuitBreaker && 
        this.failureCount >= this.config.circuitBreakerThreshold) {
      this.openCircuit();
    }
  }

  /**
   * Determines if the circuit should be opened
   */
  private shouldOpenCircuit(): boolean {
    if (!this.config.enableCircuitBreaker) {
      return false;
    }
    
    if (this.circuitState === 'OPEN') {
      // Check if it's time to try closing the circuit
      if (this.circuitOpenTime && 
          Date.now() - this.circuitOpenTime >= this.config.circuitBreakerResetTimeout) {
        this.halfOpenCircuit();
        return false;
      }
      return true;
    }
    
    return false;
  }

  /**
   * Opens the circuit breaker
   */
  private openCircuit(): void {
    if (this.circuitState !== 'OPEN') {
      this.logger.warn('Opening circuit breaker');
      this.circuitState = 'OPEN';
      this.circuitOpenTime = Date.now();
    }
  }

  /**
   * Half-opens the circuit breaker
   */
  private halfOpenCircuit(): void {
    this.logger.info('Attempting to half-open circuit breaker');
    this.circuitState = 'HALF_OPEN';
  }

  /**
   * Closes the circuit breaker
   */
  private closeCircuit(): void {
    this.logger.info('Closing circuit breaker');
    this.circuitState = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.circuitOpenTime = null;
  }

  /**
   * Creates an error response object
   */
  private createErrorResponse(
    code: string,
    message: string,
    originalError?: Error
  ): AgentResponse {
    return {
      success: false,
      error: {
        code,
        message,
        details: originalError ? {
          name: originalError.name,
          message: originalError.message,
          stack: originalError.stack,
        } : undefined,
      },
      metadata: {
        timestamp: new Date(),
        fallback: true,
        circuitState: this.circuitState,
      },
    };
  }

  /**
   * Gets the current circuit state
   */
  getCircuitState(): CircuitState {
    return this.circuitState;
  }

  /**
   * Gets the current failure count
   */
  getFailureCount(): number {
    return this.failureCount;
  }

  /**
   * Resets the circuit breaker and failure counters
   */
  reset(): void {
    this.closeCircuit();
  }
}

export default FallbackHandler;