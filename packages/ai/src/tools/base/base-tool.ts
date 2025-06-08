import { ToolParams } from '@langchain/core/tools';
import { CallbackManagerForToolRun } from '@langchain/core/callbacks/manager';

export type ToolResult = {
  output: any;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
};

export interface BaseToolParams extends ToolParams {
  name: string;
  description: string;
  returnDirect?: boolean;
  verbose?: boolean;
}

export abstract class BaseTool {
  name: string;
  description: string;
  returnDirect: boolean;
  verbose: boolean;

  constructor({
    name,
    description,
    returnDirect = false,
    verbose = false,
  }: BaseToolParams) {
    this.name = name;
    this.description = description;
    this.returnDirect = returnDirect;
    this.verbose = verbose;
  }

  /**
   * The main method that executes the tool's logic
   * @param input The input parameters for the tool
   * @param runManager Optional callback manager for tracking the execution
   */
  abstract _call(
    input: any,
    runManager?: CallbackManagerForToolRun
  ): Promise<ToolResult>;

  /**
   * Validates the input parameters before execution
   * @param input The input parameters to validate
   */
  protected validateInput(input: any): { isValid: boolean; error?: string } {
    // Default implementation accepts any input
    return { isValid: true };
  }

  /**
   * Executes the tool with input validation and error handling
   * @param input The input parameters for the tool
   * @param runManager Optional callback manager for tracking the execution
   */
  async call(
    input: any,
    runManager?: CallbackManagerForToolRun
  ): Promise<ToolResult> {
    try {
      // Validate input
      const { isValid, error } = this.validateInput(input);
      if (!isValid) {
        return {
          output: null,
          success: false,
          error: error || 'Invalid input',
        };
      }

      // Execute the tool
      const result = await this._call(input, runManager);
      
      if (this.verbose) {
        console.log(`[${this.name}] Tool execution result:`, result);
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (this.verbose) {
        console.error(`[${this.name}] Error executing tool:`, error);
      }
      return {
        output: null,
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Returns a JSON schema representation of the tool's input parameters
   */
  get inputSchema(): Record<string, any> | undefined {
    return undefined;
  }

  /**
   * Returns a JSON schema representation of the tool's output
   */
  get outputSchema(): Record<string, any> | undefined {
    return undefined;
  }

  /**
   * Returns a JSON schema representation of the tool
   */
  get schema(): Record<string, any> {
    return {
      name: this.name,
      description: this.description,
      input_schema: this.inputSchema,
      output_schema: this.outputSchema,
    };
  }
}

export default BaseTool;