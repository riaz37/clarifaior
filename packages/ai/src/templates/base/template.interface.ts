export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description?: string;
  defaultValue?: any;
}

export interface TemplateConfig {
  name: string;
  description?: string;
  version?: string;
  variables: TemplateVariable[];
  examples?: Array<{
    input: Record<string, any>;
    expectedOutput?: string;
  }>;
}

export abstract class BaseTemplate {
  protected config: TemplateConfig;

  constructor(config: TemplateConfig) {
    this.config = config;
  }

  abstract getTemplate(): string;

  format(variables: Record<string, any>): string {
    const template = this.getTemplate();
    return this.interpolateVariables(template, variables);
  }

  validate(variables: Record<string, any>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required variables
    this.config.variables.forEach(variable => {
      if (variable.required && !(variable.name in variables)) {
        errors.push(`Required variable '${variable.name}' is missing`);
      }

      if (variable.name in variables) {
        const value = variables[variable.name];
        if (!this.validateVariableType(value, variable.type)) {
          errors.push(`Variable '${variable.name}' must be of type ${variable.type}`);
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  getVariables(): TemplateVariable[] {
    return this.config.variables;
  }

  getName(): string {
    return this.config.name;
  }

  getDescription(): string {
    return this.config.description || '';
  }

  private interpolateVariables(template: string, variables: Record<string, any>): string {
    let result = template;

    // Replace {{variable}} patterns
    Object.entries(variables).forEach(([key, value]) => {
      const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      result = result.replace(pattern, this.formatValue(value));
    });

    // Handle conditional blocks {{#if variable}}...{{/if}}
    result = this.handleConditionals(result, variables);

    // Handle loops {{#each array}}...{{/each}}
    result = this.handleLoops(result, variables);

    return result;
  }

  private formatValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  }

  private handleConditionals(template: string, variables: Record<string, any>): string {
    const conditionalPattern = /\{\{#if\s+(\w+)\}\}(.*?)\{\{\/if\}\}/gs;
    
    return template.replace(conditionalPattern, (match, variableName, content) => {
      const value = variables[variableName];
      return value ? content : '';
    });
  }

  private handleLoops(template: string, variables: Record<string, any>): string {
    const loopPattern = /\{\{#each\s+(\w+)\}\}(.*?)\{\{\/each\}\}/gs;
    
    return template.replace(loopPattern, (match, variableName, content) => {
      const array = variables[variableName];
      if (!Array.isArray(array)) {
        return '';
      }

      return array.map((item, index) => {
        let itemContent = content;
        // Replace {{this}} with current item
        itemContent = itemContent.replace(/\{\{this\}\}/g, this.formatValue(item));
        // Replace {{@index}} with current index
        itemContent = itemContent.replace(/\{\{@index\}\}/g, String(index));
        
        // If item is an object, replace {{property}} with item.property
        if (typeof item === 'object' && item !== null) {
          Object.entries(item).forEach(([key, value]) => {
            const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            itemContent = itemContent.replace(pattern, this.formatValue(value));
          });
        }
        
        return itemContent;
      }).join('');
    });
  }

  private validateVariableType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'array':
        return Array.isArray(value);
      default:
        return false;
    }
  }
}