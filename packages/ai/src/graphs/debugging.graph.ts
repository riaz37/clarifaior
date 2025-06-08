import { StateGraph, END } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';
import { WorkflowState } from '../state/workflow-state';

export interface DebuggingState extends WorkflowState {
  // Debug information
  debug: {
    // Execution tracing
    executionTrace: Array<{
      stepId: string;
      stepName: string;
      startTime: string;
      endTime?: string;
      durationMs?: number;
      status: 'started' | 'completed' | 'failed' | 'retrying';
      input?: any;
      output?: any;
      error?: {
        message: string;
        stack?: string;
        code?: string;
      };
      metadata?: Record<string, any>;
    }>;
    
    // Performance metrics
    metrics: {
      totalSteps: number;
      completedSteps: number;
      failedSteps: number;
      successRate: number;
      averageStepDuration: number;
      totalDuration: number;
      stepsByDuration: Array<{
        stepId: string;
        stepName: string;
        duration: number;
      }>;
    };
    
    // Error tracking
    errors: Array<{
      id: string;
      stepId: string;
      stepName: string;
      timestamp: string;
      error: {
        message: string;
        stack?: string;
        code?: string;
      };
      context?: Record<string, any>;
      resolved: boolean;
    }>;
    
    // State snapshots at critical points
    stateSnapshots: Record<string, any>;
    
    // Debug configuration
    config: {
      captureInputs: boolean;
      captureOutputs: boolean;
      captureErrors: boolean;
      maxTraceEntries: number;
      slowStepThresholdMs: number;
    };
  };
}

export class DebuggingGraph {
  private graph: StateGraph<DebuggingState>;
  private isInitialized = false;
  
  constructor() {
    this.graph = new StateGraph<DebuggingState>({
      channels: {
        debug: {
          value: (x, y) => ({
            ...x,
            ...y,
            executionTrace: [...(x?.executionTrace || []), ...(y?.executionTrace || [])],
            errors: [...(x?.errors || []), ...(y?.errors || [])],
            metrics: {
              ...x?.metrics,
              ...y?.metrics,
              stepsByDuration: [
                ...(x?.metrics?.stepsByDuration || []),
                ...(y?.metrics?.stepsByDuration || []),
              ].sort((a, b) => b.duration - a.duration),
            },
          }),
          default: () => ({
            executionTrace: [],
            metrics: {
              totalSteps: 0,
              completedSteps: 0,
              failedSteps: 0,
              successRate: 0,
              averageStepDuration: 0,
              totalDuration: 0,
              stepsByDuration: [],
            },
            errors: [],
            stateSnapshots: {},
            config: {
              captureInputs: true,
              captureOutputs: true,
              captureErrors: true,
              maxTraceEntries: 1000,
              slowStepThresholdMs: 1000, // 1 second
            },
          }),
        },
      },
    });
    
    this.initializeGraph();
  }
  
  private initializeGraph(): void {
    // Add nodes for debugging workflow
    this.graph.addNode('start_debugging', this.startDebugging);
    this.graph.addNode('log_step_start', this.logStepStart);
    this.graph.addNode('log_step_complete', this.logStepComplete);
    this.graph.addNode('log_error', this.logError);
    this.graph.addNode('capture_state', this.captureState);
    this.graph.addNode('update_metrics', this.updateMetrics);
    this.graph.addNode('end_debugging', this.endDebugging);
    
    // Define the workflow
    this.graph.addEdge('start_debugging', 'log_step_start');
    this.graph.addEdge('log_step_start', 'log_step_complete');
    this.graph.addEdge('log_step_complete', 'update_metrics');
    this.graph.addEdge('update_metrics', 'end_debugging');
    this.graph.addEdge('log_error', 'update_metrics');
    
    // Set entry and end points
    this.graph.setEntryPoint('start_debugging');
    this.graph.setFinishPoint('end_debugging');
    
    this.isInitialized = true;
  }
  
  private startDebugging = async (state: DebuggingState) => {
    const now = new Date().toISOString();
    return {
      ...state,
      debug: {
        ...state.debug,
        executionTrace: [{
          stepId: 'debug_start',
          stepName: 'Debugging Started',
          startTime: now,
          status: 'started',
          metadata: {
            workflowId: state.id,
            workflowName: state.name,
          },
        }],
      },
    };
  };
  
