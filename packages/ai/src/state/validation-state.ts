import { z } from 'zod';
import { BaseState } from './base/base-state';

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  /**
   * Unique identifier for the validation issue
   */
  id: string;
  
  /**
   * Human-readable message describing the issue
   */
  message: string;
  
  /**
   * The severity level of the issue
   */
  severity: ValidationSeverity;
  
  /**
   * Optional error code for programmatic handling
   */
  code?: string;
  
  /**
   * The field or path that the issue relates to (e.g., 'user.email', 'config.timeout')
   */
  path?: string | string[];
  
  /**
   * Additional context about the issue
   */
  context?: Record<string, unknown>;
  
  /**
   * Timestamp when the issue was created
   */
  timestamp: Date;
}

export interface ValidationResult {
  /**
   * Whether the validation passed (no errors)
   */
  isValid: boolean;
  
  /**
   * Number of validation errors
   */
  errorCount: number;
  
  /**
   * Number of validation warnings
   */
  warningCount: number;
  
  /**
   * Number of informational messages
   */
  infoCount: number;
  
  /**
   * All validation issues found
   */
  issues: ValidationIssue[];
  
  /**
   * The raw validation result from Zod or other validators
   */
  rawResult?: unknown;
}

export interface ValidationRule<T = unknown> {
  /**
   * Unique identifier for the rule
   */
  id: string;
  
  /**
   * Human-readable name for the rule
   */
  name: string;
  
  /**
   * Description of what the rule validates
   */
  description?: string;
  
  /**
   * The severity level if this rule fails
   */
  severity: ValidationSeverity;
  
  /**
   * The validation function that returns a boolean or a Promise<boolean>
   */
  validate: (value: T, context?: Record<string, unknown>) => boolean | Promise<boolean>;
  
  /**
   * Optional function to generate a custom error message
   */
  message?: (value: T, context?: Record<string, unknown>) => string;
}

export interface ValidationStateData {
  /**
   * The ID of the workflow or component being validated
   */
  targetId: string;
  
  /**
   * The type of the target (e.g., 'workflow', 'step', 'input')
   */
  targetType: string;
  
  /**
   * The validation rules to apply
   */
  rules: Array<ValidationRule>;
  
  /**
   * The current validation results
   */
  result: ValidationResult;
  
  /**
   * Additional context for validation
   */
  context: Record<string, unknown>;
  
  /**
   * Whether to stop validation after the first error
   */
  failFast: boolean;
  
  /**
   * The schema to validate against (if using schema validation)
   */
  schema?: z.ZodSchema;
}

export class ValidationState extends BaseState<ValidationStateData> {
  constructor(init: {
    targetId: string;
    targetType: string;
    rules?: Array<ValidationRule>;
    context?: Record<string, unknown>;
    failFast?: boolean;
    schema?: z.ZodSchema;
  }) {
    const emptyResult: ValidationResult = {
      isValid: true,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      issues: [],
    };

    super({
      ...init,
      status: 'idle',
      data: {
        targetId: init.targetId,
        targetType: init.targetType,
        rules: init.rules || [],
        result: emptyResult,
        context: init.context || {},
        failFast: init.failFast !== undefined ? init.failFast : true,
        schema: init.schema,
      },
    });
  }

  /**
   * Adds a validation rule
   */
  addRule(rule: ValidationRule): void {
    this.data.rules.push(rule);
  }

  /**
   * Adds multiple validation rules
   */
  addRules(rules: ValidationRule[]): void {
    this.data.rules.push(...rules);
  }

  /**
   * Removes a validation rule by ID
   */
  removeRule(ruleId: string): boolean {
    const initialLength = this.data.rules.length;
    this.data.rules = this.data.rules.filter(rule => rule.id !== ruleId);
    return this.data.rules.length !== initialLength;
  }

