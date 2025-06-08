import { z, ZodError, ZodType, ZodSchema, ZodObject, ZodRawShape } from 'zod'; // Removed unused ZodTypeDef
import { ValidationError } from './error-handler';

export type SchemaValidationOptions<T> = {
  /**
   * Whether to strip unknown fields from the validated object
   * @default true
   */
  stripUnknown?: boolean;
  /**
   * Whether to throw an error if validation fails
   * @default true
   */
  abortEarly?: boolean;
  /**
   * Custom error message to use when validation fails
   */
  errorMessage?: string | ((error: ZodError) => string);
  /**
   * Context to pass to the schema for validation
   */
  context?: Partial<T>;
};

/**
 * SchemaValidator provides a type-safe way to validate and parse data against schemas
 */
export class SchemaValidator {
  /**
   * Validates data against a schema and returns the parsed data
   * @throws {ValidationError} If validation fails
   */
  static validate<T>(
    schema: ZodSchema<T>,
    data: unknown,
    options: SchemaValidationOptions<T> = {}
  ): T {
    const {
      errorMessage,
      context,
    } = options;

    try {
      let result = schema.safeParse(data, { 
        errorMap: this.enhanceErrorMap(),
        ...(context && { context })
      });

      if (result.success) {
        return result.data;
      }

      // Format validation errors
      const formattedErrors = this.formatZodErrors(result.error);
      
      // Throw validation error with formatted errors
      throw new ValidationError(
        typeof errorMessage === 'function' 
          ? errorMessage(result.error) 
          : errorMessage || 'Validation failed',
        formattedErrors
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      
      // Re-throw any unexpected errors
      throw new ValidationError(
        'An unexpected error occurred during validation',
        { _global: ['An unexpected error occurred'] },
        { cause: error }
      );
    }
  }

  /**
   * Validates data against a schema and returns a tuple with the result
   * @returns [data, error] - If validation succeeds, data will be the parsed data and error will be undefined
   *                        - If validation fails, data will be undefined and error will be a ValidationError
   */
  static safeValidate<T>(
    schema: ZodSchema<T>,
    data: unknown,
    options: Omit<SchemaValidationOptions<T>, 'abortEarly'> = {}
  ): [T, undefined] | [undefined, ValidationError] {
    try {
      const result = this.validate(schema, data, { ...options, abortEarly: false });
      return [result, undefined];
    } catch (error) {
      if (error instanceof ValidationError) {
        return [undefined, error];
      }
      // This should never happen since validate() wraps all errors in ValidationError
      const validationError = new ValidationError(
        'An unexpected error occurred during validation',
        { _global: ['An unexpected error occurred'] },
        { cause: error }
      );
      return [undefined, validationError];
    }
  }

  /**
   * Creates a type-safe validator function for a schema
   */
  static createValidator<T>(
    schema: ZodSchema<T>,
    options: SchemaValidationOptions<T> = {}
  ) {
    return (data: unknown) => this.validate(schema, data, options);
  }

  /**
   * Creates a type-safe validator function that returns a tuple with the result
   */
  static createSafeValidator<T>(
    schema: ZodSchema<T>,
    options: Omit<SchemaValidationOptions<T>, 'abortEarly'> = {}
  ) {
    return (data: unknown) => this.safeValidate(schema, data, options);
  }

  /**
   * Formats Zod errors into a more structured format
   */
  private static formatZodErrors(error: ZodError): Record<string, string[]> {
    const formattedErrors: Record<string, string[]> = {};

    for (const issue of error.errors) {
      const path = issue.path.join('.');
      const message = issue.message;

      if (path in formattedErrors) {
        formattedErrors[path].push(message);
      } else {
        formattedErrors[path] = [message];
      }
    }

    return formattedErrors;
  }

  /**
   * Enhances the default Zod error messages
   */
  private static enhanceErrorMap() {
    return (issue: z.ZodIssueOptionalMessage, ctx: z.ErrorMapCtx) => {
      let message = ctx.defaultError;

      switch (issue.code) {
        case z.ZodIssueCode.invalid_type:
          if (issue.received === 'undefined') {
            message = 'Required';
          } else {
            message = `Expected ${issue.expected}, received ${issue.received}`;
          }
          break;
        case z.ZodIssueCode.too_small:
          if (issue.type === 'array') {
            message = `Should have at least ${issue.minimum} item${issue.minimum === 1 ? '' : 's'}`;
          } else if (issue.type === 'string') {
            message = `Should be at least ${issue.minimum} character${issue.minimum === 1 ? '' : 's'}`;
          } else if (issue.type === 'number') {
            message = `Should be greater than or equal to ${issue.minimum}`;
          } else if (issue.type === 'date') {
            message = `Date should be after ${new Date(Number(issue.minimum)).toLocaleDateString()}`;
          }
          break;
        case z.ZodIssueCode.too_big:
          if (issue.type === 'array') {
            message = `Should have at most ${issue.maximum} item${issue.maximum === 1 ? '' : 's'}`;
          } else if (issue.type === 'string') {
            message = `Should be at most ${issue.maximum} character${issue.maximum === 1 ? '' : 's'}`;
          } else if (issue.type === 'number') {
            message = `Should be less than or equal to ${issue.maximum}`;
          } else if (issue.type === 'date') {
            message = `Date should be before ${new Date(Number(issue.maximum)).toLocaleDateString()}`;
          }
          break;
        case z.ZodIssueCode.invalid_string:
          if (issue.validation === 'email') {
            message = 'Invalid email address';
          } else if (issue.validation === 'url') {
            message = 'Invalid URL';
          } else if (issue.validation === 'uuid') {
            message = 'Invalid UUID';
          } else if (issue.validation === 'regex') {
            message = 'Invalid format';
          }
          break;
        case z.ZodIssueCode.invalid_date:
          message = 'Invalid date';
          break;
      }

      return { message };
    };
  }
}

/**
 * Schema builder with common validation patterns
 */
export const schema = {
  /**
   * Creates a string schema with common validations
   */
  string: (fieldName?: string) => {
    let schema = z.string();
    if (fieldName) {
      schema = schema.min(1, `${fieldName} is required`);
    }
    return schema;
  },
  
  /**
   * Creates an email schema
   */
  email: (fieldName = 'Email') => 
    schema.string(fieldName).email('Invalid email address'),
  
  /**
   * Creates a password schema with complexity requirements
   */
  password: (options: {
    minLength?: number;
    requireUppercase?: boolean;
    requireNumbers?: boolean;
    requireSpecialChars?: boolean;
  } = {}) => {
    const {
      minLength = 8,
      requireUppercase = true,
      requireNumbers = true,
      requireSpecialChars = true,
    } = options;
    
    let passwordSchema = z.string().min(minLength, `Password must be at least ${minLength} characters`);
    
    if (requireUppercase) {
      passwordSchema = passwordSchema.regex(
        /[A-Z]/,
        'Password must contain at least one uppercase letter'
      );
    }
    
    if (requireNumbers) {
      passwordSchema = passwordSchema.regex(
        /[0-9]/,
        'Password must contain at least one number'
      );
    }
    
    if (requireSpecialChars) {
      passwordSchema = passwordSchema.regex(
        /[!@#$%^&*(),.?":{}|<>]/,
        'Password must contain at least one special character'
      );
    }
    
    return passwordSchema;
  },
  
  /**
   * Creates a URL schema
   */
  url: () => z.string().url('Invalid URL'),
  
  /**
   * Creates a number schema with range validation
   */
  number: (options: { min?: number; max?: number } = {}) => {
    let numSchema = z.number();
    
    if (options.min !== undefined) {
      numSchema = numSchema.min(options.min, `Must be at least ${options.min}`);
    }
    
    if (options.max !== undefined) {
      numSchema = numSchema.max(options.max, `Must be at most ${options.max}`);
    }
    
    return numSchema;
  },
  
  /**
   * Creates a date schema
   */
  date: (options: { min?: Date; max?: Date } = {}) => {
    let dateSchema = z.date();
    
    if (options.min) {
      dateSchema = dateSchema.min(options.min, `Date must be after ${options.min.toLocaleDateString()}`);
    }
    
    if (options.max) {
      dateSchema = dateSchema.max(options.max, `Date must be before ${options.max.toLocaleDateString()}`);
    }
    
    return dateSchema;
  },
  
  /**
   * Creates an array schema with length constraints
   */
  array: <T extends ZodType>(
    itemSchema: T,
    options: { minLength?: number; maxLength?: number } = {}
  ) => {
    let arraySchema = z.array(itemSchema);
    
    if (options.minLength !== undefined) {
      arraySchema = arraySchema.min(
        options.minLength,
        `Must have at least ${options.minLength} items`
      );
    }
    
    if (options.maxLength !== undefined) {
      arraySchema = arraySchema.max(
        options.maxLength,
        `Must have at most ${options.maxLength} items`
      );
    }
    
    return arraySchema;
  },
  
  /**
   * Creates an object schema with partial fields
   */
  partial: <T extends ZodRawShape>(schema: ZodObject<T>) => schema.partial(),
  
  /**
   * Creates a schema that allows null or undefined values
   */
  nullable: <T extends ZodType>(schema: T) => schema.nullable(),
  
  /**
   * Creates a schema that allows optional values
   */
  optional: <T extends ZodType>(schema: T) => schema.optional(),
};

// Default validator instance
export const validator = new SchemaValidator();

// Re-export Zod for convenience
export { z };