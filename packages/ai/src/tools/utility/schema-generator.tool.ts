import { BaseTool, type ToolResult } from '../base/base-tool';
import { CallbackManagerForToolRun } from '@langchain/core/callbacks/manager';
import { z } from 'zod';

export interface SchemaGeneratorToolParams {
  name?: string;
  description?: string;
  verbose?: boolean;
  /**
   * The default output format for generated schemas
   * @default 'json-schema'
   */
  defaultFormat?: 'json-schema' | 'typescript' | 'zod' | 'yup';
  /**
   * Whether to include examples in the generated schema
   * @default true
   */
  includeExamples?: boolean;
  /**
   * Whether to include descriptions in the generated schema
   * @default true
   */
  includeDescriptions?: boolean;
}

export class SchemaGeneratorTool extends BaseTool {
  static lc_name() {
    return 'SchemaGeneratorTool';
  }

  defaultFormat: 'json-schema' | 'typescript' | 'zod' | 'yup';
  includeExamples: boolean;
  includeDescriptions: boolean;

  constructor(params: SchemaGeneratorToolParams = {}) {
    const {
      name = 'schema_generator',
      description = 'Generates schemas from examples or descriptions',
      verbose = false,
      defaultFormat = 'json-schema',
      includeExamples = true,
      includeDescriptions = true,
    } = params;

    super({ name, description, verbose });
    
    this.defaultFormat = defaultFormat;
    this.includeExamples = includeExamples;
    this.includeDescriptions = includeDescriptions;
  }

  get inputSchema() {
    return {
      type: 'object',
      properties: {
        description: {
          type: 'string',
          description: 'Description of the data structure to generate a schema for',
        },
        examples: {
          type: 'array',
          items: { type: 'object' },
          description: 'Example data to infer the schema from',
        },
        format: {
          type: 'string',
          enum: ['json-schema', 'typescript', 'zod', 'yup'],
          default: this.defaultFormat,
          description: 'Output format for the generated schema',
        },
        includeExamples: {
          type: 'boolean',
          default: this.includeExamples,
          description: 'Whether to include examples in the generated schema',
        },
        includeDescriptions: {
          type: 'boolean',
          default: this.includeDescriptions,
          description: 'Whether to include descriptions in the generated schema',
        },
      },
      required: ['description'],
    };
  }

