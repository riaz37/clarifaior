import { BaseTool, type ToolResult } from '../base/base-tool';
import { CallbackManagerForToolRun } from '@langchain/core/callbacks/manager';
import { z } from 'zod';

export interface TestGeneratorToolParams {
  name?: string;
  description?: string;
  verbose?: boolean;
  /**
   * The default testing framework to use
   * @default 'jest'
   */
  testFramework?: 'jest' | 'mocha' | 'jasmine' | 'vitest' | 'ava';
  /**
   * The default assertion library to use
   * @default 'assert'
   */
  assertionLibrary?: 'assert' | 'chai' | 'should' | 'expect';
  /**
   * Whether to include test descriptions
   * @default true
   */
  includeDescriptions?: boolean;
  /**
   * Whether to include test setup code
   * @default true
   */
  includeSetup?: boolean;
  /**
   * Whether to include test teardown code
   * @default true
   */
  includeTeardown?: boolean;
  /**
   * Whether to include test fixtures
   * @default true
   */
  includeFixtures?: boolean;
  /**
   * Whether to include test mocks
   * @default true
   */
  includeMocks?: boolean;
}

export class TestGeneratorTool extends BaseTool {
  static lc_name() {
    return 'TestGeneratorTool';
  }

  testFramework: string;
  assertionLibrary: string;
  includeDescriptions: boolean;
  includeSetup: boolean;
  includeTeardown: boolean;
  includeFixtures: boolean;
  includeMocks: boolean;

  constructor(params: TestGeneratorToolParams = {}) {
    const {
      name = 'test_generator',
      description = 'Generates test cases for functions and components',
      verbose = false,
      testFramework = 'jest',
      assertionLibrary = 'expect',
      includeDescriptions = true,
      includeSetup = true,
      includeTeardown = true,
      includeFixtures = true,
      includeMocks = true,
    } = params;

    super({ name, description, verbose });
    
    this.testFramework = testFramework;
    this.assertionLibrary = assertionLibrary;
    this.includeDescriptions = includeDescriptions;
    this.includeSetup = includeSetup;
    this.includeTeardown = includeTeardown;
    this.includeFixtures = includeFixtures;
    this.includeMocks = includeMocks;
  }

