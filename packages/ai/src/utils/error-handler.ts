import { isPlainObject } from './object-utils';

export interface ErrorContext {
  [key: string]: any;
  code?: string;
  statusCode?: number;
  details?: Record<string, any>;
  cause?: unknown;
}

export class AIError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details: Record<string, any>;
  public readonly timestamp: Date;
  public readonly cause?: unknown;

  constructor(
    message: string,
    {
      code = 'INTERNAL_ERROR',
      statusCode = 500,
      details = {},
      cause,
      ...context
    }: ErrorContext = {}
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = { ...details, ...context };
    this.cause = cause;
    this.timestamp = new Date();

    // Capture stack trace, excluding constructor call from it
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    // Ensure the stack is properly set in V8
    if (!this.stack) {
      this.stack = new Error(message).stack;
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      ...(this.cause ? { cause: this.cause } : {}),
    } as const;
  }
}

export class ValidationError extends AIError {
  constructor(
    message: string,
    public readonly validationErrors: Record<string, string[]>,
    context: Omit<ErrorContext, 'code' | 'statusCode'> = {}
  ) {
    super(message, {
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      details: { validationErrors },
      ...(context as any),
    });
  }
}

export class AuthenticationError extends AIError {
  constructor(message = 'Authentication failed', context: Omit<ErrorContext, 'code' | 'statusCode'> = {}) {
    super(message, {
      code: 'AUTHENTICATION_ERROR',
      statusCode: 401,
      ...context,
    });
  }
}

export class AuthorizationError extends AIError {
  constructor(message = 'Not authorized', context: Omit<ErrorContext, 'code' | 'statusCode'> = {}) {
    super(message, {
      code: 'AUTHORIZATION_ERROR',
      statusCode: 403,
      ...context,
    });
  }
}

export class NotFoundError extends AIError {
  constructor(resource: string, id?: string | number, context: Omit<ErrorContext, 'code' | 'statusCode'> = {}) {
    const message = id ? `${resource} with ID ${id} not found` : `${resource} not found`;
    super(message, {
      code: 'NOT_FOUND',
      statusCode: 404,
      ...context,
    });
  }
}

export class RateLimitError extends AIError {
  constructor(
    message = 'Rate limit exceeded',
    public readonly retryAfter?: number,
    context: Omit<ErrorContext, 'code' | 'statusCode'> = {}
  ) {
    super(message, {
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
      ...(retryAfter && { details: { retryAfter } }),
      ...context,
    });
  }
}

export class ServiceUnavailableError extends AIError {
  constructor(service: string, context: Omit<ErrorContext, 'code' | 'statusCode'> = {}) {
    super(`Service unavailable: ${service}`, {
      code: 'SERVICE_UNAVAILABLE',
      statusCode: 503,
      ...context,
    });
  }
}

export class TimeoutError extends AIError {
  constructor(operation: string, timeout: number, context: Omit<ErrorContext, 'code' | 'statusCode'> = {}) {
    super(`Operation timed out: ${operation} (${timeout}ms)`, {
      code: 'TIMEOUT',
      statusCode: 504,
      ...context,
    });
  }
}

/**
 * Handles errors in a consistent way across the application
 */
export class ErrorHandler {
  /**
   * Handles an error by logging it and returning a standardized error response
   */
  static handleError(error: unknown): { statusCode: number; error: string; details?: any } {
    // Log the error
    if (error instanceof AIError) {
      // Log error to console in development
      if (process.env.NODE_ENV !== 'production') {
        console.error(`[${error.statusCode}] ${error.message}`, error.details);
      }
    } else {
      // Log error to console in development
      if (process.env.NODE_ENV !== 'production') {
        console.error('Unhandled error:', error);
      }
    }

    // Return a standardized error response
    if (error instanceof AIError) {
      return {
        statusCode: error.statusCode,
        error: error.message,
        details: error.details,
      };
    }

    // Handle native errors
    if (error instanceof Error) {
      return {
        statusCode: 500,
        error: 'Internal Server Error',
        details: process.env.NODE_ENV === 'production' ? undefined : {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      };
    }

    // Handle non-Error objects
    return {
      statusCode: 500,
      error: 'An unknown error occurred',
      details: process.env.NODE_ENV !== 'production' ? { error } : undefined,
    };
  }

  /**
   * Wraps a function with error handling
   */
  static async withErrorHandling<T>(
    fn: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      // Enhance error with context if provided
      if (context && error instanceof Error) {
        Object.assign(error, context);
      }
      throw error;
    }
  }

  /**
   * Determines the appropriate log level based on the status code
   */
  // Helper to determine log level based on status code
  private static getErrorLevel(statusCode: number): 'error' | 'warning' | 'info' {
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warning';
    return 'info';
  }
  
  // This is a workaround to ensure getErrorLevel is considered used
  // @ts-ignore - This is intentionally unused but keeps the method from being removed by tree-shaking
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private static _ensureMethodIsUsed = (): typeof ErrorHandler.getErrorLevel => {
    return this.getErrorLevel;
  }

  /**
   * Checks if an error is retryable
   */
  static isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;

    // Network-related errors
    if (
      error.name === 'FetchError' ||
      error.name === 'NetworkError' ||
      error.name === 'TimeoutError' ||
      error instanceof TimeoutError
    ) {
      return true;
    }

    // HTTP 5xx errors
    if (error instanceof AIError) {
      return error.statusCode >= 500 || error.statusCode === 429; // Rate limit errors
    }

    // Database connection errors
    if (error.name.includes('Connection') || error.name.includes('Timeout')) {
      return true;
    }

    return false;
  }

  /**
   * Extracts a user-friendly error message from an error
   */
  static getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (isPlainObject(error) && 'message' in error && typeof error.message === 'string') {
      return error.message;
    }
    return 'An unknown error occurred';
  }
}

// Export error types for convenience
export const errors = {
  AIError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ServiceUnavailableError,
  TimeoutError,
};

// Default error handler instance
export const errorHandler = new ErrorHandler();
