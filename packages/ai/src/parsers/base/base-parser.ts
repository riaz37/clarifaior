/**
 * Base parser class that provides common functionality for all parsers
 */
export abstract class BaseParser<TInput = any, TOutput = any> {
  /**
   * Parses the input and returns the parsed output
   * @param input The input to parse
   * @param context Optional context to use during parsing
   */
  abstract parse(input: TInput, context?: Record<string, any>): Promise<TOutput>;

  /**
   * Validates the input before parsing
   * @param input The input to validate
   * @throws {Error} If the input is invalid
   */
  protected validateInput(input: TInput): void {
    if (input === null || input === undefined) {
      throw new Error('Input cannot be null or undefined');
    }
  }

  /**
   * Validates the output after parsing
   * @param output The output to validate
   * @throws {Error} If the output is invalid
   */
  protected validateOutput(output: TOutput): void {
    if (output === null || output === undefined) {
      throw new Error('Parser output cannot be null or undefined');
    }
  }
}

export default BaseParser;