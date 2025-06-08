import { StateGraph } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../../utils/logger';
import { WorkflowState, WorkflowStep, IWorkflowGraph } from '../graphs/base/graph.interface';

/**
 * Configuration options for the GraphExecutor
 */
export interface GraphExecutorConfig<TState extends WorkflowState> {
  /** Maximum number of iterations before timing out */
  maxIterations?: number;
  
  /** Whether to enable debug logging */
  debug?: boolean;
  
  /** Logger instance */
  logger?: Logger;
  
  /** Initial state values */
  initialState?: Partial<TState>;
}

/**
 * Result of a graph execution
 */
export interface GraphExecutionResult<TOutput = any> {
  /** The final output of the graph execution */
  output?: TOutput;
  
  /** Final state of the workflow */
  state: WorkflowState;
  
  /** Execution metadata */
  metadata: {
    /** Unique execution ID */
    executionId: string;
    
    /** Start time of execution */
    startTime: Date;
    
    /** End time of execution */
    endTime?: Date;
    
    /** Duration of execution in milliseconds */
    durationMs?: number;
    
    /** Whether the execution completed successfully */
    success: boolean;
    
    /** Error if execution failed */
    error?: Error;
    
    /** Number of steps executed */
    stepCount: number;
  };
}

/**
 * GraphExecutor is responsible for executing workflow graphs with state management,
 * error handling, and monitoring.
 */
export class GraphExecutor<TState extends WorkflowState = WorkflowState, TInput = any, TOutput = any> {
  private readonly config: Required<GraphExecutorConfig<TState>>;
  private readonly logger: Logger;
  private executionCount = 0;
  private activeExecutions = new Map<string, Promise<GraphExecutionResult<TOutput>>>();

  constructor(config: GraphExecutorConfig<TState> = {}) {
    this.config = {
      maxIterations: 100,
      debug: false,
      logger: new Logger('GraphExecutor'),
      initialState: {},
      ...config,
    };
    this.logger = this.config.logger;
  }

  /**
   * Executes a workflow graph with the given input
   * @param workflow The workflow graph to execute
   * @param input The input to the workflow
   * @param executionId Optional execution ID (will be generated if not provided)
   * @returns Promise that resolves with the execution result
   */
  async execute(
    workflow: IWorkflowGraph<TState, TInput, TOutput>,
    input: TInput,
    executionId: string = uuidv4()
  ): Promise<GraphExecutionResult<TOutput>> {
    const startTime = new Date();
    const executionPromise = this.executeWorkflow(workflow, input, executionId, startTime);
    this.activeExecutions.set(executionId, executionPromise);
    
    try {
      const result = await executionPromise;
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Execution ${executionId} failed: ${errorMessage}`, { error });
      
      return {
        state: {
          input,
          error: error instanceof Error ? error : new Error(String(error)),
          steps: [],
        },
        metadata: {
          executionId,
          startTime,
          endTime: new Date(),
          durationMs: Date.now() - startTime.getTime(),
          success: false,
          error: error instanceof Error ? error : new Error(String(error)),
          stepCount: 0,
        },
      };
    } finally {
      this.activeExecutions.delete(executionId);
    }
  }

  /**
   * Cancels an in-progress execution
   * @param executionId The ID of the execution to cancel
   * @returns True if the execution was found and cancelled, false otherwise
   */
  cancelExecution(executionId: string): boolean {
    // Implementation would depend on the underlying workflow execution engine
    // This is a placeholder for actual cancellation logic
    return this.activeExecutions.has(executionId);
  }

  /**
   * Gets the status of an execution
   * @param executionId The ID of the execution to check
   * @returns The current status of the execution, or undefined if not found
   */
  getExecutionStatus(executionId: string): { status: 'pending' | 'running' | 'completed' | 'failed' } | undefined {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) return undefined;
    
    // This is a simplified status check
    // In a real implementation, you'd check the actual state of the execution
    return { status: 'running' };
  }

  /**
   * Gets execution statistics
   */
  getStats() {
    return {
      totalExecutions: this.executionCount,
      activeExecutions: this.activeExecutions.size,
    };
  }

  /**
   * Internal method to execute the workflow
   */
  private async executeWorkflow(
    workflow: IWorkflowGraph<TState, TInput, TOutput>,
    input: TInput,
    executionId: string,
    startTime: Date
  ): Promise<GraphExecutionResult<TOutput>> {
    this.executionCount++;
    const executionStartTime = performance.now();
    
    try {
      this.logger.debug(`Starting execution ${executionId}`, { input });
      
      // Execute the workflow
      const output = await workflow.execute(input, this.config.initialState);
      
      // Get the final state
      const finalState = await this.getWorkflowState(workflow);
      
      const endTime = new Date();
      const durationMs = endTime.getTime() - startTime.getTime();
      
      this.logger.debug(`Completed execution ${executionId} in ${durationMs}ms`, {
        output,
        state: finalState,
      });
      
      return {
        output,
        state: finalState,
        metadata: {
          executionId,
          startTime,
          endTime,
          durationMs,
          success: true,
          stepCount: finalState.steps?.length || 0,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Workflow execution failed: ${errorMessage}`, { error });
      
      // Try to get partial state if available
      let finalState: WorkflowState = {
        input,
        error: error instanceof Error ? error : new Error(String(error)),
        steps: [],
      };
      
      try {
        finalState = await this.getWorkflowState(workflow) || finalState;
      } catch (e) {
        // Ignore errors when getting partial state
      }
      
      throw error; // Re-throw to be caught by the outer try-catch
    }
  }
  
  /**
   * Helper method to get the current state from a workflow
   */
  private async getWorkflowState(
    workflow: IWorkflowGraph<TState, TInput, TOutput>
  ): Promise<WorkflowState> {
    // This is a simplified implementation
    // In a real implementation, you'd get the actual state from the workflow
    return {
      input: {},
      steps: [],
    };
  }
}

export default GraphExecutor;