  private logStepStart = async (state: DebuggingState) => {
    const currentStep = state.currentStep;
    if (!currentStep) return state;
    
    const now = new Date().toISOString();
    const traceEntry = {
      stepId: currentStep.id,
      stepName: currentStep.name,
      startTime: now,
      status: 'started' as const,
      input: state.debug.config.captureInputs ? currentStep.input : undefined,
    };
    
    return {
      ...state,
      debug: {
        ...state.debug,
        executionTrace: [...state.debug.executionTrace, traceEntry],
      },
    };
  };
  
  private logStepComplete = async (state: DebuggingState) => {
    const currentStep = state.currentStep;
    if (!currentStep) return state;
    
    const now = new Date().toISOString();
    const traceEntry = state.debug.executionTrace.find(
      (entry) => entry.stepId === currentStep.id && !entry.endTime
    );
    
    if (!traceEntry) return state;
    
    const duration = new Date(now).getTime() - new Date(traceEntry.startTime).getTime();
    
    return {
      ...state,
      debug: {
        ...state.debug,
        executionTrace: [
          ...state.debug.executionTrace.filter(entry => entry !== traceEntry),
          {
            ...traceEntry,
            endTime: now,
            durationMs: duration,
            status: 'completed' as const,
            output: state.debug.config.captureOutputs ? currentStep.output : undefined,
          },
        ],
      },
    };
  };
  
  private logError = async (state: DebuggingState) => {
    const currentStep = state.currentStep;
    if (!currentStep?.error) return state;
    
    const now = new Date().toISOString();
    const errorId = `err_${Date.now()}`;
    
    // Update the trace entry for the failed step
    const traceEntry = state.debug.executionTrace.find(
      (entry) => entry.stepId === currentStep.id && !entry.endTime
    );
    
    let updatedTrace = [...state.debug.executionTrace];
    if (traceEntry) {
      updatedTrace = [
        ...state.debug.executionTrace.filter(entry => entry !== traceEntry),
        {
          ...traceEntry,
          endTime: now,
          status: 'failed' as const,
          error: {
            message: currentStep.error.message,
            stack: currentStep.error.stack,
          },
        },
      ];
    }
    
    // Add to errors list
    const errorEntry = {
      id: errorId,
      stepId: currentStep.id,
      stepName: currentStep.name,
      timestamp: now,
      error: {
        message: currentStep.error.message,
        stack: currentStep.error.stack,
        code: currentStep.error.code,
      },
      context: {
        input: state.debug.config.captureInputs ? currentStep.input : undefined,
        state: state.debug.config.captureOutputs ? state : undefined,
      },
      resolved: false,
    };
    
    return {
      ...state,
      debug: {
        ...state.debug,
        executionTrace: updatedTrace,
        errors: [...state.debug.errors, errorEntry],
      },
    };
  };
  
  private captureState = async (state: DebuggingState) => {
    const snapshotId = `snap_${Date.now()}`;
    return {
      ...state,
      debug: {
        ...state.debug,
        stateSnapshots: {
          ...state.debug.stateSnapshots,
          [snapshotId]: {
            timestamp: new Date().toISOString(),
            state: {
              // Capture only relevant parts of the state to avoid circular references
              id: state.id,
              name: state.name,
              status: state.status,
              currentStep: state.currentStep,
              steps: state.steps?.map(s => ({
                id: s.id,
                name: s.name,
                status: s.status,
                error: s.error ? { message: s.error.message } : undefined,
              })),
            },
          },
        },
      },
    };
  };
  
