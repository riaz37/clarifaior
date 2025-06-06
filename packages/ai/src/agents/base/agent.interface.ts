export interface AgentConfig {
  name: string;
  description?: string;
  version?: string;
  llmProvider: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  retries?: number;
}

export interface AgentInput {
  input: string;
  context?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface AgentOutput {
  output: any;
  confidence?: number;
  reasoning?: string;
  metadata?: Record<string, any>;
  tokensUsed?: number;
  cost?: number;
  executionTime?: number;
}

export interface AgentStep {
  stepId: string;
  stepName: string;
  input: any;
  output: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  error?: string;
  metadata?: Record<string, any>;
}

export interface AgentExecution {
  executionId: string;
  agentName: string;
  input: AgentInput;
  output?: AgentOutput;
  steps: AgentStep[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  totalTokensUsed?: number;
  totalCost?: number;
  error?: string;
}

export abstract class IAgent {
  protected config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  abstract execute(input: AgentInput): Promise<AgentOutput>;

  abstract validate(input: AgentInput): Promise<{ valid: boolean; errors: string[] }>;

  getName(): string {
    return this.config.name;
  }

  getDescription(): string {
    return this.config.description || '';
  }

  getVersion(): string {
    return this.config.version || '1.0.0';
  }

  getConfig(): AgentConfig {
    return { ...this.config };
  }
}