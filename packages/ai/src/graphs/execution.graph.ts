import { StateGraph, END } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';
import { WorkflowState, createInitialWorkflowState } from '../state/workflow-state';

export interface ExecutionState extends WorkflowState {
  // Current execution status
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused' | 'canceled';
  currentStepId?: string;
  nextStepId?: string;
  
  // Execution context
  startTime?: Date;
  endTime?: Date;
  durationMs?: number;
  
  // Results and outputs
  stepOutputs: Record<string, any>;
  stepErrors: Record<string, string>;
  
  // Retry information
  retryCount: number;
  maxRetries: number;
  
  // Metrics
  metrics: {
    totalSteps: number;
    completedSteps: number;
    successRate: number;
    averageStepDuration: number;
  };
}

export class ExecutionGraph {
  private graph: StateGraph<ExecutionState>;

  constructor() {
    this.graph = new StateGraph({
      channels: {
        messages: {
          value: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y),
          default: () => [],
        },
        stepOutputs: {
          value: (x: any, y: any) => ({ ...x, ...y }),
          default: () => ({}),
        },
        stepErrors: {
          value: (x: any, y: any) => ({ ...x, ...y }),
          default: () => ({}),
        },
      },
    });

    this.initializeGraph();
  }

  private initializeGraph() {
    // Add nodes for each execution phase
    this.graph.addNode('initialize', this.initializeExecution);
    this.graph.addNode('execute_step', this.executeStep);
    this.graph.addNode('handle_result', this.handleStepResult);
    this.graph.addNode('finalize', this.finalizeExecution);

    // Define the workflow
    this.graph.addEdge('initialize', 'execute_step');
    this.graph.addConditionalEdges(
      'execute_step',
      this.decideNextStep
    );
    this.graph.addEdge('handle_result', 'execute_step');
    this.graph.addEdge('finalize', END);
  }

  private initializeExecution = async (state: ExecutionState) => {
    const now = new Date();
    return {
      ...state,
      status: 'running' as const,
      startTime: now,
      updatedAt: now,
      metrics: {
        totalSteps: state.steps?.length || 0,
        completedSteps: 0,
        successRate: 0,
        averageStepDuration: 0,
      },
      currentStepId: state.steps?.[0]?.id,
    };
  };

  private executeStep = async (state: ExecutionState) => {
    if (!state.currentStepId) {
      return { ...state, nextStepId: END };
    }

    const step = state.steps.find(s => s.id === state.currentStepId);
    if (!step) {
      throw new Error(`Step ${state.currentStepId} not found`);
    }

    try {
      // In a real implementation, this would execute the actual step
      // For now, we'll simulate execution
      const startTime = Date.now();
      
      // Simulate work
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = {
        [step.id]: {
          success: true,
          output: `Executed step: ${step.description}`,
          durationMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };

      return {
        ...state,
        stepOutputs: {
          ...state.stepOutputs,
          ...result,
        },
      };
    } catch (error) {
      return {
        ...state,
        stepErrors: {
          ...state.stepErrors,
          [step.id]: error.message,
        },
      };
    }
  };

  private handleStepResult = async (state: ExecutionState) => {
    const currentStepIndex = state.steps.findIndex(s => s.id === state.currentStepId);
    const nextStep = state.steps[currentStepIndex + 1];
    
    const completedSteps = state.metrics.completedSteps + 1;
    const successCount = Object.keys(state.stepOutputs).length;
    
    return {
      ...state,
      currentStepId: nextStep?.id,
      nextStepId: nextStep?.id || END,
      metrics: {
        ...state.metrics,
        completedSteps,
        successRate: completedSteps > 0 ? successCount / completedSteps : 0,
      },
    };
  };

  private finalizeExecution = async (state: ExecutionState) => {
    const now = new Date();
    const durationMs = now.getTime() - (state.startTime?.getTime() || now.getTime());
    
    const success = Object.keys(state.stepErrors).length === 0;
    
    return {
      ...state,
      status: success ? 'completed' : 'failed',
      endTime: now,
      durationMs,
      updatedAt: now,
    };
  };

  private decideNextStep = async (state: ExecutionState) => {
    if (state.nextStepId === END) {
      return 'finalize';
    }
    
    if (state.currentStepId && state.stepErrors[state.currentStepId]) {
      if (state.retryCount < state.maxRetries) {
        // Retry the current step
        return 'execute_step';
      }
      // Move to finalize with error
      return 'finalize';
    }
    
    return state.nextStepId ? 'handle_result' : 'finalize';
  };

  async execute(workflow: any): Promise<ExecutionState> {
    const initialState: ExecutionState = {
      ...createInitialWorkflowState(),
      ...workflow,
      status: 'pending',
      stepOutputs: {},
      stepErrors: {},
      retryCount: 0,
      maxRetries: 3,
      metrics: {
        totalSteps: workflow.steps?.length || 0,
        completedSteps: 0,
        successRate: 0,
        averageStepDuration: 0,
      },
    };

    const compiledGraph = this.graph.compile();
    const result = await compiledGraph.invoke(initialState);
    
    return result as ExecutionState;
  }
}
