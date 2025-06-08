import { BaseTool, type ToolResult } from '../base/base-tool';
import { CallbackManagerForToolRun } from '@langchain/core/callbacks/manager';
import { z } from 'zod';

export interface StepExecutorToolParams {
  name?: string;
  description?: string;
  verbose?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

export class StepExecutorTool extends BaseTool {
  static lc_name() {
    return 'StepExecutorTool';
  }

  maxRetries: number;
  retryDelay: number;
  timeout: number;

  constructor(params: StepExecutorToolParams = {}) {
    const {
      name = 'step_executor',
      description = 'Executes a single step in a workflow',
      verbose = false,
      maxRetries = 3,
      retryDelay = 1000,
      timeout = 30000,
    } = params;

    super({ name, description, verbose });
    
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
    this.timeout = timeout;
  }

  get inputSchema() {
    return {
      type: 'object',
      properties: {
        stepId: {
          type: 'string',
          description: 'Unique identifier for the step',
        },
        action: {
          type: 'string',
          description: 'The action to perform',
        },
        parameters: {
          type: 'object',
          description: 'Input parameters for the step',
        },
        context: {
          type: 'object',
          description: 'Workflow execution context',
        },
        options: {
          type: 'object',
          properties: {
            maxRetries: { type: 'number', default: this.maxRetries },
            retryDelay: { type: 'number', default: this.retryDelay },
            timeout: { type: 'number', default: this.timeout },
          },
        },
      },
      required: ['stepId', 'action'],
    };
  }

  get outputSchema() {
    return {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        output: { type: 'any' },
        error: { type: 'string' },
        metadata: {
          type: 'object',
          properties: {
            stepId: { type: 'string' },
            executionTime: { type: 'number' },
            retryCount: { type: 'number' },
          },
        },
      },
      required: ['success', 'metadata'],
    };
  }

  protected validateInput(input: any): { isValid: boolean; error?: string } {
    const schema = z.object({
      stepId: z.string().min(1, 'Step ID is required'),
      action: z.string().min(1, 'Action is required'),
      parameters: z.record(z.any()).optional(),
      context: z.record(z.any()).optional(),
      options: z.object({
        maxRetries: z.number().int().nonnegative().optional(),
        retryDelay: z.number().int().positive().optional(),
        timeout: z.number().int().positive().optional(),
      }).optional(),
    });

    try {
      schema.parse(input);
      return { isValid: true };
    } catch (error: any) {
      return { 
        isValid: false, 
        error: error.errors?.map((e: any) => e.message).join(', ') || 'Invalid input'
      };
    }
  }

  async _call(
    input: {
      stepId: string;
      action: string;
      parameters?: Record<string, any>;
      context?: Record<string, any>;
      options?: {
        maxRetries?: number;
        retryDelay?: number;
        timeout?: number;
      };
    },
    _runManager?: CallbackManagerForToolRun
  ): Promise<ToolResult> {
    const startTime = Date.now();
    const { stepId, action, parameters = {}, context = {}, options = {} } = input;
    
    const {
      maxRetries = this.maxRetries,
      retryDelay = this.retryDelay,
      timeout = this.timeout,
    } = options;

    let lastError: Error | null = null;
    let retryCount = 0;

    while (retryCount <= maxRetries) {
      try {
        // Create a promise that will reject if the timeout is reached
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Step execution timed out after ${timeout}ms`));
          }, timeout);
        });

        // Execute the step with timeout
        const executionPromise = this.executeStep(action, parameters, context);
        
        const result = await Promise.race([executionPromise, timeoutPromise]) as any;
        
        return {
          output: {
            success: true,
            output: result,
            metadata: {
              stepId,
              executionTime: Date.now() - startTime,
              retryCount,
            },
          },
          success: true,
        };
      } catch (error) {
        lastError = error as Error;
        this.log(`Step execution failed (attempt ${retryCount + 1}/${maxRetries + 1}): ${error}`);
        
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (retryCount + 1)));
        }
        retryCount++;
      }
    }

    return {
      output: {
        success: false,
        error: lastError?.message || 'Step execution failed',
        metadata: {
          stepId,
          executionTime: Date.now() - startTime,
          retryCount,
        },
      },
      success: false,
      error: lastError?.message || 'Step execution failed',
    };
  }

  private async executeStep(
    action: string,
    parameters: Record<string, any>,
    context: Record<string, any>
  ): Promise<any> {
    // This is a simplified implementation
    // In a real implementation, this would execute the actual step logic
    // based on the action and parameters
    this.log(`Executing step: ${action}`, { parameters });
    
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Return a mock result
    return {
      status: 'completed',
      output: `Processed ${action} with ${Object.keys(parameters).length} parameters`,
      context: {
        ...context,
        lastStep: action,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private log(message: string, data?: any) {
    if (this.verbose) {
      console.log(`[${this.constructor.name}] ${message}`, data || '');
    }
  }
}

export default StepExecutorTool;