  private updateMetrics = async (state: DebuggingState) => {
    const completedSteps = state.debug.executionTrace.filter(
      (entry) => entry.status === 'completed' || entry.status === 'failed'
    ).length;
    
    const failedSteps = state.debug.executionTrace.filter(
      (entry) => entry.status === 'failed'
    ).length;
    
    const totalSteps = state.steps?.length || 0;
    const successRate = completedSteps > 0 
      ? ((completedSteps - failedSteps) / completedSteps) * 100 
      : 0;
    
    const completedEntries = state.debug.executionTrace.filter(
      (entry) => entry.durationMs !== undefined
    );
    
    const totalDuration = completedEntries.reduce(
      (sum, entry) => sum + (entry.durationMs || 0), 0
    );
    
    const averageStepDuration = completedEntries.length > 0 
      ? totalDuration / completedEntries.length 
      : 0;
    
    const stepsByDuration = completedEntries
      .map(entry => ({
        stepId: entry.stepId,
        stepName: entry.stepName,
        duration: entry.durationMs || 0,
      }))
      .sort((a, b) => b.duration - a.duration);
    
    return {
      ...state,
      debug: {
        ...state.debug,
        metrics: {
          totalSteps,
          completedSteps,
          failedSteps,
          successRate,
          averageStepDuration,
          totalDuration,
          stepsByDuration,
        },
      },
    };
  };
  
  private endDebugging = async (state: DebuggingState) => {
    const now = new Date().toISOString();
    const traceEntry = state.debug.executionTrace.find(
      (entry) => entry.stepId === 'debug_start' && !entry.endTime
    );
    
    if (!traceEntry) return state;
    
    const duration = new Date(now).getTime() - new Date(traceEntry.startTime).getTime();
    
    return {
      ...state,
      debug: {
        ...state.debug,
        executionTrace: [
          ...state.debug.executionTrace.filter(entry => entry !== traceEntry),
          {
            ...traceEntry,
            endTime: now,
            durationMs: duration,
            status: 'completed' as const,
          },
        ],
      },
    };
  };
  
  /**
   * Get the compiled graph for execution
   */
  public compile() {
    if (!this.isInitialized) {
      throw new Error('Debugging graph not initialized');
    }
    return this.graph.compile();
  }
  
  /**
   * Execute the debugging graph with the given state
   */
  public async execute(state: DebuggingState): Promise<DebuggingState> {
    const compiled = this.compile();
    const result = await compiled.invoke(state);
    return result as DebuggingState;
  }
  
  /**
   * Get a summary of the debugging information
   */
  public getDebugSummary(state: DebuggingState) {
    const { metrics, errors, executionTrace } = state.debug;
    
    return {
      status: state.status,
      metrics: {
        ...metrics,
        successRate: parseFloat(metrics.successRate.toFixed(2)),
        averageStepDuration: parseFloat(metrics.averageStepDuration.toFixed(2)),
      },
      errors: {
        total: errors.length,
        unresolved: errors.filter(e => !e.resolved).length,
        latest: errors.slice(-5).map(e => ({
          id: e.id,
          step: e.stepName,
          message: e.error.message,
          timestamp: e.timestamp,
        })),
      },
      recentSteps: executionTrace
        .sort((a, b) => 
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        )
        .slice(0, 10)
        .map(step => ({
          id: step.stepId,
          name: step.stepName,
          status: step.status,
          duration: step.durationMs,
          startTime: step.startTime,
        })),
      slowestSteps: metrics.stepsByDuration.slice(0, 5),
    };
  }
  
  /**
   * Get detailed information about a specific step
   */
  public getStepDetails(state: DebuggingState, stepId: string) {
    const stepTrace = state.debug.executionTrace
      .filter(entry => entry.stepId === stepId)
      .sort((a, b) => 
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );
    
    if (stepTrace.length === 0) return null;
    
    const stepErrors = state.debug.errors.filter(error => error.stepId === stepId);
    
    return {
      id: stepId,
      name: stepTrace[0].stepName,
      executions: stepTrace.map(execution => ({
        startTime: execution.startTime,
        endTime: execution.endTime,
        duration: execution.durationMs,
        status: execution.status,
        input: execution.input,
        output: execution.output,
        error: execution.error,
      })),
      errors: stepErrors.map(error => ({
        id: error.id,
        timestamp: error.timestamp,
        message: error.error.message,
        resolved: error.resolved,
      })),
      metrics: {
        totalExecutions: stepTrace.length,
        successRate: stepTrace.length > 0 
          ? (stepTrace.filter(e => e.status === 'completed').length / stepTrace.length) * 100 
          : 0,
        averageDuration: stepTrace.length > 0 
          ? stepTrace.reduce((sum, e) => sum + (e.durationMs || 0), 0) / stepTrace.length 
          : 0,
      },
    };
  }
}

export default DebuggingGraph;