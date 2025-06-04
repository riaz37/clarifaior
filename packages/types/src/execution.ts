// Execution Types
export type ExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type TriggerType =
  | "manual"
  | "webhook"
  | "schedule"
  | "gmail"
  | "slack"
  | "api";

export interface Execution {
  id: string;
  agentId: string;
  triggerType: TriggerType;
  triggerData?: Record<string, any>;
  status: ExecutionStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface ExecutionLog {
  id: string;
  executionId: string;
  nodeId: string;
  stepNumber: number;
  status: ExecutionStatus;
  input?: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  duration?: number; // milliseconds
  tokensUsed?: number;
  cost?: number; // USD
  startedAt: string;
  completedAt?: string;
}

export interface ExecutionWithLogs extends Execution {
  logs: ExecutionLog[];
}

export interface ExecutionStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageDuration: number;
  totalTokensUsed: number;
  totalCost: number;
}

export interface ExecutionJobData {
  executionId: string;
  agentId: string;
  flowDefinition: any;
  triggerData?: Record<string, any>;
  context?: Record<string, any>;
  testMode?: boolean;
}
