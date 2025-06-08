import BaseParser from './base/base-parser';

export interface Condition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'startsWith' | 'endsWith' | 'in' | 'notIn';
  value: any;
  logicalOperator?: 'and' | 'or';
}

export interface ConditionGroup {
  conditions: (Condition | ConditionGroup)[];
  logicalOperator: 'and' | 'or';
}

export type ConditionExpression = Condition | ConditionGroup;

export interface ConditionParserOptions {
  /** Whether to validate the condition structure */
  validate?: boolean;
  /** Custom operators and their evaluators */
  customOperators?: Record<string, (fieldValue: any, conditionValue: any) => boolean>;
}

/**
 * Parser for conditional expressions
 */
export class ConditionParser extends BaseParser<ConditionExpression, boolean> {
  private options: Required<ConditionParserOptions>;
  private defaultOperators = {
    eq: (a: any, b: any) => a === b,
    neq: (a: any, b: any) => a !== b,
    gt: (a: any, b: any) => a > b,
    lt: (a: any, b: any) => a < b,
    gte: (a: any, b: any) => a >= b,
    lte: (a: any, b: any) => a <= b,
    contains: (a: string, b: string) => a.includes(b),
    startsWith: (a: string, b: string) => a.startsWith(b),
    endsWith: (a: string, b: string) => a.endsWith(b),
    in: (a: any, b: any[]) => b.includes(a),
    notIn: (a: any, b: any[]) => !b.includes(a),
  };

  constructor(options: ConditionParserOptions = {}) {
    super();
    this.options = {
      validate: options.validate ?? true,
      customOperators: { ...this.defaultOperators, ...(options.customOperators || {}) },
    };
  }

  /**
   * Parses and evaluates a condition expression against a context
   * @param condition The condition or condition group to evaluate
   * @param context The context object containing field values
   * @returns The result of the evaluation (true/false)
   */
  async parse(condition: ConditionExpression, context: Record<string, any> = {}): Promise<boolean> {
    this.validateInput(condition);
    
    if (this.isConditionGroup(condition)) {
      return this.evaluateConditionGroup(condition, context);
    } else {
      return this.evaluateCondition(condition, context);
    }
  }

  /**
   * Evaluates a single condition
   * @private
   */
  private evaluateCondition(condition: Condition, context: Record<string, any>): boolean {
    const { field, operator, value } = condition;
    const fieldValue = this.getFieldValue(field, context);
    const evaluator = this.options.customOperators[operator];

    if (!evaluator) {
      throw new Error(`Unsupported operator: ${operator}`);
    }

    return evaluator(fieldValue, value);
  }

  /**
   * Evaluates a group of conditions
   * @private
   */
  private evaluateConditionGroup(
    group: ConditionGroup,
    context: Record<string, any>
  ): boolean {
    const { conditions, logicalOperator } = group;
    
    if (conditions.length === 0) {
      return true; // Empty group evaluates to true
    }

    const results = conditions.map(condition => {
      if (this.isConditionGroup(condition)) {
        return this.evaluateConditionGroup(condition, context);
      } else {
        return this.evaluateCondition(condition, context);
      }
    });

    if (logicalOperator === 'and') {
      return results.every(Boolean);
    } else {
      return results.some(Boolean);
    }
  }

  /**
   * Gets a nested field value from the context using dot notation
   * @private
   */
  private getFieldValue(path: string, context: any): any {
    return path.split('.').reduce((obj, key) => {
      if (obj === null || obj === undefined) {
        return undefined;
      }
      return obj[key];
    }, context);
  }

  /**
   * Type guard to check if an expression is a condition group
   * @private
   */
  private isConditionGroup(
    condition: Condition | ConditionGroup
  ): condition is ConditionGroup {
    return 'conditions' in condition && 'logicalOperator' in condition;
  }

  /**
   * Validates the condition structure
   * @private
   */
  protected validateInput(condition: ConditionExpression): void {
    super.validateInput(condition);

    if (this.options.validate) {
      if (this.isConditionGroup(condition)) {
        this.validateConditionGroup(condition);
      } else {
        this.validateSingleCondition(condition);
      }
    }
  }

  /**
   * Validates a single condition
   * @private
   */
  private validateSingleCondition(condition: Condition): void {
    const { field, operator } = condition;

    if (!field || typeof field !== 'string') {
      throw new Error('Condition must have a valid field name');
    }

    if (!this.options.customOperators[operator]) {
      throw new Error(`Unsupported operator: ${operator}`);
    }
  }

  /**
   * Validates a condition group
   * @private
   */
  private validateConditionGroup(group: ConditionGroup): void {
    const { conditions, logicalOperator } = group;

    if (!Array.isArray(conditions)) {
      throw new Error('Condition group must have an array of conditions');
    }

    if (logicalOperator !== 'and' && logicalOperator !== 'or') {
      throw new Error('Logical operator must be either "and" or "or"');
    }

    conditions.forEach(condition => {
      if (this.isConditionGroup(condition)) {
        this.validateConditionGroup(condition);
      } else {
        this.validateSingleCondition(condition);
      }
    });
  }
}

export default ConditionParser;