  get outputSchema() {
    return {
      type: 'object',
      properties: {
        schema: {
          type: 'string',
          description: 'The generated schema in the requested format',
        },
        format: {
          type: 'string',
          description: 'The format of the generated schema',
        },
        metadata: {
          type: 'object',
          properties: {
            properties: {
              type: 'array',
              items: { type: 'string' },
            },
            required: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      },
      required: ['schema', 'format'],
    };
  }

  protected validateInput(input: any): { isValid: boolean; error?: string } {
    const schema = z.object({
      description: z.string().min(10, 'Description must be at least 10 characters'),
      examples: z.array(z.record(z.any())).optional(),
      format: z.enum(['json-schema', 'typescript', 'zod', 'yup']).optional(),
      includeExamples: z.boolean().optional(),
      includeDescriptions: z.boolean().optional(),
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
      description: string;
      examples?: Record<string, any>[];
      format?: 'json-schema' | 'typescript' | 'zod' | 'yup';
      includeExamples?: boolean;
      includeDescriptions?: boolean;
    },
    _runManager?: CallbackManagerForToolRun
  ): Promise<ToolResult> {
    const {
      description,
      examples = [],
      format = this.defaultFormat,
      includeExamples = this.includeExamples,
      includeDescriptions = this.includeDescriptions,
    } = input;

    try {
      // This is a simplified implementation
      // In a real implementation, this would use a more sophisticated schema inference
      const schema = this.generateSchema(description, examples, {
        format,
        includeExamples,
        includeDescriptions,
      });

      return {
        output: {
          schema,
          format,
          metadata: {
            properties: this.extractProperties(schema, format),
            required: this.extractRequired(schema, format),
          },
        },
        success: true,
      };
    } catch (error) {
      return {
        output: null,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate schema',
      };
    }
  }

  private generateSchema(
    description: string,
    examples: Record<string, any>[],
    options: {
      format: 'json-schema' | 'typescript' | 'zod' | 'yup';
      includeExamples: boolean;
      includeDescriptions: boolean;
    }
  ): string {
    const { format, includeExamples, includeDescriptions } = options;
    
    // Define a type for property definitions
    type PropertyDefinition = {
      type: string;
      format?: string;
      description?: string;
      required?: boolean;
    };
    
    // In a real implementation, this would analyze the examples and description
    // to generate an appropriate schema. This is a simplified version.
    const commonProps: Record<string, PropertyDefinition> = {
      name: { type: 'string', description: 'The name of the item' },
      description: { type: 'string', description: 'A description of the item' },
      id: { type: 'string', format: 'uuid', description: 'Unique identifier' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    };

    // Generate a simple schema based on the description
    const schemaName = this.generateSchemaName(description);
    const properties: Record<string, PropertyDefinition> = { ...commonProps };
    
    // Add any additional properties from examples
    if (examples.length > 0) {
      examples.forEach(example => {
        Object.entries(example).forEach(([key, value]) => {
          if (!(key in properties)) {
            const type = this.inferType(value);
            properties[key] = { type };
          }
        });
      });
    }

    // Format the schema based on the requested format
    switch (format) {
      case 'json-schema':
        return this.toJsonSchema(schemaName, properties, {
          includeDescriptions,
          includeExamples: includeExamples && examples.length > 0 ? examples[0] : undefined,
        });
      case 'typescript':
        return this.toTypeScript(schemaName, properties, {
          includeDescriptions,
        });
      case 'zod':
        return this.toZod(schemaName, properties, {
          includeDescriptions,
        });
      case 'yup':
        return this.toYup(schemaName, properties, {
          includeDescriptions,
        });
      default:
        throw new Error(`Unsupported schema format: ${format}`);
    }
  }

  private generateSchemaName(description: string): string {
    // Convert description to PascalCase
    return description
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('')
      .replace(/[^\w]/g, '');
  }

  private inferType(value: any): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) {
      if (value.length > 0) {
        return `${this.inferType(value[0])}[]`;
      }
      return 'array';
    }
    return typeof value;
  }

  private toJsonSchema(
    name: string,
    properties: Record<string, any>,
    options: { includeDescriptions: boolean; includeExamples?: any }
  ): string {
    const { includeDescriptions, includeExamples } = options;
    const schema: any = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      title: name,
      type: 'object',
      properties: {},
      required: ['name', 'description'],
    };

    Object.entries(properties).forEach(([key, prop]) => {
      schema.properties[key] = {
        type: prop.type,
      };
      
      if (includeDescriptions && prop.description) {
        schema.properties[key].description = prop.description;
      }
      
      if (includeExamples && includeExamples[key] !== undefined) {
        schema.properties[key].examples = [includeExamples[key]];
      }
      
      if (prop.format) {
        schema.properties[key].format = prop.format;
      }
    });

    return JSON.stringify(schema, null, 2);
  }

  private toTypeScript(
    name: string,
    properties: Record<string, any>,
    options: { includeDescriptions: boolean }
  ): string {
    const { includeDescriptions } = options;
    let result = `interface ${name} {\n`;
    
    Object.entries(properties).forEach(([key, prop]) => {
      if (includeDescriptions && prop.description) {
        result += `  /** ${prop.description} */\n`;
      }
      result += `  ${key}${prop.required ? '' : '?'}: ${this.mapToTsType(prop)};\n`;
    });
    
    result += '}';
    return result;
  }

  private toZod(
    name: string,
    properties: Record<string, any>,
    options: { includeDescriptions: boolean }
  ): string {
    const { includeDescriptions } = options;
    let result = `import { z } from 'zod';\n\n`;
    result += `export const ${name}Schema = z.object({\n`;
    
    Object.entries(properties).forEach(([key, prop]) => {
      let line = `  ${key}: ${this.mapToZodType(prop)}`;
      
      if (includeDescriptions && prop.description) {
        line = `  /** ${prop.description} */\n${line}`;
      }
      
      result += `${line},\n`;
    });
    
    result += '});\n';
    result += `export type ${name} = z.infer<typeof ${name}Schema>;\n`;
    
    return result;
  }

  private toYup(
    name: string,
    properties: Record<string, any>,
    options: { includeDescriptions: boolean }
  ): string {
    const { includeDescriptions } = options;
    let result = `import * as yup from 'yup';\n\n`;
    result += `export const ${name}Schema = yup.object({\n`;
    
    Object.entries(properties).forEach(([key, prop]) => {
      let line = `  ${key}: ${this.mapToYupType(prop)}`;
      
      if (includeDescriptions && prop.description) {
        line = `  /** ${prop.description} */\n${line}`;
      }
      
      result += `${line},\n`;
    });
    
    result += '});\n';
    result += `export type ${name} = yup.InferType<typeof ${name}Schema>;\n`;
    
    return result;
  }

  private mapToTsType(prop: any): string {
    const type = prop.type || 'any';
    
    switch (type) {
      case 'string':
        return 'string';
      case 'number':
      case 'integer':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'null':
        return 'null';
      case 'array':
        return 'any[]';
      case 'object':
        return 'Record<string, any>';
      default:
        if (type.endsWith('[]')) {
          return `${this.mapToTsType({ type: type.slice(0, -2) })}[]`;
        }
        return 'any';
    }
  }

  private mapToZodType(prop: any): string {
    const type = prop.type || 'any';
    let zodType = '';
    
    switch (type) {
      case 'string':
        zodType = 'z.string()';
        if (prop.format === 'date-time') {
          zodType += '.datetime()';
        } else if (prop.format === 'email') {
          zodType += '.email()';
        } else if (prop.format === 'uri') {
          zodType += '.url()';
        } else if (prop.format === 'uuid') {
          zodType += '.uuid()';
        }
        break;
      case 'number':
        zodType = 'z.number()';
        break;
      case 'integer':
        zodType = 'z.number().int()';
        break;
      case 'boolean':
        zodType = 'z.boolean()';
        break;
      case 'array':
        zodType = 'z.array(z.any())';
        break;
      case 'object':
        zodType = 'z.record(z.any())';
        break;
      default:
        if (type.endsWith('[]')) {
          const itemType = this.mapToZodType({ type: type.slice(0, -2) });
          zodType = `z.array(${itemType})`;
        } else {
          zodType = 'z.any()';
        }
    }
    
    return zodType + (prop.required ? '' : '.optional()');
  }

  private mapToYupType(prop: any): string {
    const type = prop.type || 'any';
    let yupType = '';
    
    switch (type) {
      case 'string':
        yupType = 'yup.string()';
        if (prop.format === 'date-time') {
          yupType += '.required()';
        } else if (prop.format === 'email') {
          yupType += '.email()';
        } else if (prop.format === 'uuid') {
          yupType += '.matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)';
        }
        break;
      case 'number':
        yupType = 'yup.number()';
        break;
      case 'integer':
        yupType = 'yup.number().integer()';
        break;
      case 'boolean':
        yupType = 'yup.boolean()';
        break;
      case 'array':
        yupType = 'yup.array()';
        break;
      case 'object':
        yupType = 'yup.object()';
        break;
      default:
        if (type.endsWith('[]')) {
          yupType = 'yup.array()';
        } else {
          yupType = 'yup.mixed()';
        }
    }
    
    return yupType + (prop.required ? '.required()' : '');
  }

  private extractProperties(schema: string, format: string): string[] {
    try {
      if (format === 'json-schema') {
        const json = JSON.parse(schema);
        return Object.keys(json.properties || {});
      }
      
      // For other formats, use a simple regex to extract property names
      const propertyRegex = /(?:^|\s)(\w+)\s*[:=]/gm;
      const matches = [];
      let match;
      
      while ((match = propertyRegex.exec(schema)) !== null) {
        matches.push(match[1]);
      }
      
      return matches;
    } catch (error) {
      return [];
    }
  }

  private extractRequired(schema: string, format: string): string[] {
    try {
      if (format === 'json-schema') {
        const json = JSON.parse(schema);
        return Array.isArray(json.required) ? json.required : [];
      }
      
      // For other formats, look for required indicators
      const requiredRegex = /(\w+)\s*[:=]\s*[^?]/g;
      const matches = [];
      let match;
      
      while ((match = requiredRegex.exec(schema)) !== null) {
        matches.push(match[1]);
      }
      
      return matches;
    } catch (error) {
      return [];
    }
  }
}

export default SchemaGeneratorTool;