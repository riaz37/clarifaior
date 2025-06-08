import { BaseAgent } from './base/base-agent';
import { AgentConfig, AgentInput, AgentOutput } from './base/agent.interface';
// Debugger agent implementation

export interface DebuggerAgentConfig extends AgentConfig {
  /** Maximum depth for stack traces */
  maxStackDepth?: number;
  
  /** Whether to include variable inspection */
  inspectVariables?: boolean;
  
  /** Whether to include memory usage information */
  trackMemoryUsage?: boolean;
  
  /** Whether to enable performance profiling */
  enableProfiling?: boolean;
  
  /** Log level for debug output */
  logLevel?: 'error' | 'warn' | 'info' | 'debug' | 'trace';
}

export interface DebugSessionOptions {
  /** Session name or identifier */
  name?: string;
  
  /** Tags for categorizing the session */
  tags?: string[];
  
  /** Additional metadata */
  metadata?: Record<string, any>;
  
  /** Callback for breakpoints */
  onBreakpoint?: (data: any) => void | Promise<void>;
  
  /** Callback for errors */
  onError?: (error: Error) => void | Promise<void>;
}

export interface DebugInfo {
  /** Current call stack */
  stack: string[];
  
  /** Variables in current scope */
  variables: Record<string, any>;
  
  /** Memory usage information */
  memory?: {
    rss: string;
    heapTotal: string;
    heapUsed: string;
    external: string;
    arrayBuffers: string;
  };
  
  /** Performance metrics */
  performance?: {
    cpu: number;
    uptime: number;
  };
  
  /** Timestamp of the debug info */
  timestamp: Date;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

export interface Breakpoint {
  /** Unique identifier */
  id: string;
  
  /** Line number */
  line: number;
  
  /** Column number */
  column?: number;
  
  /** Condition expression */
  condition?: string;
  
  /** Hit count */
  hitCount: number;
  
  /** Whether the breakpoint is active */
  active: boolean;
}

/**
 * Agent for debugging workflows and code execution
 */
export class DebuggerAgent extends BaseAgent {
  private breakpoints: Map<string, Breakpoint> = new Map();
  private sessions: Map<string, DebugSessionOptions> = new Map();
  private logLevel: string;
  private maxStackDepth: number;
  private trackMemoryUsage: boolean;
  private enableProfiling: boolean;

  constructor(config: Partial<DebuggerAgentConfig> = {}) {
    super({
      name: 'debugger',
      description: 'Agent for debugging workflows and code execution',
      llmProvider: 'openai',
      temperature: 0.2,
      maxTokens: 1000,
      ...config,
    });

    this.logLevel = config.logLevel || 'info';
    this.maxStackDepth = config.maxStackDepth || 10;
    this.trackMemoryUsage = config.trackMemoryUsage ?? true;
    this.enableProfiling = config.enableProfiling ?? false;
  }

  /**
   * Start a new debug session
   */
  public startSession(options: Partial<DebugSessionOptions> = {}): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.sessions.set(sessionId, {
      name: options.name || `Session ${this.sessions.size + 1}`,
      tags: options.tags || [],
      metadata: options.metadata || {},
      onBreakpoint: options.onBreakpoint,
      onError: options.onError,
    });
    
    this.log(`Debug session started: ${sessionId}`, 'info');
    return sessionId;
  }
  
  /**
   * End a debug session
   */
  public endSession(sessionId: string): void {
    if (this.sessions.has(sessionId)) {
      this.sessions.delete(sessionId);
      this.log(`Debug session ended: ${sessionId}`, 'info');
    }
  }
  
  /**
   * Set a breakpoint
   */
  public setBreakpoint(
    file: string, 
    line: number, 
    column = 0, 
    condition?: string
  ): string {
    const id = `bp_${file}:${line}:${column}_${Date.now()}`;
    const breakpoint: Breakpoint = {
      id,
      line,
      column,
      condition,
      hitCount: 0,
      active: true,
    };
    
    this.breakpoints.set(id, breakpoint);
    this.log(`Breakpoint set at ${file}:${line}:${column}`, 'debug');
    return id;
  }
  
  /**
   * Remove a breakpoint
   */
  public removeBreakpoint(id: string): boolean {
    return this.breakpoints.delete(id);
  }
  
  /**
   * Toggle a breakpoint
   */
  public toggleBreakpoint(id: string, active: boolean): boolean {
    const breakpoint = this.breakpoints.get(id);
    if (breakpoint) {
      breakpoint.active = active;
      return true;
    }
    return false;
  }
  
