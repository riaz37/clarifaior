import { IAgent, AgentConfig, AgentInput, AgentOutput, AgentExecution, AgentStep } from './agent.interface';
import { BaseLLMProvider } from '../../providers/base.provider';
import { ProviderFactory } from '../../providers/provider.factory';

export abstract class BaseAgent extends IAgent {
  protected llmProvider: BaseLLMProvider;
  protected executions: Map<string, AgentExecution> = new Map();

  constructor(config: AgentConfig, llmProvider?: BaseLLMProvider) {
    super(config);
    
    if (llmProvider) {
      this.llmProvider = llmProvider;
    } else {
      // Create provider from config
      this.llmProvider = ProviderFactory.createProvider({
        provider: config.llmProvider as any,
        apiKey: process.env.LLM_API_KEY || '',
        model: process.env.LLM_MODEL || 'gpt-3.5-turbo',
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      });
    }
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    const executionId = this.generateExecutionId();
    const execution: AgentExecution = {
      executionId,
      agentName: this.config.name,
      input,
      steps: [],
      status: 'pending',
      startTime: new Date(),
    };

    this.executions.set(executionId, execution);

    try {
      execution.status = 'running';
      
      // Validate input
      const validation = await this.validate(input);
      if (!validation.valid) {
        throw new Error(`Input validation failed: ${validation.errors.join(', ')}`);
      }

      // Execute the agent logic
      const output = await this.executeInternal(input, execution);
      
      execution.status = 'completed';
      execution.endTime = new Date();
      execution.output = output;
      execution.totalTokensUsed = this.calculateTotalTokens(execution.steps);
      execution.totalCost = this.calculateTotalCost(execution.steps);

      return output;
    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.error = error.message;
      throw error;
    }
  }

  async validate(input: AgentInput): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!input.input || typeof input.input !== 'string') {
      errors.push('Input must be a non-empty string');
    }

    if (input.input && input.input.length > 10000) {
      errors.push('Input is too long (max 10000 characters)');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  protected abstract executeInternal(input: AgentInput, execution: AgentExecution): Promise<AgentOutput>;

  protected async executeStep(
    stepName: string,
    stepInput: any,
    execution: AgentExecution,
    stepFunction: () => Promise<any>
  ): Promise<any> {
    const stepId = this.generateStepId();
    const step: AgentStep = {
      stepId,
      stepName,
      input: stepInput,
      output: null,
      status: 'pending',
      startTime: new Date(),
    };

    execution.steps.push(step);

    try {
      step.status = 'running';
      const output = await stepFunction();
      step.output = output;
      step.status = 'completed';
      step.endTime = new Date();
      return output;
    } catch (error) {
      step.status = 'failed';
      step.error = error.message;
      step.endTime = new Date();
      throw error;
    }
  }

  protected async callLLM(
    prompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
      structured?: boolean;
      schema?: any;
    }
  ): Promise<any> {
    const config = {
      temperature: options?.temperature || this.config.temperature || 0.7,
      maxTokens: options?.maxTokens || this.config.maxTokens || 1000,
    };

    if (options?.structured && options?.schema) {
      return await this.llmProvider.generateStructuredOutput(prompt, options.schema, config);
    } else {
      const response = await this.llmProvider.generateCompletion(prompt, config);
      return response.content;
    }
  }

  getExecution(executionId: string): AgentExecution | undefined {
    return this.executions.get(executionId);
  }

  getExecutions(): AgentExecution[] {
    return Array.from(this.executions.values());
  }

  clearExecutions(): void {
    this.executions.clear();
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateStepId(): string {
    return `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateTotalTokens(steps: AgentStep[]): number {
    return steps.reduce((total, step) => {
      return total + (step.metadata?.tokensUsed || 0);
    }, 0);
  }

  private calculateTotalCost(steps: AgentStep[]): number {
    return steps.reduce((total, step) => {
      return total + (step.metadata?.cost || 0);
    }, 0);
  }
}