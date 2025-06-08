import BaseParser from './base/base-parser';
import { ConditionParser, ConditionExpression } from './condition-parser';

export interface WorkflowStep {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'integration' | 'delay' | 'parallel';
  name: string;
  description?: string;
  config: Record<string, any>;
  conditions?: ConditionExpression[];
  onSuccess?: string | string[];
  onFailure?: string | string[];
  timeout?: number;
  retry?: {
    attempts: number;
    delay?: number;
    backoff?: boolean;
  };
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  version: string;
  startStep: string;
  steps: Record<string, WorkflowStep>;
  variables?: Record<string, any>;
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string;
    tags?: string[];
  };
}

export interface WorkflowParserOptions {
  /** Whether to validate the workflow structure */
  validate?: boolean;
  /** Whether to resolve references in the workflow */
  resolveReferences?: boolean;
  /** Custom validators for workflow steps */
  stepValidators?: Record<string, (step: WorkflowStep) => string | null>;
}

/**
 * Parser for workflow definitions
 */
export class WorkflowParser extends BaseParser<WorkflowDefinition, WorkflowDefinition> {
  private options: Required<WorkflowParserOptions>;
  private conditionParser: ConditionParser;

  constructor(options: WorkflowParserOptions = {}) {
    super();
    this.options = {
      validate: options.validate ?? true,
      resolveReferences: options.resolveReferences ?? true,
      stepValidators: {
        ...options.stepValidators,
      },
    };
    this.conditionParser = new ConditionParser();
  }

  /**
   * Parses and validates a workflow definition
   * @param workflow The workflow definition to parse
   * @returns The parsed and validated workflow definition
   */
  async parse(workflow: WorkflowDefinition): Promise<WorkflowDefinition> {
    this.validateInput(workflow);

    if (this.options.validate) {
      this.validateWorkflowStructure(workflow);
    }

    if (this.options.resolveReferences) {
      this.resolveStepReferences(workflow);
    }

    return workflow;
  }

  /**
   * Validates the workflow structure
   * @private
   */
  private validateWorkflowStructure(workflow: WorkflowDefinition): void {
    // Validate required top-level fields
    if (!workflow.id) {
      throw new Error('Workflow must have an id');
    }

    if (!workflow.name) {
      throw new Error('Workflow must have a name');
    }

    if (!workflow.version) {
      throw new Error('Workflow must have a version');
    }

    if (!workflow.steps || Object.keys(workflow.steps).length === 0) {
      throw new Error('Workflow must have at least one step');
    }

    if (!workflow.startStep) {
      throw new Error('Workflow must specify a startStep');
    }

    // Validate start step exists
    if (!workflow.steps[workflow.startStep]) {
      throw new Error(`Start step '${workflow.startStep}' not found in workflow steps`);
    }

    // Validate each step
    for (const [stepId, step] of Object.entries(workflow.steps)) {
      this.validateStep(stepId, step, workflow.steps);
    }
  }

  /**
   * Validates a single workflow step
   * @private
   */
  private validateStep(
    stepId: string,
    step: WorkflowStep,
    allSteps: Record<string, WorkflowStep>
  ): void {
    // Validate required fields
    if (!step.id) {
      throw new Error(`Step is missing required field 'id'`);
    }

    if (step.id !== stepId) {
      throw new Error(`Step id '${step.id}' does not match the step key '${stepId}'`);
    }

    if (!step.type) {
      throw new Error(`Step '${stepId}' is missing required field 'type'`);
    }

    if (!step.name) {
      throw new Error(`Step '${stepId}' is missing required field 'name'`);
    }

    // Validate step type
    const validStepTypes = ['trigger', 'action', 'condition', 'integration', 'delay', 'parallel'];
    if (!validStepTypes.includes(step.type)) {
      throw new Error(
        `Invalid step type '${step.type}' for step '${stepId}'. ` +
        `Must be one of: ${validStepTypes.join(', ')}`
      );
    }

    // Validate conditions if present
    if (step.conditions) {
      step.conditions.forEach((condition, index) => {
        try {
          this.conditionParser.validateInput(condition);
        } catch (error) {
          throw new Error(
            `Invalid condition at index ${index} in step '${stepId}': ${error.message}`
          );
        }
      });
    }

    // Validate references in onSuccess and onFailure
    this.validateStepReferences(step, 'onSuccess', allSteps);
    this.validateStepReferences(step, 'onFailure', allSteps);

    // Run custom validators if any
    if (this.options.stepValidators) {
      for (const [type, validator] of Object.entries(this.options.stepValidators)) {
        if (step.type === type) {
          const error = validator(step);
          if (error) {
            throw new Error(`Validation failed for step '${stepId}': ${error}`);
          }
        }
      }
    }
  }

  /**
   * Validates step references in onSuccess and onFailure fields
   * @private
   */
  private validateStepReferences(
    step: WorkflowStep,
    field: 'onSuccess' | 'onFailure',
    allSteps: Record<string, WorkflowStep>
  ): void {
    const refs = step[field];
    if (!refs) return;

    const refArray = Array.isArray(refs) ? refs : [refs];
    
    for (const ref of refArray) {
      if (!allSteps[ref]) {
        throw new Error(
          `Step '${step.id}' references non-existent ${field} step '${ref}'`
        );
      }
    }
  }

  /**
   * Resolves references in the workflow steps
   * @private
   */
  private resolveStepReferences(workflow: WorkflowDefinition): void {
    for (const step of Object.values(workflow.steps)) {
      // Resolve onSuccess references
      if (step.onSuccess) {
        step.onSuccess = this.resolveReference(step.onSuccess, workflow.steps);
      }

      // Resolve onFailure references
      if (step.onFailure) {
        step.onFailure = this.resolveReference(step.onFailure, workflow.steps);
      }
    }
  }

  /**
   * Resolves a single reference or array of references
   * @private
   */
  private resolveReference(
    ref: string | string[],
    steps: Record<string, WorkflowStep>
  ): string | string[] {
    if (Array.isArray(ref)) {
      return ref.map(r => this.resolveSingleReference(r, steps));
    }
    return this.resolveSingleReference(ref, steps);
  }

  /**
   * Resolves a single reference
   * @private
   */
  private resolveSingleReference(
    ref: string,
    steps: Record<string, WorkflowStep>
  ): string {
    // In a real implementation, this might resolve aliases or other references
    // For now, we just verify the reference exists
    if (!steps[ref]) {
      throw new Error(`Reference to non-existent step: ${ref}`);
    }
    return ref;
  }
}

export default WorkflowParser;