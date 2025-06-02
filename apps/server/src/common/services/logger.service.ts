import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';

export interface LogContext {
  userId?: number;
  workspaceId?: number;
  agentId?: number;
  executionId?: number;
  requestId?: string;
  [key: string]: any;
}

@Injectable()
export class LoggerService implements NestLoggerService {
  private context: string = 'Application';

  setContext(context: string) {
    this.context = context;
  }

  log(message: string, context?: LogContext) {
    this.printMessage('LOG', message, context);
  }

  error(message: string, trace?: string, context?: LogContext) {
    this.printMessage('ERROR', message, context, trace);
  }

  warn(message: string, context?: LogContext) {
    this.printMessage('WARN', message, context);
  }

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      this.printMessage('DEBUG', message, context);
    }
  }

  verbose(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      this.printMessage('VERBOSE', message, context);
    }
  }

  /**
   * Log agent execution events
   */
  logExecution(
    level: 'info' | 'error' | 'warn',
    message: string,
    executionId: number,
    nodeId?: string,
    additionalContext?: any,
  ) {
    const context: LogContext = {
      executionId,
      nodeId,
      ...additionalContext,
    };

    switch (level) {
      case 'info':
        this.log(message, context);
        break;
      case 'error':
        this.error(message, undefined, context);
        break;
      case 'warn':
        this.warn(message, context);
        break;
    }
  }

  /**
   * Log API requests
   */
  logRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    userId?: number,
    workspaceId?: number,
  ) {
    const message = `${method} ${url} ${statusCode} - ${duration}ms`;
    const context: LogContext = {
      userId,
      workspaceId,
      method,
      url,
      statusCode,
      duration,
    };

    if (statusCode >= 400) {
      this.error(message, undefined, context);
    } else {
      this.log(message, context);
    }
  }

  /**
   * Log security events
   */
  logSecurity(event: string, userId?: number, details?: any) {
    const context: LogContext = {
      userId,
      securityEvent: event,
      ...details,
    };

    this.warn(`Security Event: ${event}`, context);
  }

  private printMessage(
    level: string,
    message: string,
    context?: LogContext,
    trace?: string,
  ) {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` [${JSON.stringify(context)}]` : '';
    const traceStr = trace ? `\n${trace}` : '';

    console.log(
      `[${timestamp}] [${level}] [${this.context}] ${message}${contextStr}${traceStr}`,
    );

    // In production, you might want to send logs to external service
    // like CloudWatch, Datadog, or ELK stack
    if (process.env.NODE_ENV === 'production') {
      // TODO: Implement external logging service integration
    }
  }
}
