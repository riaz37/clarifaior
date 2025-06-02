import { ExecutionStatus, TriggerType } from '@repo/types';

export interface ExecutionStep {
  id: string;
  nodeId: string;
  nodeType: string;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  input?: any;
  output?: any;
  error?: string;
  logs?: string[];
}

export interface ExecutionDetails {
  id: number;
  agentId: number;
  agentName: string;
  status: ExecutionStatus;
  triggerType: TriggerType;
  triggerData?: any;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  steps: ExecutionStep[];
  totalSteps: number;
  completedSteps: number;
  error?: string;
  logs?: string[];
  cost?: number;
  tokensUsed?: number;
}

export interface ExecutionMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageDuration: number;
  totalCost: number;
  totalTokens: number;
  successRate: number;
}

export const getStatusColor = (status: ExecutionStatus) => {
  switch (status) {
    case 'pending':
      return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    case 'running':
      return 'text-blue-400 bg-blue-400/10 border-blue-400/20 animate-pulse';
    case 'completed':
      return 'text-green-400 bg-green-400/10 border-green-400/20';
    case 'failed':
      return 'text-red-400 bg-red-400/10 border-red-400/20';
    case 'cancelled':
      return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    default:
      return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
  }
};

export const getTriggerIcon = (triggerType: TriggerType) => {
  switch (triggerType) {
    case 'manual':
      return '👆';
    case 'webhook':
      return '🔗';
    case 'schedule':
      return '⏰';
    case 'gmail':
      return '📧';
    case 'slack':
      return '💬';
    case 'api':
      return '🔌';
    default:
      return '⚡';
  }
};

export const formatDuration = (ms?: number) => {
  if (!ms) return 'N/A';
  
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
};

export const formatCost = (cost?: number) => {
  if (!cost) return '$0.00';
  return `$${cost.toFixed(4)}`;
};

export const formatTokens = (tokens?: number) => {
  if (!tokens) return '0';
  if (tokens < 1000) return tokens.toString();
  if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}K`;
  return `${(tokens / 1000000).toFixed(1)}M`;
};
