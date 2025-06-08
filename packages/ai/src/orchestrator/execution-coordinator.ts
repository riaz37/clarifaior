import { WorkflowState, WorkflowStatus } from '../state/workflow-state';
import { WorkflowDesign } from './workflow-orchestrator';
import { BaseLLMProvider } from '../providers/base.provider';
import { Logger } from '../utils/logger';

interface ExecutionContext {
  workflowId: string;
  state: WorkflowState;
  currentStepIndex: number;
  stepResults: Map<string, any>;
  errors: Map<string, Error>;
  metadata: Record<string, any>;
}

export class ExecutionCoordinator {
  private logger: Logger;
  private llmProvider: BaseLLMProvider;
  private activeExecutions: Map<string, ExecutionContext>;
  private executionHistory: Map<string, WorkflowState[]>;

  constructor(llmProvider: BaseLLMProvider) {
    this.llmProvider = llmProvider;
    this.logger = new Logger('ExecutionCoordinator');
    this.activeExecutions = new Map();
    this.executionHistory = new Map();
  }

  /**
   * Start a new workflow execution
   */
  async startExecution(workflow: WorkflowDesign, initialInput: Record<string, any> = {}): Promise<string> {
    const executionId = this.generateExecutionId();
    
    const initialState: WorkflowState = {
      workflowId: workflow.name,
      status: 'pending' as WorkflowStatus,
      currentStepId: workflow.steps[0]?.id || '',
      input: initialInput,
      output: {},
      context: {},
      metadata: {
        startedAt: new Date(),
        workflowName: workflow.name,
        totalSteps: workflow.steps.length,
      },
      isValid: true,
      validationErrors: [],
      retryCount: 0,
      maxRetries: 3,
      version: '1.0.0',
    };

    const context: ExecutionContext = {
      workflowId: executionId,
      state: initialState,
      currentStepIndex: 0,
      stepResults: new Map(),
      errors: new Map(),
      metadata: {},
    };

    this.activeExecutions.set(executionId, context);
    this.initializeExecutionHistory(executionId, initialState);
    
    // Start execution in the background
    this.executeWorkflow(executionId, workflow).catch(error => {
      this.logger.error(`Error executing workflow ${executionId}:`, error);
    });

    return executionId;
  }

  /**
   * Get the current state of a workflow execution
   */
  getExecutionState(executionId: string): WorkflowState | undefined {
    const context = this.activeExecutions.get(executionId);
    return context?.state;
  }

  /**
   * Get the execution history for a workflow
   */
  getExecutionHistory(executionId: string): WorkflowState[] | undefined {
    return this.executionHistory.get(executionId);
  }

  /**
   * Cancel a running workflow execution
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    const context = this.activeExecutions.get(executionId);
    if (!context) return false;

    context.state.status = 'cancelled';
    context.state.metadata.completedAt = new Date();
    context.state.metadata.durationMs = 
      new Date().getTime() - (context.state.metadata.startedAt as Date).getTime();
    
    this.updateExecutionHistory(executionId, context.state);
    this.activeExecutions.delete(executionId);
    
    return true;
  }

  /**
   * Execute the workflow steps
   */
  private async executeWorkflow(executionId: string, workflow: WorkflowDesign): Promise<void> {
    const context = this.activeExecutions.get(executionId);
    if (!context) {
      this.logger.warn(`No execution context found for ID: ${executionId}`);
      return;
    }

    try {
      context.state.status = 'running';
      this.updateExecutionState(executionId, context);

      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        context.currentStepIndex = i;
        context.state.currentStepId = step.id;

        try {
          this.logger.info(`Executing step ${i + 1}/${workflow.steps.length}: ${step.id}`);
          
          // Execute the step
          const result = await this.executeStep(step, context);
          
          // Store the result
          context.stepResults.set(step.id, result);
          context.state.output[step.id] = result;
          
          // Update context with step result
          this.updateExecutionState(executionId, context);
          
        } catch (error) {
          this.logger.error(`Error executing step ${step.id}:`, error);
          await this.handleStepError(executionId, workflow, context, error as Error);
          
          // If error was not handled, rethrow
          if (context.state.status !== 'failed') throw error;
          break;
        }
      }

      // If we get here, all steps completed successfully
      if (context.state.status === 'running') {
        context.state.status = 'completed';
        context.state.metadata.completedAt = new Date();
        context.state.metadata.durationMs = 
          new Date().getTime() - (context.state.metadata.startedAt as Date).getTime();
        
        this.updateExecutionState(executionId, context);
      }
      
    } catch (error) {
      this.logger.error(`Workflow execution failed:`, error);
      
      if (context) {
        context.state.status = 'failed';
        context.state.error = {
          message: (error as Error).message,
          stack: (error as Error).stack,
        };
        context.state.metadata.completedAt = new Date();
        context.state.metadata.durationMs = 
          new Date().getTime() - (context.state.metadata.startedAt as Date).getTime();
        
        this.updateExecutionState(executionId, context);
      }
      
    } finally {
      // Clean up
      if (context?.state.status === 'completed' || context?.state.status === 'failed') {
        this.activeExecutions.delete(executionId);
      }
    }
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(step: any, context: ExecutionContext): Promise<any> {
    // This is a simplified implementation
    // In a real implementation, you would handle different step types
    
    const { type, parameters } = step;
    const stepHandlers: Record<string, (params: any, ctx: ExecutionContext) => Promise<any>> = {
      'llm': this.executeLLMStep.bind(this),
      'api': this.executeAPIStep.bind(this),
      'condition': this.executeConditionStep.bind(this),
      // Add more step types as needed
    };

    const handler = stepHandlers[type];
    if (!handler) {
      throw new Error(`Unsupported step type: ${type}`);
    }

    return handler(parameters, context);
  }

