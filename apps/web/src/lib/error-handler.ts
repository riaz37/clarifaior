import { ApiError } from './api-client';

// Error types
export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  SERVER = 'SERVER',
  RATE_LIMIT = 'RATE_LIMIT',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN',
}

export interface AppError {
  type: ErrorType;
  message: string;
  code?: string;
  details?: any;
  timestamp: string;
  requestId?: string;
  retryable: boolean;
}

// Error classification
export class ErrorHandler {
  // Convert API error to app error
  static fromApiError(apiError: ApiError): AppError {
    const timestamp = new Date().toISOString();
    
    // Classify error type based on code
    let type = ErrorType.UNKNOWN;
    let retryable = false;
    
    if (apiError.code) {
      if (apiError.code === 'NETWORK_ERROR') {
        type = ErrorType.NETWORK;
        retryable = true;
      } else if (apiError.code === 'TIMEOUT_ERROR') {
        type = ErrorType.TIMEOUT;
        retryable = true;
      } else if (apiError.code.startsWith('HTTP_401')) {
        type = ErrorType.AUTHENTICATION;
        retryable = false;
      } else if (apiError.code.startsWith('HTTP_403')) {
        type = ErrorType.AUTHORIZATION;
        retryable = false;
      } else if (apiError.code.startsWith('HTTP_422') || apiError.code.startsWith('HTTP_400')) {
        type = ErrorType.VALIDATION;
        retryable = false;
      } else if (apiError.code.startsWith('HTTP_429')) {
        type = ErrorType.RATE_LIMIT;
        retryable = true;
      } else if (apiError.code.startsWith('HTTP_5')) {
        type = ErrorType.SERVER;
        retryable = true;
      }
    }
    
    return {
      type,
      message: apiError.message,
      code: apiError.code,
      details: apiError.details,
      timestamp,
      requestId: apiError.requestId,
      retryable,
    };
  }
  
  // Create custom app error
  static create(
    type: ErrorType,
    message: string,
    options?: {
      code?: string;
      details?: any;
      retryable?: boolean;
    }
  ): AppError {
    return {
      type,
      message,
      code: options?.code,
      details: options?.details,
      timestamp: new Date().toISOString(),
      retryable: options?.retryable ?? false,
    };
  }
  
  // Get user-friendly error message
  static getUserMessage(error: AppError): string {
    switch (error.type) {
      case ErrorType.NETWORK:
        return 'Unable to connect to the server. Please check your internet connection and try again.';
      
      case ErrorType.AUTHENTICATION:
        return 'Your session has expired. Please log in again.';
      
      case ErrorType.AUTHORIZATION:
        return 'You don\'t have permission to perform this action.';
      
      case ErrorType.VALIDATION:
        return error.message || 'Please check your input and try again.';
      
      case ErrorType.RATE_LIMIT:
        return 'Too many requests. Please wait a moment and try again.';
      
      case ErrorType.TIMEOUT:
        return 'The request took too long. Please try again.';
      
      case ErrorType.SERVER:
        return 'A server error occurred. Please try again later.';
      
      default:
        return error.message || 'An unexpected error occurred. Please try again.';
    }
  }
  
  // Get error severity level
  static getSeverity(error: AppError): 'low' | 'medium' | 'high' | 'critical' {
    switch (error.type) {
      case ErrorType.VALIDATION:
        return 'low';
      
      case ErrorType.RATE_LIMIT:
      case ErrorType.TIMEOUT:
        return 'medium';
      
      case ErrorType.AUTHENTICATION:
      case ErrorType.AUTHORIZATION:
        return 'high';
      
      case ErrorType.NETWORK:
      case ErrorType.SERVER:
        return 'critical';
      
      default:
        return 'medium';
    }
  }
  
  // Log error (could integrate with external logging service)
  static log(error: AppError, context?: any): void {
    const logData = {
      ...error,
      context,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    };
    
    const severity = this.getSeverity(error);
    
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 ${severity.toUpperCase()} Error`);
      console.error('Error:', error.message);
      console.error('Type:', error.type);
      console.error('Code:', error.code);
      console.error('Details:', error.details);
      console.error('Context:', context);
      console.groupEnd();
    }
    
    // In production, send to logging service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrate with logging service (e.g., Sentry, LogRocket)
      // Example: Sentry.captureException(error, { extra: logData });
    }
  }
  
  // Handle error with retry logic
  static async handleWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: AppError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const appError = error instanceof Error 
          ? this.create(ErrorType.UNKNOWN, error.message)
          : this.fromApiError(error as ApiError);
        
        lastError = appError;
        
        // Don't retry if error is not retryable
        if (!appError.retryable) {
          throw appError;
        }
        
        // Don't retry on last attempt
        if (attempt === maxRetries) {
          throw appError;
        }
        
        // Wait before retry with exponential backoff
        const waitTime = delay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        this.log(appError, { attempt, maxRetries, nextRetryIn: waitTime });
      }
    }
    
    throw lastError!;
  }
}

// Error boundary helper for React components
export const withErrorBoundary = <T extends Record<string, any>>(
  Component: React.ComponentType<T>
) => {
  return class ErrorBoundaryWrapper extends React.Component<T, { hasError: boolean; error?: AppError }> {
    constructor(props: T) {
      super(props);
      this.state = { hasError: false };
    }
    
    static getDerivedStateFromError(error: Error): { hasError: boolean; error: AppError } {
      const appError = ErrorHandler.create(
        ErrorType.UNKNOWN,
        error.message,
        { details: error.stack }
      );
      
      ErrorHandler.log(appError, { component: Component.name });
      
      return {
        hasError: true,
        error: appError,
      };
    }
    
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      const appError = ErrorHandler.create(
        ErrorType.UNKNOWN,
        error.message,
        { details: { stack: error.stack, errorInfo } }
      );
      
      ErrorHandler.log(appError, { component: Component.name });
    }
    
    render() {
      if (this.state.hasError) {
        return (
          <div className="p-6 text-center">
            <div className="text-red-400 mb-2">Something went wrong</div>
            <div className="text-gray-400 text-sm">
              {ErrorHandler.getUserMessage(this.state.error!)}
            </div>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        );
      }
      
      return <Component {...this.props} />;
    }
  };
};

// Hook for error handling in components
export const useErrorHandler = () => {
  const handleError = (error: any, context?: any) => {
    const appError = error instanceof Error 
      ? ErrorHandler.create(ErrorType.UNKNOWN, error.message)
      : ErrorHandler.fromApiError(error as ApiError);
    
    ErrorHandler.log(appError, context);
    
    // Could show toast notification here
    // toast.error(ErrorHandler.getUserMessage(appError));
    
    return appError;
  };
  
  const handleAsyncError = async <T>(
    operation: () => Promise<T>,
    context?: any
  ): Promise<T | null> => {
    try {
      return await operation();
    } catch (error) {
      handleError(error, context);
      return null;
    }
  };
  
  return {
    handleError,
    handleAsyncError,
    handleWithRetry: ErrorHandler.handleWithRetry,
  };
};

export default ErrorHandler;
