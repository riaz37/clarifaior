// Scheduler System Types

export interface Schedule {
  id: string;
  agentId: string;
  createdBy: string;
  name: string;
  cronExpression: string;
  timezone: string;
  isActive: boolean;
  lastRun?: string;
  nextRun?: string;
  runCount: number;
  config?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleRequest {
  agentId: string;
  name: string;
  cronExpression: string;
  timezone?: string;
  config?: Record<string, any>;
}

export interface UpdateScheduleRequest {
  name?: string;
  cronExpression?: string;
  timezone?: string;
  config?: Record<string, any>;
}

export interface ScheduleToggleRequest {
  isActive: boolean;
}

export interface TimezoneOption {
  value: string;
  label: string;
}

export interface CronPreset {
  label: string;
  value: string;
  description: string;
}

export interface ScheduleExecution {
  scheduleId: string;
  scheduleName: string;
  cronExpression: string;
  timezone: string;
  executedAt: string;
  success: boolean;
  executionId?: number;
  error?: string;
}