  /**
   * Get debug information
   */
  public getDebugInfo(): DebugInfo {
    const stack = new Error().stack?.split('\n').slice(2, this.maxStackDepth + 2) || [];
    
    const debugInfo: DebugInfo = {
      stack,
      variables: {},
      timestamp: new Date(),
    };
    
    if (this.trackMemoryUsage) {
      const memoryUsage = process.memoryUsage();
      debugInfo.memory = {
        rss: this.formatBytes(memoryUsage.rss),
        heapTotal: this.formatBytes(memoryUsage.heapTotal),
        heapUsed: this.formatBytes(memoryUsage.heapUsed),
        external: this.formatBytes(memoryUsage.external || 0),
        arrayBuffers: this.formatBytes(memoryUsage.arrayBuffers || 0),
      };
    }
    
    if (this.enableProfiling) {
      const startUsage = process.cpuUsage();
      // Simulate some work to measure CPU
      for (let i = 0; i < 1000000; i++) {}
      const endUsage = process.cpuUsage(startUsage);
      
      debugInfo.performance = {
        cpu: (endUsage.user + endUsage.system) / 1000, // Convert to ms
        uptime: process.uptime(),
      };
    }
    
    return debugInfo;
  }
  
  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  /**
   * Log a debug message
   */
  private log(message: string, level: string = 'info'): void {
    const levels = ['error', 'warn', 'info', 'debug', 'trace'];
    const currentLevel = levels.indexOf(this.logLevel);
    const messageLevel = levels.indexOf(level);
    
    if (messageLevel <= currentLevel) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
      switch (level) {
        case 'error': console.error(logMessage); break;
        case 'warn': console.warn(logMessage); break;
        case 'info': console.info(logMessage); break;
        case 'debug': console.debug(logMessage); break;
        case 'trace': console.trace(logMessage); break;
        default: console.log(logMessage);
      }
    }
  }
  
  /**
   * Main execution method
   */
  protected async executeInternal(input: AgentInput, _execution?: unknown): Promise<AgentOutput> {
    // Initialize with default values
    let debugCommand = 'help';
    let commandArgs: Record<string, unknown> = {};
    try {
      // Parse the input
      if (typeof input.input === 'string') {
        try {
          const parsed = JSON.parse(input.input) as { command?: string; args?: Record<string, unknown> };
          if (parsed.command) debugCommand = parsed.command;
          if (parsed.args) commandArgs = parsed.args;
        } catch (e) {
          debugCommand = input.input;
        }
      } else if (input.input && typeof input.input === 'object') {
        const cmdInput = input.input as { command?: string; args?: Record<string, unknown> };
        if (cmdInput.command) debugCommand = cmdInput.command;
        if (cmdInput.args) commandArgs = cmdInput.args;
      }
      
      // Execute the debug command
      let result: any;
      
      switch (debugCommand.toLowerCase()) {
        case 'start_session':
          result = { sessionId: this.startSession(commandArgs as Partial<DebugSessionOptions>) };
          break;
          
        case 'end_session':
          const sessionId = (commandArgs as { sessionId: string }).sessionId;
          if (!sessionId) {
            throw new Error('sessionId is required');
          }
          this.endSession(sessionId);
          result = { success: true };
          break;
          
        case 'set_breakpoint':
          if (!commandArgs.file || commandArgs.line === undefined) {
            throw new Error('file and line are required');
          }
          const { file, line, column = 0, condition } = commandArgs as {
            file: string;
            line: number;
            column?: number;
            condition?: string;
          };
          result = { 
            breakpointId: this.setBreakpoint(file, line, column, condition) 
          };
          break;
          
        case 'remove_breakpoint':
          if (!commandArgs.breakpointId) {
            throw new Error('breakpointId is required');
          }
          const removeBpId = (commandArgs as { breakpointId: string }).breakpointId;
          result = { success: this.removeBreakpoint(removeBpId) };
          break;
          
        case 'toggle_breakpoint':
          if (!commandArgs.breakpointId || commandArgs.active === undefined) {
            throw new Error('breakpointId and active are required');
          }
          const toggleBpId = (commandArgs as { breakpointId: string; active: boolean }).breakpointId;
          const isActive = (commandArgs as { breakpointId: string; active: boolean }).active;
          result = { 
            success: this.toggleBreakpoint(toggleBpId, isActive) 
          };
          break;
          
        case 'get_debug_info':
          result = this.getDebugInfo();
          break;
          
        case 'help':
        default:
          result = {
            commands: [
              { command: 'start_session', description: 'Start a new debug session' },
              { command: 'end_session', description: 'End a debug session' },
              { command: 'set_breakpoint', description: 'Set a breakpoint' },
              { command: 'remove_breakpoint', description: 'Remove a breakpoint' },
              { command: 'toggle_breakpoint', description: 'Toggle a breakpoint' },
              { command: 'get_debug_info', description: 'Get debug information' },
              { command: 'help', description: 'Show this help message' },
            ]
          };
      }
      
      return {
        output: {
          result,
          metadata: {
            command: debugCommand,
            timestamp: new Date().toISOString(),
            sessionId: commandArgs.sessionId,
          }
        },
        metadata: {}
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log(`Error in debugger agent: ${errorMessage}`, 'error');
      
      return {
        output: { 
          error: errorMessage,
          metadata: {
            error: true,
            timestamp: new Date().toISOString(),
          }
        },
        metadata: {}
      };
    }
  }
}
