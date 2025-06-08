import { TemplateConfig, TemplateVariable } from './template.interface';

/**
 * Abstract base class for all templates
 * Provides common functionality for template processing and variable interpolation
 */
export abstract class BaseTemplate<T = Record<string, any>> {
  protected config: TemplateConfig;

  constructor(config: TemplateConfig) {
    this.config = config;
  }

  /**
   * Abstract method that must be implemented by subclasses
   * Returns the template string with placeholders
   */
  public abstract getTemplate(): string;

  /**
   * Formats the template with the provided variables
   * @param variables Object containing variable values
   * @returns Formatted template string with variables interpolated
   */
  public format(variables: T): string {
    // Cast to any to handle generic type T
    this.validateVariables(variables as any);
    let template = this.getTemplate();
    return this.interpolate(template, variables as Record<string, any>);
  }

  /**
   * Validates the provided variables against the template's variable definitions
   * @param variables Variables to validate
   * @throws Error if validation fails
   */
  public validateVariables(variables: any): void {
    const missing: string[] = [];
    const invalid: string[] = [];

    this.config.variables.forEach(variable => {
      // Check required variables
      if (variable.required && !(variable.name in variables)) {
        missing.push(variable.name);
        return;
      }

      // Skip type checking for undefined/optional variables
      if (!(variable.name in variables) || variables[variable.name] === undefined) {
        return;
      }

      // Validate type
      const value = variables[variable.name];
      if (!this.isValidType(value, variable.type)) {
        invalid.push(`${variable.name}: expected ${variable.type}, got ${typeof value}`);
      }
    });

    // Throw error if validation fails
    const errors: string[] = [];
    if (missing.length > 0) {
      errors.push(`Missing required variables: ${missing.join(', ')}`);
    }
    if (invalid.length > 0) {
      errors.push(`Type errors: ${invalid.join('; ')}`);
    }

    if (errors.length > 0) {
      throw new Error(`Template validation failed: ${errors.join('; ')}`);
    }
  }

  /**
   * Gets the template configuration
   */
  public getConfig(): TemplateConfig {
    return { ...this.config };
  }

  /**
   * Gets the template variables definition
   */
  public getVariables(): Array<TemplateVariable> {
    return [...this.config.variables];
  }

  /**
   * Gets an example input for this template
   * @returns Example input if available, undefined otherwise
   */
  public getExampleInput(): Record<string, any> | undefined {
    return this.config.examples?.[0]?.input;
  }

  /**
   * Interpolates variables into the template
   * @param template Template string with placeholders
   * @param variables Variables to interpolate
   * @returns Interpolated string
   */
  protected interpolate(template: string, variables: Record<string, any>): string {
    let result = template;

    // Replace simple variables: {{variable}}
    result = result.replace(/\{\{([^{}]+)\}\}/g, (_, varName) => {
      const value = this.getNestedValue(variables, varName.trim());
      return value !== undefined ? String(value) : '';
    });

    // Handle if/else blocks
    result = this.processConditionals(result, variables);

    // Handle each loops
    result = this.processLoops(result, variables);

    return result;
  }

  /**
   * Processes conditional blocks in the template
   */
  private processConditionals(template: string, variables: Record<string, any>): string {
    // Handle if/else blocks: {{#if var}}...{{else}}...{{/if}}
    return template.replace(
      /\{\{#if\s+([^}]+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g,
      (_, condition, ifContent, elseContent = '') => {
        const isTruthy = this.evaluateCondition(condition, variables);
        return isTruthy ? ifContent : elseContent;
      }
    );
  }

  /**
   * Processes loop blocks in the template
   */
  private processLoops(template: string, variables: Record<string, any>): string {
    // Handle each loops: {{#each array}}...{{/each}}
    return template.replace(
      /\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
      (_, arrayPath, loopContent) => {
        const array = this.getNestedValue(variables, arrayPath.trim());
        if (!Array.isArray(array)) return '';

        return array
          .map((item, index) => {
            let result = loopContent;
            
            // Replace {{this}} with current item
            if (typeof item === 'object' && item !== null) {
              Object.entries(item).forEach(([key, value]) => {
                result = result.replace(
                  new RegExp(`\\{\\{${key}\\?\\}\\}`, 'g'),
                  value !== undefined ? String(value) : ''
                );
              });
            }
            
            // Replace {{@index}} with current index
            result = result.replace(/\{\{@index\}\}/g, String(index));
            
            // Replace {{this}} with the item (for non-object values)
            if (typeof item !== 'object' || item === null) {
              result = result.replace(/\{\{this\}\}/g, String(item));
            }
            
            return result;
          })
          .join('');
      }
    );
  }

  /**
   * Gets a nested value from an object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      if (current === null || current === undefined) return undefined;
      return current[key];
    }, obj);
  }

  /**
   * Evaluates a condition in the template
   */
  private evaluateCondition(condition: string, variables: Record<string, any>): boolean {
    // Simple variable existence check
    if (/^\w+$/.test(condition)) {
      const value = this.getNestedValue(variables, condition);
      return Boolean(value);
    }

    // TODO: Add support for more complex conditions if needed
    // For now, just evaluate as JavaScript (be careful with security!)
    try {
      // Replace variable references with their values
      const evaluated = condition.replace(/\b(\w+)\b/g, (_, varName) => {
        const value = this.getNestedValue(variables, varName);
        return JSON.stringify(value);
      });
      
      // Evaluate the condition
      // eslint-disable-next-line no-new-func
      return new Function(`return ${evaluated}`)();
    } catch (e) {
      console.warn(`Failed to evaluate condition: ${condition}`, e);
      return false;
    }
  }

  /**
   * Checks if a value matches the expected type
   */
  private isValidType(value: any, type: string): boolean {
    if (value === null) return type === 'null';
    
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && !Array.isArray(value) && value !== null;
      case 'any':
        return true;
      default:
        return false;
    }
  }
}
