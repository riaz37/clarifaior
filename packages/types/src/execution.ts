// Execution Types
export type ExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface Execution {
  id: number;
  agentId: number;
  triggerType: string;
  triggerData?: Record<string, any>;
  status: ExecutionStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface ExecutionLog {
  id: number;
  executionId: number;
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
