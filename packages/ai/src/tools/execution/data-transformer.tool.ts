import { BaseTool, type ToolResult } from '../base/base-tool';
import { CallbackManagerForToolRun } from '@langchain/core/callbacks/manager';
import { z } from 'zod';

type DataFormat = 'json' | 'yaml' | 'xml' | 'csv' | 'form-data';
type TransformationType = 'map' | 'filter' | 'sort' | 'group' | 'aggregate' | 'convert-format';

export interface DataTransformerToolParams {
  name?: string;
  description?: string;
  verbose?: boolean;
  defaultInputFormat?: DataFormat;
  defaultOutputFormat?: DataFormat;
}

export class DataTransformerTool extends BaseTool {
  static lc_name() {
    return 'DataTransformerTool';
  }

  defaultInputFormat: DataFormat;
  defaultOutputFormat: DataFormat;

  constructor(params: DataTransformerToolParams = {}) {
    const {
      name = 'data_transformer',
      description = 'Transforms data between different formats and structures',
      verbose = false,
      defaultInputFormat = 'json',
      defaultOutputFormat = 'json',
    } = params;

    super({ name, description, verbose });
    
    this.defaultInputFormat = defaultInputFormat;
    this.defaultOutputFormat = defaultOutputFormat;
  }

  get inputSchema() {
    return {
      type: 'object',
      properties: {
        input: {
          oneOf: [
            { type: 'string' },
            { type: 'object' },
            { type: 'array' },
          ],
          description: 'The input data to transform',
        },
        inputFormat: {
          type: 'string',
          enum: ['json', 'yaml', 'xml', 'csv', 'form-data'],
          default: this.defaultInputFormat,
          description: 'The format of the input data',
        },
        outputFormat: {
          type: 'string',
          enum: ['json', 'yaml', 'xml', 'csv', 'form-data'],
          default: this.defaultOutputFormat,
          description: 'The desired output format',
        },
        transformation: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['map', 'filter', 'sort', 'group', 'aggregate', 'convert-format'],
              description: 'Type of transformation to apply',
            },
            config: {
              type: 'object',
              description: 'Configuration for the transformation',
            },
          },
          required: ['type'],
        },
        options: {
          type: 'object',
          properties: {
            strictMode: {
              type: 'boolean',
              default: false,
              description: 'Whether to throw errors for invalid transformations',
            },
            preserveOriginal: {
              type: 'boolean',
              default: false,
              description: 'Whether to include original data in the output',
            },
          },
        },
      },
      required: ['input'],
    };
  }

  get outputSchema() {
    return {
      type: 'object',
      properties: {
        output: {
          oneOf: [
            { type: 'string' },
            { type: 'object' },
            { type: 'array' },
          ],
          description: 'The transformed output data',
        },
        inputFormat: { type: 'string' },
        outputFormat: { type: 'string' },
        transformation: { type: 'object' },
        metadata: {
          type: 'object',
          properties: {
            inputType: { type: 'string' },
            outputType: { type: 'string' },
            processingTime: { type: 'number' },
          },
        },
      },
      required: ['output', 'inputFormat', 'outputFormat'],
    };
  }

  protected validateInput(input: any): { isValid: boolean; error?: string } {
    const schema = z.object({
      input: z.union([z.string(), z.record(z.any()), z.array(z.any())]),
      inputFormat: z.enum(['json', 'yaml', 'xml', 'csv', 'form-data']).optional(),
      outputFormat: z.enum(['json', 'yaml', 'xml', 'csv', 'form-data']).optional(),
      transformation: z.object({
        type: z.enum(['map', 'filter', 'sort', 'group', 'aggregate', 'convert-format']),
        config: z.record(z.any()).optional(),
      }).optional(),
      options: z.object({
        strictMode: z.boolean().optional(),
        preserveOriginal: z.boolean().optional(),
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
      input: any;
      inputFormat?: DataFormat;
      outputFormat?: DataFormat;
      transformation?: {
        type: TransformationType;
        config?: Record<string, any>;
      };
      options?: {
        strictMode?: boolean;
        preserveOriginal?: boolean;
      };
    },
    _runManager?: CallbackManagerForToolRun
  ): Promise<ToolResult> {
    const startTime = Date.now();
    const {
      input: inputData,
      inputFormat = this.defaultInputFormat,
      outputFormat = this.defaultOutputFormat,
      transformation,
      options = {},
    } = input;

    const {
      strictMode = false,
      preserveOriginal = false,
    } = options;

    try {
      // Parse input data if it's a string
      let parsedInput = inputData;
      if (typeof inputData === 'string') {
        parsedInput = this.parseInput(inputData, inputFormat, strictMode);
      }

      // Apply transformation if specified
      let transformedData = parsedInput;
      if (transformation) {
        transformedData = this.applyTransformation(
          parsedInput,
          transformation.type,
          transformation.config || {},
          strictMode
        );
      }

      // Convert to output format if different from input format or if transformation was applied
      let output: any = transformedData;
      if (outputFormat !== inputFormat || transformation) {
        output = this.convertFormat(transformedData, outputFormat, strictMode);
      }

      const endTime = Date.now();
      
      const result = {
        output,
        inputFormat,
        outputFormat,
        transformation: transformation || { type: 'none' },
        metadata: {
          inputType: this.getType(parsedInput),
          outputType: this.getType(output),
          processingTime: endTime - startTime,
        },
      };

      if (preserveOriginal) {
        return {
          output: {
            ...result,
            original: inputData,
          },
          success: true,
        };
      }

      return {
        output: result,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Data transformation failed';
      
      if (strictMode) {
        return {
          output: null,
          success: false,
          error: errorMessage,
        };
      }

      // In non-strict mode, return the input data if transformation fails
      return {
        output: {
          output: inputData,
          inputFormat,
          outputFormat: inputFormat, // Keep original format if transformation fails
          transformation: { type: 'none' },
          metadata: {
            inputType: this.getType(inputData),
            outputType: this.getType(inputData),
            processingTime: Date.now() - startTime,
            error: errorMessage,
          },
        },
        success: true,
      };
    }
  }

  private parseInput(input: string, format: DataFormat, strictMode: boolean): any {
    try {
      switch (format) {
        case 'json':
          return JSON.parse(input);
        case 'yaml':
          // In a real implementation, you would use a YAML parser here
          // For example: return yaml.load(input);
          try {
            return JSON.parse(input); // Fallback to JSON for now
          } catch (e) {
            if (strictMode) {
              throw new Error('Failed to parse YAML input');
            }
            return input;
          }
        case 'xml':
          // In a real implementation, you would use an XML parser here
          try {
            // This is a simplified implementation
            return { xml: 'XML parsing not implemented', original: input };
          } catch (e) {
            if (strictMode) {
              throw new Error('Failed to parse XML input');
            }
            return input;
          }
        case 'csv':
          // In a real implementation, you would use a CSV parser
          try {
            // This is a simplified implementation
            return input.split('\n').map((line: string) => {
              const values = line.split(',');
              return values.length > 1 ? values : values[0];
            });
          } catch (e) {
            if (strictMode) {
              throw new Error('Failed to parse CSV input');
            }
            return input;
          }
        case 'form-data':
          // In a real implementation, you would parse form data
          try {
            // This is a simplified implementation
            const formData = {} as Record<string, any>;
            input.split('&').forEach(pair => {
              const [key, value] = pair.split('=');
              if (key) {
                formData[decodeURIComponent(key)] = decodeURIComponent(value || '');
              }
            });
            return formData;
          } catch (e) {
            if (strictMode) {
              throw new Error('Failed to parse form-data input');
            }
            return input;
          }
        default:
          if (strictMode) {
            throw new Error(`Unsupported input format: ${format}`);
          }
          return input;
      }
    } catch (error) {
      if (strictMode) {
        throw error;
      }
      return input;
    }
  }

  private applyTransformation(
    data: any,
    type: TransformationType,
    config: Record<string, any>,
    strictMode: boolean
  ): any {
    try {
      switch (type) {
        case 'map':
          return this.applyMap(data, config, strictMode);
        case 'filter':
          return this.applyFilter(data, config, strictMode);
        case 'sort':
          return this.applySort(data, config, strictMode);
        case 'group':
          return this.applyGroup(data, config, strictMode);
        case 'aggregate':
          return this.applyAggregate(data, config, strictMode);
        case 'convert-format':
          return data; // Actual conversion happens in convertFormat
        default:
          if (strictMode) {
            throw new Error(`Unsupported transformation type: ${type}`);
          }
          return data;
      }
    } catch (error) {
      if (strictMode) {
        throw error;
      }
      return data;
    }
  }

  private applyMap(data: any, config: Record<string, any>, strictMode: boolean): any {
    if (!Array.isArray(data)) {
      if (strictMode) {
        throw new Error('Map transformation requires an array input');
      }
      return data;
    }

    const { field, mapping } = config;

    if (!mapping || typeof mapping !== 'object') {
      if (strictMode) {
        throw new Error('Mapping configuration is required for map transformation');
      }
      return data;
    }

    return data.map((item: any) => {
      if (field && item[field] !== undefined) {
        return { ...item, [field]: mapping[item[field]] ?? item[field] };
      }
      return item;
    });
  }

  private applyFilter(data: any, config: Record<string, any>, strictMode: boolean): any {
    if (!Array.isArray(data)) {
      if (strictMode) {
        throw new Error('Filter transformation requires an array input');
      }
      return data;
    }

    const { field, operator, value } = config;

    if (!field || operator === undefined) {
      if (strictMode) {
        throw new Error('Field and operator are required for filter transformation');
      }
      return data;
    }

    return data.filter((item: any) => {
      const itemValue = item[field];
      
      switch (operator) {
        case 'eq': return itemValue == value;
        case 'neq': return itemValue != value;
        case 'gt': return itemValue > value;
        case 'gte': return itemValue >= value;
        case 'lt': return itemValue < value;
        case 'lte': return itemValue <= value;
        case 'contains':
          return typeof itemValue === 'string' && itemValue.includes(value);
        case 'in':
          return Array.isArray(value) && value.includes(itemValue);
        case 'notIn':
          return Array.isArray(value) && !value.includes(itemValue);
        default:
          if (strictMode) {
            throw new Error(`Unsupported filter operator: ${operator}`);
          }
          return true;
      }
    });
  }

  private applySort(data: any, config: Record<string, any>, strictMode: boolean): any {
    if (!Array.isArray(data)) {
      if (strictMode) {
        throw new Error('Sort transformation requires an array input');
      }
      return data;
    }

    const { field, order = 'asc' } = config;

    if (!field) {
      if (strictMode) {
        throw new Error('Field is required for sort transformation');
      }
      return data;
    }

    return [...data].sort((a, b) => {
      const aValue = a[field];
      const bValue = b[field];

      if (aValue === bValue) return 0;
      if (aValue === undefined || aValue === null) return order === 'asc' ? -1 : 1;
      if (bValue === undefined || bValue === null) return order === 'asc' ? 1 : -1;

      return order === 'asc' 
        ? aValue < bValue ? -1 : 1
        : aValue > bValue ? -1 : 1;
    });
  }

  private applyGroup(data: any, config: Record<string, any>, strictMode: boolean): any {
    if (!Array.isArray(data)) {
      if (strictMode) {
        throw new Error('Group transformation requires an array input');
      }
      return data;
    }

    const { by, aggregations = [] } = config;

    if (!by) {
      if (strictMode) {
        throw new Error('Group by field is required for group transformation');
      }
      return data;
    }

    const groups = new Map<any, any[]>();

    // Group the data
    for (const item of data) {
      const key = item[by];
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)?.push(item);
    }

    // Apply aggregations if any
    if (aggregations.length > 0) {
      const result: any[] = [];
      
      for (const [key, groupItems] of groups.entries()) {
        const aggregatedItem: Record<string, any> = { [by]: key };
        
        for (const agg of aggregations) {
          const { field, operation, as = `${field}_${operation}` } = agg;
          
          if (!field || !operation) {
            if (strictMode) {
              throw new Error('Field and operation are required for aggregation');
            }
            continue;
          }
          
          const values = groupItems
            .map((item: any) => item[field])
            .filter((val: any) => val !== undefined && val !== null);
          
          switch (operation.toLowerCase()) {
            case 'sum':
              aggregatedItem[as] = values.reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
              break;
            case 'avg':
            case 'average':
              const sum = values.reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
              aggregatedItem[as] = values.length > 0 ? sum / values.length : 0;
              break;
            case 'min':
              aggregatedItem[as] = values.length > 0 ? Math.min(...values.map((val: any) => Number(val) || 0)) : null;
              break;
            case 'max':
              aggregatedItem[as] = values.length > 0 ? Math.max(...values.map((val: any) => Number(val) || 0)) : null;
              break;
            case 'count':
              aggregatedItem[as] = values.length;
              break;
            case 'first':
              aggregatedItem[as] = values[0];
              break;
            case 'last':
              aggregatedItem[as] = values[values.length - 1];
              break;
            default:
              if (strictMode) {
                throw new Error(`Unsupported aggregation operation: ${operation}`);
              }
              aggregatedItem[as] = values;
          }
        }
        
        result.push(aggregatedItem);
      }
      
      return result;
    }

    // If no aggregations, just return the grouped data as an array of groups
    return Array.from(groups.entries()).map(([key, items]) => ({
      [by]: key,
      items,
      count: items.length,
    }));
  }

  private applyAggregate(data: any, config: Record<string, any>, strictMode: boolean): any {
    if (!Array.isArray(data) || data.length === 0) {
      if (strictMode && data.length === 0) {
        throw new Error('Aggregate transformation requires a non-empty array input');
      }
      return data;
    }

    const { operations } = config;

    if (!Array.isArray(operations) || operations.length === 0) {
      if (strictMode) {
        throw new Error('Operations array is required for aggregate transformation');
      }
      return data;
    }

    const result: Record<string, any> = {};

    for (const operation of operations) {
      const { field, operation: op, as = `${field}_${op}` } = operation;

      if (!field || !op) {
        if (strictMode) {
          throw new Error('Field and operation are required for each aggregation');
        }
        continue;
      }

      const values = data
        .map((item: any) => item[field])
        .filter((val: any) => val !== undefined && val !== null);

      switch (op.toLowerCase()) {
        case 'sum':
          result[as] = values.reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
          break;
        case 'avg':
        case 'average':
          const sum = values.reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
          result[as] = values.length > 0 ? sum / values.length : 0;
          break;
        case 'min':
          result[as] = values.length > 0 ? Math.min(...values.map((val: any) => Number(val) || 0)) : null;
          break;
        case 'max':
          result[as] = values.length > 0 ? Math.max(...values.map((val: any) => Number(val) || 0)) : null;
          break;
        case 'count':
          result[as] = values.length;
          break;
        case 'first':
          result[as] = values[0];
          break;
        case 'last':
          result[as] = values[values.length - 1];
          break;
        default:
          if (strictMode) {
            throw new Error(`Unsupported aggregation operation: ${op}`);
          }
          result[as] = values;
      }
    }

    return result;
  }

  private convertFormat(data: any, format: DataFormat, strictMode: boolean): any {
    try {
      switch (format) {
        case 'json':
          return data; // Already in JSON format
        case 'yaml':
          // In a real implementation, you would use a YAML stringifier here
          // For example: return yaml.dump(data);
          return JSON.stringify(data, null, 2); // Fallback to JSON string for now
        case 'xml':
          // In a real implementation, you would convert to XML
          return this.convertToXml(data);
        case 'csv':
          // In a real implementation, you would convert to CSV
          return this.convertToCsv(data);
        case 'form-data':
          // In a real implementation, you would convert to URL-encoded form data
          return this.convertToFormData(data);
        default:
          if (strictMode) {
            throw new Error(`Unsupported output format: ${format}`);
          }
          return data;
      }
    } catch (error) {
      if (strictMode) {
        throw error;
      }
      return data;
    }
  }

  private convertToXml(data: any): string {
    // Simplified XML conversion for demonstration purposes
    // In a real implementation, you would use a proper XML library
    if (Array.isArray(data)) {
      return `<array>${data.map(item => this.convertToXml(item)).join('')}</array>`;
    } else if (data && typeof data === 'object') {
      const entries = Object.entries(data);
      if (entries.length === 0) {
        return '';
      }
      return entries.map(([key, value]) => {
        if (Array.isArray(value)) {
          return `<${key}>${this.convertToXml(value)}</${key}>`;
        } else if (value && typeof value === 'object') {
          return `<${key}>${this.convertToXml(value)}</${key}>`;
        } else {
          return `<${key}>${String(value)}</${key}>`;
        }
      }).join('');
    } else {
      return String(data);
    }
  }

  private convertToCsv(data: any): string {
    // Simplified CSV conversion for demonstration purposes
    // In a real implementation, you would use a proper CSV library
    if (!Array.isArray(data) || data.length === 0) {
      return '';
    }

    // Get all unique keys from all objects
    const allKeys = new Set<string>();
    data.forEach(item => {
      if (item && typeof item === 'object') {
        Object.keys(item).forEach(key => allKeys.add(key));
      }
    });

    const headers = Array.from(allKeys);
    const rows = [headers];

    // Add data rows
    data.forEach(item => {
      const row = headers.map(header => {
        const value = item && item[header] !== undefined ? item[header] : '';
        // Simple escaping for CSV (double quotes and escape with another double quote)
        const strValue = String(value).replace(/"/g, '""');
        return `"${strValue}"`;
      });
      rows.push(row);
    });

    return rows.map(row => row.join(',')).join('\n');
  }

  private convertToFormData(data: any): string {
    // Convert object to URL-encoded form data
    if (!data || typeof data !== 'object') {
      return '';
    }

    return Object.entries(data)
      .map(([key, value]) => {
        const encodedKey = encodeURIComponent(key);
        if (Array.isArray(value)) {
          return value
            .map((v, i) => `${encodedKey}[${i}]=${encodeURIComponent(String(v))}`)
            .join('&');
        } else if (value && typeof value === 'object') {
          return Object.entries(value as Record<string, any>)
            .map(([k, v]) => `${encodedKey}[${encodeURIComponent(k)}]=${encodeURIComponent(String(v))}`)
            .join('&');
        } else {
          return `${encodedKey}=${encodeURIComponent(String(value))}`;
        }
      })
      .filter(Boolean)
      .join('&');
  }

  private getType(value: any): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }
}

export default DataTransformerTool;