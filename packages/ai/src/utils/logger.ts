export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class Logger {
  private name: string;
  private logLevel: number;
  private static readonly LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(name: string, level: LogLevel = 'info') {
    this.name = name;
    this.logLevel = Logger.LEVELS[level];
  }

  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (Logger.LEVELS[level] >= this.logLevel) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [${level.toUpperCase()}] [${this.name}] ${message}`;
      
      switch (level) {
        case 'error':
          console.error(logMessage, ...args);
          break;
        case 'warn':
          console.warn(logMessage, ...args);
          break;
        case 'info':
          console.info(logMessage, ...args);
          break;
        case 'debug':
          console.debug(logMessage, ...args);
          break;
      }
    }
  }

  debug(message: string, ...args: any[]): void {
    this.log('debug', message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log('warn', message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.log('error', message, ...args);
  }

  setLevel(level: LogLevel): void {
    this.logLevel = Logger.LEVELS[level];
  }

  getLevel(): LogLevel {
    return Object.entries(Logger.LEVELS).find(
      ([_, value]) => value === this.logLevel
    )?.[0] as LogLevel || 'info';
  }
}

// Create a default logger instance
export const logger = new Logger('default');
