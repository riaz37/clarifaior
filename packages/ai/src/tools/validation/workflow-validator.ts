import { z } from 'zod';
import { SchemaValidator } from '../../utils/schema-validator';

// Define the workflow step schema first
const workflowStepSchema = z.object({
  id: z.string().min(1, 'Step ID is required'),
  type: z.string().min(1, 'Step type is required'),
  name: z.string().min(1, 'Step name is required'),
  inputs: z.record(z.any()).optional(),
  outputs: z.record(z.any()).optional(),
  next: z.union([z.string(), z.array(z.string())]).optional(),
  onError: z.string().optional(),
  retry: z.object({
    maxAttempts: z.number().int().positive('Max attempts must be a positive integer'),
    backoffFactor: z.number().positive('Backoff factor must be a positive number'),
    maxDelay: z.number().positive('Max delay must be a positive number'),
  }).optional(),
  timeout: z.number().positive('Timeout must be a positive number').optional(),
  metadata: z.record(z.any()).optional(),
});

type WorkflowStep = z.infer<typeof workflowStepSchema>;

// Define the workflow schema with type-safe refinements
const workflowSchema = z.object({
  id: z.string().min(1, 'Workflow ID is required'),
  name: z.string().min(1, 'Workflow name is required'),
  version: z.string().min(1, 'Version is required'),
  description: z.string().optional(),
  startAt: z.string().min(1, 'Start state is required'),
  states: z.record(workflowStepSchema).refine(
    (states) => Object.keys(states).length > 0,
    { message: 'At least one state is required' }
  ),
  timeout: z.number().positive('Timeout must be a positive number').optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
}).superRefine((data, ctx) => {
  const { states, startAt } = data as { states: Record<string, WorkflowStep>; startAt: string };
  
  // Validate that startAt points to an existing state
  if (!states[startAt]) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Start state '${startAt}' does not exist in states`,
      path: ['startAt'],
    });
  }

  // Validate that all next/onError references point to existing states
  for (const [stateName, state] of Object.entries(states)) {
    if (state.next) {
      const nextStates = Array.isArray(state.next) ? state.next : [state.next];
      for (const nextState of nextStates) {
        if (!states[nextState]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Next state '${nextState}' in state '${stateName}' does not exist`,
            path: ['states', stateName, 'next'],
          });
        }
      }
    }

    if (state.onError && !states[state.onError]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Error handler '${state.onError}' in state '${stateName}' does not exist`,
        path: ['states', stateName, 'onError'],
      });
    }
  }
});

export type WorkflowStepDefinition = z.infer<typeof workflowStepSchema>;

export interface WorkflowDefinition {
  id: string;
  name: string;
  version: string;
  description?: string;
  startAt: string;
  states: Record<string, WorkflowStepDefinition>;
  timeout?: number;
  tags?: string[];
  metadata?: Record<string, any>;
}

export class WorkflowValidator {
  private static instance: WorkflowValidator;
  private validator: typeof SchemaValidator;

  private constructor() {
    this.validator = SchemaValidator;
  }

  public static getInstance(): WorkflowValidator {
    if (!WorkflowValidator.instance) {
      WorkflowValidator.instance = new WorkflowValidator();
    }
    return WorkflowValidator.instance;
  }

  /**
   * Validates a workflow definition
   * @throws {Error} If validation fails
   */
  public validateWorkflow(workflow: unknown): WorkflowDefinition {
    return this.validator.validate(workflowSchema, workflow, {
      errorMessage: 'Invalid workflow definition',
    });
  }

  /**
   * Validates a workflow step definition
   * @throws {Error} If validation fails
   */
  public validateWorkflowStep(step: unknown): WorkflowStepDefinition {
    return this.validator.validate(workflowStepSchema, step, {
      errorMessage: 'Invalid workflow step definition',
    });
  }

  /**
   * Validates workflow input against a schema
   * @throws {Error} If validation fails
   */
  public validateWorkflowInput<T = any>(
    input: unknown,
    inputSchema: z.ZodType<T>
  ): T {
    return this.validator.validate(inputSchema, input, {
      errorMessage: 'Invalid workflow input',
    });
  }

  /**
   * Validates workflow output against a schema
   * @throws {Error} If validation fails
   */
  public validateWorkflowOutput<T = any>(
    output: unknown,
    outputSchema: z.ZodType<T>
  ): T {
    return this.validator.validate(outputSchema, output, {
      errorMessage: 'Invalid workflow output',
    });
  }
}

// Default validator instance
export const workflowValidator = WorkflowValidator.getInstance();