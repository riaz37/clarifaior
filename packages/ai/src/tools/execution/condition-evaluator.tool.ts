import { BaseTool, type ToolResult } from '../base/base-tool';
import { CallbackManagerForToolRun } from '@langchain/core/callbacks/manager';
import { z } from 'zod';

type ConditionOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith' | 'in' | 'notIn' | 'and' | 'or' | 'not';

interface BaseCondition {
  operator: ConditionOperator;
  field?: string;
  value?: any;
  conditions?: Condition[];
}

interface FieldCondition extends BaseCondition {
  operator: Exclude<ConditionOperator, 'and' | 'or' | 'not'>;
  field: string;
  value: any;
}

interface LogicalCondition extends BaseCondition {
  operator: 'and' | 'or' | 'not';
  conditions: Condition[];
}

type Condition = FieldCondition | LogicalCondition;

export interface ConditionEvaluatorToolParams {
  name?: string;
  description?: string;
  verbose?: boolean;
  strictMode?: boolean;
}

export class ConditionEvaluatorTool extends BaseTool {
  static lc_name() {
    return 'ConditionEvaluatorTool';
  }

  strictMode: boolean;

  constructor(params: ConditionEvaluatorToolParams = {}) {
    const {
      name = 'condition_evaluator',
      description = 'Evaluates conditions against a context',
      verbose = false,
      strictMode = false,
    } = params;

    super({ name, description, verbose });
    this.strictMode = strictMode;
  }

  get inputSchema() {
    return {
      type: 'object',
      properties: {
        condition: {
          type: 'object',
          description: 'The condition to evaluate',
        },
        context: {
          type: 'object',
          description: 'The context to evaluate the condition against',
        },
        options: {
          type: 'object',
          properties: {
            strictMode: {
              type: 'boolean',
              default: this.strictMode,
              description: 'Whether to throw errors for invalid conditions',
            },
          },
        },
      },
      required: ['condition', 'context'],
    };
  }

  get outputSchema() {
    return {
      type: 'object',
      properties: {
        result: { type: 'boolean' },
        error: { type: 'string' },
      },
      required: ['result'],
    };
  }

  protected validateInput(input: any): { isValid: boolean; error?: string } {
    const schema = z.object({
      condition: z.record(z.any()),
      context: z.record(z.any()),
      options: z.object({
        strictMode: z.boolean().optional(),
      }).optional(),
    });

    try {
      schema.parse(input);
      return { isValid: true };
    } catch (error: any) {
      return { 
        isValid: false, 
        error: error.errors?.map((e: any) => e.message).join(', ') || 'Invalid input'
      };
    }
  }

  async _call(
    input: {
      condition: Condition;
      context: Record<string, any>;
      options?: {
        strictMode?: boolean;
      };
    },
    _runManager?: CallbackManagerForToolRun
  ): Promise<ToolResult> {
    const { condition, context, options = {} } = input;
    const strictMode = options.strictMode ?? this.strictMode;

    try {
      const result = this.evaluateCondition(condition, context, strictMode);
      return {
        output: { result },
        success: true,
      };
    } catch (error) {
      if (strictMode) {
        return {
          output: { 
            result: false, 
            error: error instanceof Error ? error.message : 'Condition evaluation failed' 
          },
          success: false,
          error: error instanceof Error ? error.message : 'Condition evaluation failed',
        };
      }
      return {
        output: { result: false, error: 'Condition evaluation failed' },
        success: false,
        error: 'Condition evaluation failed',
      };
    }
  }

  private evaluateCondition(
    condition: Condition, 
    context: Record<string, any>,
    strictMode: boolean
  ): boolean {
    if (!condition.operator) {
      throw new Error('Missing operator in condition');
    }

    switch (condition.operator) {
      case 'and':
      case 'or':
      case 'not':
        return this.evaluateLogicalCondition(condition as LogicalCondition, context, strictMode);
      default:
        return this.evaluateFieldCondition(condition as FieldCondition, context, strictMode);
    }
  }

  private evaluateLogicalCondition(
    condition: LogicalCondition,
    context: Record<string, any>,
    strictMode: boolean
  ): boolean {
    if (!condition.conditions || !Array.isArray(condition.conditions)) {
      if (strictMode) {
        throw new Error(`Missing or invalid conditions for ${condition.operator} operator`);
      }
      return false;
    }

    switch (condition.operator) {
      case 'and':
        return condition.conditions.every(c => this.evaluateCondition(c, context, strictMode));
      case 'or':
        return condition.conditions.some(c => this.evaluateCondition(c, context, strictMode));
      case 'not':
        if (condition.conditions.length !== 1) {
          if (strictMode) {
            throw new Error('NOT operator requires exactly one condition');
          }
          return false;
        }
        return !this.evaluateCondition(condition.conditions[0], context, strictMode);
      default:
        if (strictMode) {
          throw new Error(`Unsupported logical operator: ${condition.operator}`);
        }
        return false;
    }
  }

  private evaluateFieldCondition(
    condition: FieldCondition,
    context: Record<string, any>,
    strictMode: boolean
  ): boolean {
    const { operator, field, value } = condition;
    
    if (field === undefined) {
      if (strictMode) {
        throw new Error('Field is required for field condition');
      }
      return false;
    }

    const fieldValue = this.getNestedValue(context, field);
    
    // Handle undefined or null values
    if (fieldValue === undefined || fieldValue === null) {
      if (strictMode) {
        throw new Error(`Field '${field}' not found in context`);
      }
      return false;
    }

    try {
      switch (operator) {
        case 'eq':
          return fieldValue == value; // Use loose equality for flexibility
        case 'neq':
          return fieldValue != value; // Use loose inequality for flexibility
        case 'gt':
          return fieldValue > value;
        case 'gte':
          return fieldValue >= value;
        case 'lt':
          return fieldValue < value;
        case 'lte':
          return fieldValue <= value;
        case 'contains':
          if (Array.isArray(fieldValue) || typeof fieldValue === 'string') {
            return fieldValue.includes(value);
          }
          return false;
        case 'startsWith':
          return typeof fieldValue === 'string' && fieldValue.startsWith(value);
        case 'endsWith':
          return typeof fieldValue === 'string' && fieldValue.endsWith(value);
        case 'in':
          return Array.isArray(value) && value.includes(fieldValue);
        case 'notIn':
          return Array.isArray(value) && !value.includes(fieldValue);
        default:
          if (strictMode) {
            throw new Error(`Unsupported operator: ${operator}`);
          }
          return false;
      }
    } catch (error) {
      if (strictMode) {
        throw new Error(`Error evaluating condition: ${error instanceof Error ? error.message : String(error)}`);
      }
      return false;
    }
  }

  private getNestedValue(obj: any, path: string): any {
    if (!obj || typeof obj !== 'object') {
      return undefined;
    }

    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === null || typeof current !== 'object' || !(key in current)) {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }
}

export default ConditionEvaluatorTool;