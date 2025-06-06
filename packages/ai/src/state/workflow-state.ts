// Define a basic message interface that's compatible with LangChain's BaseMessage
type BaseMessage = {
  content: string;
  role?: 'user' | 'assistant' | 'system' | 'function' | 'tool';
  name?: string;
  additional_kwargs?: Record<string, any>;
  response_metadata?: Record<string, any>;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;
};

// Define common status types
export type CommonStatus = 'running' | 'completed' | 'failed' | 'paused' | 'canceled';
export type WorkflowStatus = 'idle' | CommonStatus;
export type ExecutionStatus = 'pending' | CommonStatus;

export interface BaseWorkflowState {
  // Core state
  id: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  
  // Execution context
  steps: WorkflowStep[];
  currentStepId?: string;
  previousStepId?: string;
  nextStepId?: string;
  
  // Data flow
  input: Record<string, any>;
  output: Record<string, any>;
  context: Record<string, any>;
  
  // Integration states
  integrations: Record<string, IntegrationState>;
  
  // LLM state - using a more flexible message type
  messages: Array<BaseMessage | string>;
  
  // Validation
  isValid: boolean;
  validationErrors: string[];
  
  // Timing
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  
  // Metadata
  metadata: Record<string, any>;
  
  // Error handling
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  errorDetails?: any;
  retryCount: number;
  maxRetries: number;
  
  // Versioning
  version: string;
}

export interface WorkflowState extends BaseWorkflowState {}

// Base execution state without the conflicting properties from WorkflowState
type BaseExecutionState = Omit<BaseWorkflowState, 'status' | 'completedAt'> & {
  workflowId: string;
  startedBy: string;
  results: Record<string, any>;
  metrics: {
    totalSteps: number;
    completedSteps: number;
    successRate: number;
    averageStepDurationMs: number;
  };
};

export interface ExecutionState extends BaseExecutionState {
  status: ExecutionStatus;
  completedAt?: Date;
}

export interface WorkflowStep {
  id: string;
  type: 'action' | 'decision' | 'parallel' | 'integration';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  input?: Record<string, any>;
  output?: any;
  error?: string;
  metadata?: Record<string, any>;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
}

export interface IntegrationState {
  provider: 'gmail' | 'slack' | 'deepseek' | string;
  status: 'connected' | 'disconnected' | 'error';
  credentials: Record<string, any>;
  lastSynced?: Date;
  error?: string;
}



export const createInitialWorkflowState = (overrides: Partial<WorkflowState> = {}): WorkflowState => ({
  id: `wf_${Date.now()}`,
  name: 'Untitled Workflow',
  status: 'idle',
  steps: [],
  input: {},
  output: {},
  context: {},
  integrations: {},
  messages: [],
  isValid: true,
  validationErrors: [],
  startedAt: new Date(),
  updatedAt: new Date(),
  metadata: {},
  retryCount: 0,
  maxRetries: 3,
  version: '1.0.0',
  ...overrides,
});
