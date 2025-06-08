import { z } from 'zod';
import { BaseState } from './base/base-state';

export interface ExecutionStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface ExecutionMetrics {
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  totalDurationMs: number;
  averageStepDurationMs: number;
  successRate: number;
}

export interface ExecutionStateData {
  workflowId: string;
  executionId: string;
  currentStep?: string;
  steps: ExecutionStep[];
  context: Record<string, unknown>;
  metrics: ExecutionMetrics;
  startedAt: Date;
  completedAt?: Date;
  input?: unknown;
  output?: unknown;
  metadata: Record<string, unknown>;
}

const executionStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'skipped']),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  durationMs: z.number().optional(),
  error: z
    .object({
      message: z.string(),
      code: z.string().optional(),
      stack: z.string().optional(),
    })
    .optional(),
  metadata: z.record(z.unknown()).optional(),
});

export class ExecutionState extends BaseState<ExecutionStateData> {
  constructor(init: Partial<ExecutionStateData> & { workflowId: string; executionId: string }) {
    const now = new Date();
    const defaultMetrics: ExecutionMetrics = {
      totalSteps: 0,
      completedSteps: 0,
      failedSteps: 0,
      totalDurationMs: 0,
      averageStepDurationMs: 0,
      successRate: 0,
    };

    super({
      ...init,
      status: 'idle',
      data: {
        workflowId: init.workflowId,
        executionId: init.executionId,
        currentStep: init.currentStep,
        steps: init.steps || [],
        context: init.context || {},
        metrics: { ...defaultMetrics, ...init.metrics },
        startedAt: init.startedAt || now,
        completedAt: init.completedAt,
        input: init.input,
        output: init.output,
        metadata: init.metadata || {},
      },
    });
  }

  /**
   * Starts the execution
   */
  start(): void {
    this.setStatus('running');
    this.data.startedAt = new Date();
  }

  /**
   * Completes the execution
   * @param output Optional output data
   */
  complete(output?: unknown): void {
    this.setStatus('completed');
    this.data.completedAt = new Date();
    if (output !== undefined) {
      this.data.output = output;
    }
  }

  /**
   * Fails the execution
   * @param error Error information
   */
  fail(error: { message: string; code?: string; stack?: string }): void {
    this.setStatus('failed');
    this.data.completedAt = new Date();
    this.setError(error);
  }

  /**
   * Adds a new step to the execution
   * @param step Step to add
   */
  addStep(step: Omit<ExecutionStep, 'status'> & { status?: ExecutionStep['status'] }): ExecutionStep {
    const newStep: ExecutionStep = {
      ...step,
      status: step.status || 'pending',
    };

    this.data.steps.push(newStep);
    this.data.metrics.totalSteps++;
    this.updateMetrics();
    return newStep;
  }

  /**
   * Updates an existing step
   * @param stepId ID of the step to update
   * @param updates Updates to apply
   */
  updateStep(
    stepId: string,
    updates: Partial<Omit<ExecutionStep, 'id'>>
  ): ExecutionStep | undefined {
    const stepIndex = this.data.steps.findIndex((s) => s.id === stepId);
    if (stepIndex === -1) return undefined;

    const step = this.data.steps[stepIndex];
    const updatedStep = { ...step, ...updates };
    
    // Calculate duration if step is being completed
    if (updates.status === 'completed' || updates.status === 'failed') {
      updatedStep.completedAt = new Date();
      if (step.startedAt) {
        updatedStep.durationMs =
          updatedStep.completedAt.getTime() - step.startedAt.getTime();
      }
      
      // Update metrics
      if (updates.status === 'completed') {
        this.data.metrics.completedSteps++;
      } else if (updates.status === 'failed') {
        this.data.metrics.failedSteps++;
      }
      this.updateMetrics();
    }

    this.data.steps[stepIndex] = updatedStep;
    return updatedStep;
  }

  /**
   * Gets a step by ID
   * @param stepId ID of the step to get
   */
  getStep(stepId: string): ExecutionStep | undefined {
    return this.data.steps.find((s) => s.id === stepId);
  }

  /**
   * Gets the current step
   */
  getCurrentStep(): ExecutionStep | undefined {
    if (!this.data.currentStep) return undefined;
    return this.getStep(this.data.currentStep);
  }

  /**
   * Updates execution metrics
   * @private
   */
  private updateMetrics(): void {
    const { steps, metrics } = this.data;
    
    // Calculate total duration of all completed steps
    const completedSteps = steps.filter((s) => s.status === 'completed' && s.durationMs);
    const totalDuration = completedSteps.reduce((sum, step) => sum + (step.durationMs || 0), 0);
    
    // Update metrics
    metrics.totalDurationMs = totalDuration;
    metrics.averageStepDurationMs = completedSteps.length > 0 
      ? Math.round(totalDuration / completedSteps.length) 
      : 0;
    metrics.successRate = metrics.totalSteps > 0 
      ? (metrics.completedSteps / metrics.totalSteps) * 100 
      : 0;
  }

  /**
   * Validates the execution state against the schema
   */
  validate(): { valid: boolean; errors?: z.ZodError } {
    try {
      // Validate each step
      for (const step of this.data.steps) {
        executionStepSchema.parse(step);
      }
      return { valid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { valid: false, errors: error };
      }
      throw error;
    }
  }
}

export default ExecutionState;