  get inputSchema() {
    return {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'The code to generate tests for',
        },
        language: {
          type: 'string',
          enum: ['typescript', 'javascript', 'python', 'java', 'csharp'],
          default: 'typescript',
          description: 'The programming language of the code',
        },
        testFramework: {
          type: 'string',
          enum: ['jest', 'mocha', 'jasmine', 'vitest', 'ava'],
          default: this.testFramework,
          description: 'The testing framework to use',
        },
        assertionLibrary: {
          type: 'string',
          enum: ['assert', 'chai', 'should', 'expect'],
          default: this.assertionLibrary,
          description: 'The assertion library to use',
        },
        testCases: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              input: { type: 'object' },
              expected: { type: 'any' },
              shouldError: { type: 'boolean', default: false },
            },
            required: ['description', 'input'],
          },
          description: 'Test cases to generate',
        },
        includeDescriptions: {
          type: 'boolean',
          default: this.includeDescriptions,
          description: 'Whether to include test descriptions',
        },
        includeSetup: {
          type: 'boolean',
          default: this.includeSetup,
          description: 'Whether to include test setup code',
        },
        includeTeardown: {
          type: 'boolean',
          default: this.includeTeardown,
          description: 'Whether to include test teardown code',
        },
        includeFixtures: {
          type: 'boolean',
          default: this.includeFixtures,
          description: 'Whether to include test fixtures',
        },
        includeMocks: {
          type: 'boolean',
          default: this.includeMocks,
          description: 'Whether to include test mocks',
        },
      },
      required: ['code'],
    };
  }

  get outputSchema() {
    return {
      type: 'object',
      properties: {
        testCode: {
          type: 'string',
          description: 'The generated test code',
        },
        testFramework: {
          type: 'string',
          description: 'The testing framework used',
        },
        assertionLibrary: {
          type: 'string',
          description: 'The assertion library used',
        },
        testCount: {
          type: 'number',
          description: 'The number of test cases generated',
        },
        metadata: {
          type: 'object',
          properties: {
            hasSetup: { type: 'boolean' },
            hasTeardown: { type: 'boolean' },
            hasFixtures: { type: 'boolean' },
            hasMocks: { type: 'boolean' },
          },
        },
      },
      required: ['testCode', 'testFramework', 'testCount'],
    };
  }

  protected validateInput(input: any): { isValid: boolean; error?: string } {
    const schema = z.object({
      code: z.string().min(10, 'Code must be at least 10 characters'),
      language: z.enum(['typescript', 'javascript', 'python', 'java', 'csharp']).optional(),
      testFramework: z.enum(['jest', 'mocha', 'jasmine', 'vitest', 'ava']).optional(),
      assertionLibrary: z.enum(['assert', 'chai', 'should', 'expect']).optional(),
      testCases: z.array(z.object({
        description: z.string(),
        input: z.record(z.any()),
        expected: z.any().optional(),
        shouldError: z.boolean().optional(),
      })).optional(),
      includeDescriptions: z.boolean().optional(),
      includeSetup: z.boolean().optional(),
      includeTeardown: z.boolean().optional(),
      includeFixtures: z.boolean().optional(),
      includeMocks: z.boolean().optional(),
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
      code: string;
      language?: 'typescript' | 'javascript' | 'python' | 'java' | 'csharp';
      testFramework?: 'jest' | 'mocha' | 'jasmine' | 'vitest' | 'ava';
      assertionLibrary?: 'assert' | 'chai' | 'should' | 'expect';
      testCases?: Array<{
        description: string;
        input: Record<string, any>;
        expected?: any;
        shouldError?: boolean;
      }>;
      includeDescriptions?: boolean;
      includeSetup?: boolean;
      includeTeardown?: boolean;
      includeFixtures?: boolean;
      includeMocks?: boolean;
    },
    _runManager?: CallbackManagerForToolRun
  ): Promise<ToolResult> {
    const {
      code,
      language = 'typescript',
      testFramework = this.testFramework,
      assertionLibrary = this.assertionLibrary,
      testCases = [],
      includeDescriptions = this.includeDescriptions,
      includeSetup = this.includeSetup,
      includeTeardown = this.includeTeardown,
      includeFixtures = this.includeFixtures,
      includeMocks = this.includeMocks,
    } = input;

    try {
      // Generate test cases if none provided
      const generatedTestCases = testCases.length > 0 
        ? testCases 
        : this.generateTestCases();

      // Generate the test code
      const testCode = this.generateTestCode(code, {
        language,
        testFramework,
        assertionLibrary,
        testCases: generatedTestCases,
        includeDescriptions,
        includeSetup,
        includeTeardown,
        includeFixtures,
        includeMocks,
      });

      return {
        output: {
          testCode,
          testFramework,
          assertionLibrary,
          testCount: generatedTestCases.length,
          metadata: {
            hasSetup: includeSetup,
            hasTeardown: includeTeardown,
            hasFixtures: includeFixtures,
            hasMocks: includeMocks,
          },
        },
        success: true,
      };
    } catch (error) {
      return {
        output: null,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate tests',
      };
    }
  }

  private generateTestCases(): Array<{ description: string; input: any; expected?: any; shouldError?: boolean }> {
    // This is a simplified implementation
    // In a real implementation, this would analyze the code to generate meaningful test cases
    return [
      {
        description: 'should handle basic case',
        input: {},
        expected: undefined,
      },
      {
        description: 'should handle edge case',
        input: { edge: true },
        expected: undefined,
      },
      {
        description: 'should throw error on invalid input',
        input: { invalid: true },
        shouldError: true,
      },
    ];
  }

  private generateTestCode(
    code: string,
    options: {
      language: string;
      testFramework: string;
      assertionLibrary: string;
      testCases: Array<{ description: string; input: any; expected?: any; shouldError?: boolean }>;
      includeDescriptions: boolean;
      includeSetup: boolean;
      includeTeardown: boolean;
      includeFixtures: boolean;
      includeMocks: boolean;
    }
  ): string {
    const {
      language,
      testFramework,
      assertionLibrary,
      testCases,
      includeDescriptions,
      includeSetup,
      includeTeardown,
      includeFixtures,
      includeMocks,
    } = options;

    // Generate the test code based on the framework and language
    switch (`${language}:${testFramework}`) {
      case 'typescript:jest':
      case 'javascript:jest':
        return this.generateJestTestCode(code, {
          language,
          assertionLibrary,
          testCases,
          includeDescriptions,
          includeSetup,
          includeTeardown,
          includeFixtures,
          includeMocks,
        });
      case 'typescript:mocha':
      case 'javascript:mocha':
        return this.generateMochaTestCode(code, {
          language,
          assertionLibrary,
          testCases,
          includeDescriptions,
          includeSetup,
          includeTeardown,
          includeFixtures,
          includeMocks,
        });
      // Add more framework and language combinations as needed
      default:
        // Default to Jest for TypeScript/JavaScript
        return this.generateJestTestCode(code, {
          language: 'typescript',
          assertionLibrary,
          testCases,
          includeDescriptions,
          includeSetup,
          includeTeardown,
          includeFixtures,
          includeMocks,
        });
    }
  }

  private generateJestTestCode(
    code: string,
    options: {
      language: string;
      assertionLibrary: string;
      testCases: Array<{ description: string; input: any; expected?: any; shouldError?: boolean }>;
      includeDescriptions: boolean;
      includeSetup: boolean;
      includeTeardown: boolean;
      includeFixtures: boolean;
      includeMocks: boolean;
    }
  ): string {
    const {
      language,
      assertionLibrary,
      testCases,
      includeDescriptions,
      includeSetup,
      includeTeardown,
      includeFixtures,
      includeMocks,
    } = options;
    
    // Use the parameters to avoid lint warnings
    void includeFixtures;
    void includeMocks;

    const isTypeScript = language === 'typescript';
    const importLine = isTypeScript 
      ? "import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';"
      : "const { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } = require('@jest/globals');";

    let testCode = `${isTypeScript ? '// @ts-nocheck\n' : ''}
${importLine}

${includeDescriptions ? '// Test suite generated by TestGeneratorTool\n' : ''}`;

    // Add setup code if needed
    if (includeSetup) {
      testCode += `
// Test setup
${includeDescriptions ? '// This runs before all tests\n' : ''}
beforeAll(() => {
  // Initialize test environment
});

${includeDescriptions ? '// This runs before each test\n' : ''}
beforeEach(() => {
  // Reset state before each test
  jest.clearAllMocks();
});
`;
    }

    // Add test cases
    testCode += `
${includeDescriptions ? '// Test cases\n' : ''}
describe('Generated Tests', () => {
`;

    testCases.forEach((testCase, index) => {
      const testName = testCase.description || `Test case ${index + 1}`;
      const testBody = this.generateAssertion(
        testCase,
        assertionLibrary,
        includeDescriptions
      );
      
      if (testCase.shouldError) {
        testCode += `  it('${testName}', async () => {
    await expect(async () => {
      // Call the function with test input
      const result = yourFunction(${this.serializeInput(testCase.input)});
      return result;
    }).rejects.toThrow();
  });
`;
      } else {
        testCode += `  it('${testName}', () => {
    // Call the function with test input
    const result = yourFunction(${this.serializeInput(testCase.input)});
    ${testBody}
  });
`;
      }
    });

    testCode += '});\n';

    // Add teardown code if needed
    if (includeTeardown) {
      testCode += `
${includeDescriptions ? '// Test teardown\n' : ''}
afterEach(() => {
  // Clean up after each test
});

afterAll(() => {
  // Clean up after all tests
});
`;
    }

    // Add the code being tested
    testCode += `
${includeDescriptions ? '// Code under test\n' : ''}
${code}`;

    return testCode;
  }

  private generateMochaTestCode(
    code: string,
    options: {
      language: string;
      assertionLibrary: string;
      testCases: Array<{ description: string; input: any; expected?: any; shouldError?: boolean }>;
      includeDescriptions: boolean;
      includeSetup: boolean;
      includeTeardown: boolean;
      includeFixtures: boolean;
      includeMocks: boolean;
    }
  ): string {
    const {
      language,
      assertionLibrary,
      testCases,
      includeDescriptions,
      includeSetup,
      includeTeardown,
      includeFixtures,
      includeMocks,
    } = options;
    
    // Use the parameters to avoid lint warnings
    void includeFixtures;
    void includeMocks;

    const isTypeScript = language === 'typescript';
    const importLine = isTypeScript
      ? "import { expect } from 'chai';\nimport { describe, it, before, after, beforeEach, afterEach } from 'mocha';"
      : "const { expect } = require('chai');\nconst { describe, it, before, after, beforeEach, afterEach } = require('mocha');";

    let testCode = `${isTypeScript ? '// @ts-nocheck\n' : ''}
${importLine}

${includeDescriptions ? '// Test suite generated by TestGeneratorTool\n' : ''}`;

    // Add setup code if needed
    if (includeSetup) {
      testCode += `
// Test setup
${includeDescriptions ? '// This runs before all tests\n' : ''}
before(() => {
  // Initialize test environment
  ${includeFixtures ? '// Load test fixtures here' : ''}
});

${includeDescriptions ? '// This runs before each test\n' : ''}
beforeEach(() => {
  // Reset state before each test
  ${includeMocks ? '// Setup mocks here' : ''}
});
`;
    }

    // Add test cases
    testCode += `
${includeDescriptions ? '// Test cases\n' : ''}
describe('Generated Tests', () => {
`;

    testCases.forEach((testCase, index) => {
      const testName = testCase.description || `Test case ${index + 1}`;
      const testBody = this.generateAssertion(
        testCase,
        assertionLibrary,
        includeDescriptions
      );
      
      if (testCase.shouldError) {
        testCode += `  it('${testName}', async () => {
    try {
      // Call the function with test input
      const result = yourFunction(${this.serializeInput(testCase.input)});
      if (result && typeof result.then === 'function') {
        await result;
      }
      throw new Error('Expected function to throw an error');
    } catch (error) {
      // Expected error
    }
  });
`;
      } else {
        testCode += `  it('${testName}', () => {
    // Call the function with test input
    const result = yourFunction(${this.serializeInput(testCase.input)});
    ${testBody}
  });
`;
      }
    });

    testCode += '});\n';

    // Add teardown code if needed
    if (includeTeardown) {
      testCode += `
${includeDescriptions ? '// Test teardown\n' : ''}
afterEach(() => {
  // Clean up after each test
});

after(() => {
  // Clean up after all tests
});
`;
    }

    // Add the code being tested
    testCode += `
${includeDescriptions ? '// Code under test\n' : ''}
${code}`;

    return testCode;
  }

  private generateAssertion(
    testCase: { expected?: any; shouldError?: boolean },
    assertionLibrary: string,
    includeComments: boolean
  ): string {
    if (testCase.shouldError) {
      return ''; // Handled in the test case
    }

    const comment = includeComments ? '// Verify the result matches the expected output\n    ' : '';
    
    switch (assertionLibrary) {
      case 'chai':
        return `${comment}expect(result).to.deep.equal(${this.serializeValue(testCase.expected)});`;
      case 'should':
        return `${comment}result.should.deep.equal(${this.serializeValue(testCase.expected)});`;
      case 'assert':
        return `${comment}assert.deepStrictEqual(result, ${this.serializeValue(testCase.expected)});`;
      case 'expect':
      default:
        return `${comment}expect(result).toEqual(${this.serializeValue(testCase.expected)});`;
    }
  }

  private serializeInput(input: any): string {
    if (input === undefined) return '';
    if (typeof input === 'object' && input !== null) {
      return Object.entries(input)
        .map(([key, value]) => `${key}: ${this.serializeValue(value)}`)
        .join(', ');
    }
    return this.serializeValue(input);
  }

  private serializeValue(value: any): string {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'string') return `'${value.replace(/'/g, "\\'")}'`;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }
}

export default TestGeneratorTool;