  /**
   * Validates a value against the current rules and schema
   */
  async validate<T>(value: T): Promise<ValidationResult> {
    this.setStatus('validating');
    
    const result: ValidationResult = {
      isValid: true,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      issues: [],
    };

    try {
      // Validate against schema if provided
      if (this.data.schema) {
        const schemaResult = await this.validateWithSchema(value);
        if (!schemaResult.isValid) {
          result.issues.push(...schemaResult.issues);
          result.errorCount += schemaResult.errorCount;
          result.warningCount += schemaResult.warningCount;
          result.infoCount += schemaResult.infoCount;
          result.isValid = false;
          
          if (this.data.failFast) {
            this.updateValidationResult(result);
            return result;
          }
        }
      }

      // Validate against rules
      for (const rule of this.data.rules) {
        try {
          const isValid = await rule.validate(value, this.data.context);
          
          if (!isValid) {
            const issue: ValidationIssue = {
              id: `rule-${rule.id}-${Date.now()}`,
              message: rule.message 
                ? rule.message(value, this.data.context) 
                : `Validation failed for rule: ${rule.name}`,
              severity: rule.severity,
              code: rule.id,
              timestamp: new Date(),
            };

            result.issues.push(issue);
            
            switch (rule.severity) {
              case 'error':
                result.errorCount++;
                result.isValid = false;
                break;
              case 'warning':
                result.warningCount++;
                break;
              case 'info':
                result.infoCount++;
                break;
            }
            
            if (this.data.failFast && rule.severity === 'error') {
              break;
            }
          }
        } catch (error) {
          const issue: ValidationIssue = {
            id: `error-${rule.id}-${Date.now()}`,
            message: `Error executing validation rule '${rule.name}': ${error instanceof Error ? error.message : String(error)}`,
            severity: 'error',
            code: 'VALIDATION_ERROR',
            timestamp: new Date(),
          };
          
          result.issues.push(issue);
          result.errorCount++;
          result.isValid = false;
          
          if (this.data.failFast) {
            break;
          }
        }
      }
      
      this.updateValidationResult(result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      this.setError({ message: errorMessage });
      this.setStatus('error');
      
      const errorResult: ValidationResult = {
        isValid: false,
        errorCount: 1,
        warningCount: 0,
        infoCount: 0,
        issues: [{
          id: `error-${Date.now()}`,
          message: `Validation failed: ${errorMessage}`,
          severity: 'error',
          timestamp: new Date(),
        }],
      };
      
      this.updateValidationResult(errorResult);
      return errorResult;
    }
  }

  /**
   * Validates a value against the schema
   */
  private async validateWithSchema<T>(value: T): Promise<ValidationResult> {
    if (!this.data.schema) {
      return {
        isValid: true,
        errorCount: 0,
        warningCount: 0,
        infoCount: 0,
        issues: [],
      };
    }

    try {
      const result = this.data.schema.safeParse(value);
      
      if (result.success) {
        return {
          isValid: true,
          errorCount: 0,
          warningCount: 0,
          infoCount: 0,
          issues: [],
        };
      }

      // Convert Zod errors to validation issues
      const issues: ValidationIssue[] = result.error.errors.map(err => ({
        id: `schema-${err.code}-${Date.now()}`,
        message: err.message,
        severity: 'error',
        code: err.code,
        path: err.path.map(p => String(p)), // Ensure path is always string[]
        timestamp: new Date(),
      }));

      return {
        isValid: false,
        errorCount: issues.length,
        warningCount: 0,
        infoCount: 0,
        issues,
        rawResult: result,
      };
    } catch (error) {
      throw new Error(`Schema validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Updates the validation result and state
   */
  private updateValidationResult(result: ValidationResult): void {
    this.data.result = result;
    
    if (result.errorCount > 0) {
      this.setStatus('failed');
    } else if (result.warningCount > 0) {
      this.setStatus('warning');
    } else if (result.infoCount > 0) {
      this.setStatus('info');
    } else {
      this.setStatus('completed');
    }
  }

  /**
   * Gets all validation errors
   */
  getErrors(): ValidationIssue[] {
    return this.data.result.issues.filter(issue => issue.severity === 'error');
  }

  /**
   * Gets all validation warnings
   */
  getWarnings(): ValidationIssue[] {
    return this.data.result.issues.filter(issue => issue.severity === 'warning');
  }

  /**
   * Gets all informational messages
   */
  getInfos(): ValidationIssue[] {
    return this.data.result.issues.filter(issue => issue.severity === 'info');
  }

  /**
   * Clears all validation results and resets the state
   */
  clear(): void {
    this.data.result = {
      isValid: true,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      issues: [],
    };
    this.setStatus('idle');
    this.clearError();
  }
}

export default ValidationState;