  /**
   * Execute an LLM step
   */
  private async executeLLMStep(parameters: any, context: ExecutionContext): Promise<any> {
    const { prompt, model, temperature, maxTokens } = parameters;
    
    // In a real implementation, you would use the LLM provider
    // For now, we'll just return a mock response
    return {
      text: `Mock LLM response for prompt: ${prompt.substring(0, 50)}...`,
      model,
      parameters: {
        temperature,
        maxTokens,
      },
    };
  }

  /**
   * Execute an API step
   */
  private async executeAPIStep(parameters: any, context: ExecutionContext): Promise<any> {
    const { url, method, headers, body } = parameters;
    
    // In a real implementation, you would make an actual API call
    // For now, we'll just return a mock response
    return {
      status: 200,
      data: {
        message: 'Mock API response',
        url,
        method,
      },
    };
  }

  /**
   * Execute a conditional step
   */
  private async executeConditionStep(parameters: any, context: ExecutionContext): Promise<boolean> {
    // This is a simplified implementation
    // In a real implementation, you would evaluate the condition
    return true;
  }

  /**
   * Handle step execution errors
   */
  private async handleStepError(
    executionId: string,
    workflow: WorkflowDesign,
    context: ExecutionContext,
    error: Error
  ): Promise<void> {
    const currentStep = workflow.steps[context.currentStepIndex];
    
    // Store the error
    context.errors.set(currentStep.id, error);
    
    // Check if we should retry
    if (context.state.retryCount < context.state.maxRetries) {
      context.state.retryCount++;
      this.logger.warn(`Retrying step ${currentStep.id} (attempt ${context.state.retryCount}/${context.state.maxRetries})`);
      
      // Add a small delay before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * context.state.retryCount));
      
      // Retry the step
      try {
        const result = await this.executeStep(currentStep, context);
        context.stepResults.set(currentStep.id, result);
        context.state.output[currentStep.id] = result;
        return;
      } catch (retryError) {
        // If retry fails, continue with error handling
        error = retryError as Error;
      }
    }
    
    // If we get here, all retries have failed or we're not retrying
    context.state.status = 'failed';
    context.state.error = {
      message: error.message,
      stack: error.stack,
      stepId: currentStep.id,
    };
    
    // Check if there's a fallback action defined
    const fallbackStep = workflow.steps.find(s => s.id === `fallback_${currentStep.id}`);
    if (fallbackStep) {
      this.logger.info(`Executing fallback for step ${currentStep.id}`);
      try {
        const result = await this.executeStep(fallbackStep, context);
        context.stepResults.set(fallbackStep.id, result);
        context.state.output[fallbackStep.id] = result;
        context.state.status = 'running'; // Continue with next steps
      } catch (fallbackError) {
        // If fallback also fails, mark as failed
        context.state.status = 'failed';
        context.state.error = {
          message: `Fallback failed: ${(fallbackError as Error).message}`,
          stack: (fallbackError as Error).stack,
          stepId: fallbackStep.id,
          originalError: error.message,
        };
      }
    }
    
    this.updateExecutionState(executionId, context);
  }

  /**
   * Update the execution state and history
   */
  private updateExecutionState(executionId: string, context: ExecutionContext): void {
    // Update timestamps
    context.state.updatedAt = new Date();
    
    // Update duration
    if (context.state.metadata.startedAt) {
      context.state.metadata.durationMs = 
        new Date().getTime() - (context.state.metadata.startedAt as Date).getTime();
    }
    
    // Update history
    this.updateExecutionHistory(executionId, { ...context.state });
  }

  /**
   * Initialize execution history for a new execution
   */
  private initializeExecutionHistory(executionId: string, initialState: WorkflowState): void {
    this.executionHistory.set(executionId, [initialState]);
  }

  /**
   * Update execution history with a new state
   */
  private updateExecutionHistory(executionId: string, state: WorkflowState): void {
    const history = this.executionHistory.get(executionId) || [];
    history.push({ ...state });
    this.executionHistory.set(executionId, history);
  }

  /**
   * Generate a unique execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
