import { BaseTool, type ToolResult } from '../base/base-tool';
import { CallbackManagerForToolRun } from '@langchain/core/callbacks/manager';
import { z } from 'zod';

export interface CodeGeneratorToolParams {
  name?: string;
  description?: string;
  verbose?: boolean;
  /**
   * The programming language to generate code in
   * @default 'typescript'
   */
  language?: string;
  /**
   * Whether to include tests with the generated code
   * @default false
   */
  includeTests?: boolean;
  /**
   * Whether to include documentation with the generated code
   * @default true
   */
  includeDocs?: boolean;
  /**
   * Whether to include examples with the generated code
   * @default true
   */
  includeExamples?: boolean;
}

export class CodeGeneratorTool extends BaseTool {
  static lc_name() {
    return 'CodeGeneratorTool';
  }

  language: string;
  includeTests: boolean;
  includeDocs: boolean;
  includeExamples: boolean;

  constructor(params: CodeGeneratorToolParams = {}) {
    const {
      name = 'code_generator',
      description = 'Generates code based on requirements',
      verbose = false,
      language = 'typescript',
      includeTests = false,
      includeDocs = true,
      includeExamples = true,
    } = params;

    super({ name, description, verbose });
    
    this.language = language;
    this.includeTests = includeTests;
    this.includeDocs = includeDocs;
    this.includeExamples = includeExamples;
  }

  get inputSchema() {
    return {
      type: 'object',
      properties: {
        requirements: {
          type: 'string',
          description: 'Detailed description of the code to generate',
        },
        language: {
          type: 'string',
          description: 'Programming language to generate code in',
          enum: ['typescript', 'javascript', 'python', 'java', 'csharp', 'go', 'rust'],
          default: this.language,
        },
        includeTests: {
          type: 'boolean',
          description: 'Whether to include tests with the generated code',
          default: this.includeTests,
        },
        includeDocs: {
          type: 'boolean',
          description: 'Whether to include documentation with the generated code',
          default: this.includeDocs,
        },
        includeExamples: {
          type: 'boolean',
          description: 'Whether to include examples with the generated code',
          default: this.includeExamples,
        },
      },
      required: ['requirements'],
    };
  }

  get outputSchema() {
    return {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'The generated code',
        },
        language: {
          type: 'string',
          description: 'The programming language of the generated code',
        },
        files: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              content: { type: 'string' },
            },
          },
          description: 'Generated files with their paths and contents',
        },
      },
      required: ['code', 'language', 'files'],
    };
  }

  protected validateInput(input: any): { isValid: boolean; error?: string } {
    const schema = z.object({
      requirements: z.string().min(10, 'Requirements must be at least 10 characters'),
      language: z.string().optional(),
      includeTests: z.boolean().optional(),
      includeDocs: z.boolean().optional(),
      includeExamples: z.boolean().optional(),
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
      requirements: string;
      language?: string;
      includeTests?: boolean;
      includeDocs?: boolean;
      includeExamples?: boolean;
    },
    _runManager?: CallbackManagerForToolRun
  ): Promise<ToolResult> {
    const {
      requirements,
      language = this.language,
      includeTests = this.includeTests,
      includeDocs = this.includeDocs,
      includeExamples = this.includeExamples,
    } = input;

    try {
      // This is a placeholder for the actual code generation logic
      // In a real implementation, this would call an AI model or code generation service
      const generatedCode = this.generateCode(requirements, {
        language,
        includeTests,
        includeDocs,
        includeExamples,
      });

      return {
        output: {
          code: generatedCode.main,
          language,
          files: [
            { path: 'main', content: generatedCode.main },
            ...(generatedCode.test ? [{ path: 'test', content: generatedCode.test }] : []),
            ...(generatedCode.docs ? [{ path: 'docs', content: generatedCode.docs }] : []),
            ...(generatedCode.example ? [{ path: 'example', content: generatedCode.example }] : []),
          ],
        },
        success: true,
      };
    } catch (error) {
      return {
        output: null,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate code',
      };
    }
  }

  private generateCode(
    requirements: string,
    options: {
      language: string;
      includeTests: boolean;
      includeDocs: boolean;
      includeExamples: boolean;
    }
  ): {
    main: string;
    test?: string;
    docs?: string;
    example?: string;
  } {
    // This is a simplified implementation
    // In a real implementation, this would call an AI model or code generation service
    const { language, includeTests, includeDocs, includeExamples } = options;
    
    const main = `// Generated ${language} code for: ${requirements}\n` +
      `// This is a placeholder implementation\n` +
      `// TODO: Implement the actual functionality based on the requirements`;
    
    const result: {
      main: string;
      test?: string;
      docs?: string;
      example?: string;
    } = { main };
    
    if (includeTests) {
      result.test = `// Test cases for the generated code\n` +
        `// TODO: Implement test cases`;
    }
    
    if (includeDocs) {
      result.docs = `# Documentation\n\n` +
        `## Generated Code\n\n` +
        `This code was generated based on the following requirements:\n` +
        `- ${requirements}\n\n` +
        `## Usage\n\n` +
        `TODO: Add usage instructions`;
    }
    
    if (includeExamples) {
      result.example = `// Example usage of the generated code\n` +
        `// TODO: Add example usage`;
    }
    
    return result;
  }
}

export default CodeGeneratorTool;