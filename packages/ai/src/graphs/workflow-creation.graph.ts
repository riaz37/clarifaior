import { StateGraph, END, StateGraphArgs } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';
import { WorkflowState } from '../state/workflow-state';
import { loadAllAgents } from '../agents';

type BinaryOperator<T> = (a: T, b: T) => T;

interface Agent {
  name: string;
  plan: (input: any) => Promise<{
    output: {
      returnValues: {
        output: any;
      };
    };
    metadata?: Record<string, any>;
  }>;
}

interface AgentOutput {
  output: any;
  metadata?: Record<string, any>;
}

interface WorkflowStep {
  id: string;
  name: string;
  type?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  error?: string;
  output?: any;
  metadata?: Record<string, any>;
  completedAt?: Date;
  durationMs?: number;
}

export interface WorkflowCreationState extends Omit<WorkflowState, 'steps'> {
  // Input from the user
  userInput: string;
  
  // Workflow steps
  steps: WorkflowStep[];
  
  // Agent outputs
  intent?: any;
  workflowDesign?: any;
  integrationMapping?: any;
  validationResult?: {
    isValid: boolean;
    issues?: Array<{ type: string; message: string }>;
  };
  executionPlan?: any;
  
  // Execution context
  currentAgent?: string;
  agentOutputs: Record<string, AgentOutput>;
  errors: Array<{ 
    agent: string;
    error: string;
    timestamp: string;
    stepId?: string;
    metadata?: Record<string, any>;
  }>;
  
  // Performance metrics
  metrics: {
    startTime: number;
    endTime?: number;
    stepDurations: Record<string, number>;
    totalTokens: number;
  };
  
  // Progress tracking
  progress: {
    currentStep: number;
    totalSteps: number;
    stepProgress: Record<string, number>;
  };
  
  // Retry logic
  retryCount: number;
  maxRetries: number;
  
  // Additional properties
  id?: string;
  status?: string;
  updatedAt?: Date;
}

// Define the shape of our state
interface WorkflowStateChannels {
  messages: BaseMessage[];
  agentOutputs: Record<string, AgentOutput>;
  errors: Array<{agent: string; error: string; timestamp: string; stepId?: string; metadata?: any}>;
  metrics: {startTime: number; endTime?: number; stepDurations: Record<string, number>; totalTokens: number};
  progress: {currentStep: number; totalSteps: number; stepProgress: Record<string, number>};
  userInput: string;
  steps: WorkflowStep[];
  retryCount: number;
  maxRetries: number;
}

// Define the channel configurations for StateGraph
const workflowChannels: StateGraphArgs<WorkflowStateChannels>['channels'] = {
  messages: {
    value: (x: BaseMessage[] = [], y: BaseMessage[] = []) => [...x, ...y],
    default: () => [] as BaseMessage[],
  },
  agentOutputs: {
    value: (x: Record<string, AgentOutput> = {}, y: Record<string, AgentOutput> = {}) => ({
      ...x,
      ...y,
    }),
    default: () => ({} as Record<string, AgentOutput>),
  },
  errors: {
    value: (
      x: Array<{agent: string; error: string; timestamp: string; stepId?: string; metadata?: any}> = [],
      y: Array<{agent: string; error: string; timestamp: string; stepId?: string; metadata?: any}> = []
    ) => [...x, ...y],
    default: () => [] as Array<{agent: string; error: string; timestamp: string; stepId?: string; metadata?: any}>,
  },
  metrics: {
    value: (
      x: {startTime: number; endTime?: number; stepDurations: Record<string, number>; totalTokens: number} = {startTime: 0, stepDurations: {}, totalTokens: 0},
      y: {startTime: number; endTime?: number; stepDurations: Record<string, number>; totalTokens: number} = {startTime: 0, stepDurations: {}, totalTokens: 0}
    ) => ({
      startTime: Math.min(x.startTime || Date.now(), y.startTime || Date.now()),
      endTime: y.endTime || x.endTime,
      stepDurations: {
        ...(x.stepDurations || {}),
        ...(y.stepDurations || {}),
      },
      totalTokens: (x.totalTokens || 0) + (y.totalTokens || 0),
    }),
    default: () => ({
      startTime: Date.now(),
      stepDurations: {},
      totalTokens: 0,
    }),
  },
  progress: {
    value: (
      x: {currentStep: number; totalSteps: number; stepProgress: Record<string, number>} = {currentStep: 0, totalSteps: 0, stepProgress: {}},
      y: {currentStep: number; totalSteps: number; stepProgress: Record<string, number>} = {currentStep: 0, totalSteps: 0, stepProgress: {}}
    ) => ({
      currentStep: Math.max(x.currentStep || 0, y.currentStep || 0),
      totalSteps: Math.max(x.totalSteps || 0, y.totalSteps || 0, WORKFLOW_STEPS.length),
      stepProgress: {
        ...(x.stepProgress || {}),
        ...(y.stepProgress || {}),
      },
    }),
    default: () => ({
      currentStep: 0,
      totalSteps: WORKFLOW_STEPS.length,
      stepProgress: {},
    }),
  },
  userInput: {
    value: (x: string = '', y: string = '') => y || x,
    default: () => '',
  },
  steps: {
    value: (x: WorkflowStep[] = [], y: WorkflowStep[] = []) => y.length ? y : x,
    default: () => [] as WorkflowStep[],
  },
  retryCount: {
    value: (x: number = 0, y: number = 0) => y || x,
    default: () => 0,
  },
  maxRetries: {
    value: (x: number = DEFAULT_MAX_RETRIES, y: number = DEFAULT_MAX_RETRIES) => y || x,
    default: () => DEFAULT_MAX_RETRIES,
  },
};

const DEFAULT_MAX_RETRIES = 3;
const WORKFLOW_STEPS = [
  'parse_intent',
  'design_workflow',
  'map_integrations',
  'validate_workflow',
  'plan_execution'
] as const;

type WorkflowStepType = typeof WORKFLOW_STEPS[number];

export class WorkflowCreationGraph {
  private graph: StateGraph<WorkflowStateChannels>;
  private agents: Agent[] = [];
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    this.graph = new StateGraph<WorkflowStateChannels>({
      channels: workflowChannels
    });
  }

  /**
   * Get the agent name for a given node
   */
  private getAgentNameForNode(nodeName: string): string {
    // Map node names to agent names
    const agentMap: Record<string, string> = {
      'parse_intent': 'intent-parser',
      'design_workflow': 'workflow-designer',
      'map_integrations': 'integration-mapper',
      'validate_workflow': 'workflow-validator',
      'plan_execution': 'execution-planner'
    };
    
    return agentMap[nodeName] || nodeName;
  }

  /**
   * Initialize the workflow graph with nodes and edges
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = (async (): Promise<void> => {
      try {
        // Load all available agents
        this.agents = await loadAllAgents({ verbose: true });

        // Add nodes for each workflow step
        for (const step of WORKFLOW_STEPS) {
          this.graph.addNode(step, this.createAgentNode(step));
        }

        // Define the workflow edges
        for (let i = 0; i < WORKFLOW_STEPS.length - 1; i++) {
          this.graph.addEdge(WORKFLOW_STEPS[i], WORKFLOW_STEPS[i + 1]);
        }

        // Add conditional edges for validation
        this.graph.addConditionalEdges(
          'validate_workflow',
          async (state: WorkflowCreationState): Promise<string> => {
            if (state.validationResult?.isValid === false) {
              if ((state.retryCount || 0) >= (state.maxRetries || DEFAULT_MAX_RETRIES)) {
                return END;
              }
              return 'design_workflow';
            }
            return 'plan_execution';
          }
        );

        // Add the final edge to END
        this.graph.addEdge('plan_execution', END);

        this.isInitialized = true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Failed to initialize workflow graph:', errorMessage);
        throw error;
      }
    })();

    return this.initializationPromise;
  }

  /**
   * Create an agent node for the workflow
   */
  private createAgentNode(stepName: WorkflowStepType): (state: WorkflowCreationState) => Promise<Partial<WorkflowCreationState>> {
    const self = this; // Capture 'this' for use in the returned function
    return async (state: WorkflowCreationState): Promise<Partial<WorkflowCreationState>> => {
      const stepId = `${stepName}_${Date.now()}`;
      const stepStartTime = Date.now();
      const agentName = this.getAgentNameForNode(stepName);

      try {
        // Update step progress
        this.updateStepProgress(state, stepName, 25);

        // Find the agent
        const agent = this.agents.find(a => a.name === agentName);
        
        if (!agent) {
          throw new Error(`Agent ${agentName} not found for step ${stepName}`);
        }

        // Prepare input for the agent
        const input = this.prepareAgentInput(stepName, state);
        
        // Execute the agent
        const result = await agent.plan(input);

        // Update progress
        this.updateStepProgress(state, stepName, 75);

        // Process the result
        const output = this.processAgentOutput(stepName, result, state);

        // Update metrics
        const stepDuration = Date.now() - stepStartTime;
        const metrics = {
          ...state.metrics,
          stepDurations: {
            ...state.metrics.stepDurations,
            [stepName]: (state.metrics.stepDurations[stepName] || 0) + stepDuration,
          },
        };

        // Complete the step
        this.updateStepProgress(state, stepName, 100);

        return {
          ...output,
          metrics,
          currentAgent: stepName,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error in ${stepName}:`, errorMessage);

        return {
          ...state,
          errors: [
            ...(state.errors || []),
            {
              agent: stepName,
              error: errorMessage,
              timestamp: new Date().toISOString(),
              stepId,
              metadata: {
                stack: error instanceof Error ? error.stack : undefined,
              },
            },
          ],
        };
      }
    };
    return async (state: WorkflowCreationState): Promise<Partial<WorkflowCreationState>> => {
      const stepId = `${stepName}_${Date.now()}`;
      const stepStartTime = Date.now();
      const agentName = this.getAgentNameForNode(stepName);

      try {
        // Update step progress
        this.updateStepProgress(state, stepName, 25);

        // Find the agent
        const agent = this.agents.find(a => a.name === agentName);
        
        if (!agent) {
          throw new Error(`Agent ${agentName} not found for step ${stepName}`);
        }

        // Prepare input for the agent
        const input = this.prepareAgentInput(stepName, state);
        
        // Execute the agent
        const result = await agent.plan(input);

        // Update progress
        this.updateStepProgress(state, stepName, 75);

        // Process the result
        const output = this.processAgentOutput(stepName, result, state);

        // Update metrics
        const stepDuration = Date.now() - stepStartTime;
        const metrics = {
          ...state.metrics,
          stepDurations: {
            ...state.metrics.stepDurations,
            [stepName]: (state.metrics.stepDurations[stepName] || 0) + stepDuration,
          },
        };

        // Complete the step
        this.updateStepProgress(state, stepName, 100);

        return {
          ...output,
          metrics,
          currentAgent: stepName,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error in ${stepName}:`, errorMessage);

        return {
          ...state,
          errors: [
            ...(state.errors || []),
            {
              agent: stepName,
              error: errorMessage,
              timestamp: new Date().toISOString(),
              stepId,
              metadata: {
                stack: error instanceof Error ? error.stack : undefined,
              },
            },
          ],
        };
      }
    };
  }

  /**
   * Prepare input for an agent based on the current state
   */
  private prepareAgentInput(stepName: WorkflowStepType, state: WorkflowCreationState): any {
    const baseInput = {
      userInput: state.userInput,
      currentState: { ...state },
    };

    // Add step-specific context
    switch (stepName) {
      case 'parse_intent':
        return {
          ...baseInput,
          // Add any specific input for intent parsing
        };
      case 'design_workflow':
        return {
          ...baseInput,
          intent: state.intent,
          // Add any specific input for workflow design
        };
      case 'map_integrations':
        return {
          ...baseInput,
          workflowDesign: state.workflowDesign,
          // Add any specific input for integration mapping
        };
      case 'validate_workflow':
        return {
          ...baseInput,
          workflowDesign: state.workflowDesign,
          integrationMapping: state.integrationMapping,
          // Add any specific input for validation
        };
      case 'plan_execution':
        return {
          ...baseInput,
          workflowDesign: state.workflowDesign,
          integrationMapping: state.integrationMapping,
          validationResult: state.validationResult,
          // Add any specific input for execution planning
        };
      default:
        return baseInput;
    }
  }

  /**
   * Process the output from an agent
   */
  private processAgentOutput(
    stepName: WorkflowStepType,
    result: any,
    state: WorkflowCreationState
  ): Partial<WorkflowCreationState> {
    const output: Partial<WorkflowCreationState> = {
      agentOutputs: {
        ...state.agentOutputs,
        [stepName]: {
          output: result.output.returnValues.output,
          metadata: result.metadata,
        },
      },
    };

    // Update state based on the step
    switch (stepName) {
      case 'parse_intent':
        output.intent = result.output.returnValues.output;
        break;
      case 'design_workflow':
        output.workflowDesign = result.output.returnValues.output;
        break;
      case 'map_integrations':
        output.integrationMapping = result.output.returnValues.output;
        break;
      case 'validate_workflow':
        output.validationResult = result.output.returnValues.output;
        break;
      case 'plan_execution':
        output.executionPlan = result.output.returnValues.output;
        break;
    }

    return output;
  }

  /**
   * Update the progress for a workflow step
   */
  private updateStepProgress(
    state: WorkflowCreationState,
    stepName: WorkflowStepType,
    percent: number
  ): void {
    const stepIndex = WORKFLOW_STEPS.indexOf(stepName);
    if (stepIndex === -1) return;

    state.progress = {
      ...state.progress,
      currentStep: stepIndex + 1,
      stepProgress: {
        ...state.progress.stepProgress,
        [stepName]: percent,
      },
    };
  }

  /**
   * Execute the workflow with the given input
   */
  public async execute(input: { userInput: string; maxRetries?: number }): Promise<WorkflowCreationState> {
    await this.initialize();

    const initialState: WorkflowCreationState = {
      userInput: input.userInput,
      steps: WORKFLOW_STEPS.map(name => ({
        id: `${name}_${Date.now()}`,
        name,
        status: 'pending',
      })),
      agentOutputs: {},
      errors: [],
      metrics: {
        startTime: Date.now(),
        stepDurations: {},
        totalTokens: 0,
      },
      progress: {
        currentStep: 0,
        totalSteps: WORKFLOW_STEPS.length,
        stepProgress: {},
      },
      retryCount: 0,
      maxRetries: input.maxRetries ?? DEFAULT_MAX_RETRIES,
    } as WorkflowCreationState;

    try {
      // Create a runner from the compiled graph
      const runner = this.graph.compile();
      
      // Initialize the state
      let state = { ...initialState };
      
      // Run the graph step by step
      for (const step of WORKFLOW_STEPS) {
        const result = await runner.invoke({
          ...state,
          currentAgent: step,
        });
        
        // Update state with the result
        state = {
          ...state,
          ...result,
          currentAgent: undefined, // Reset current agent after step completes
        };
      }
      
      // Finalize the state
      return {
        ...state,
        metrics: {
          ...state.metrics,
          endTime: Date.now(),
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Workflow execution failed:', errorMessage);
      
      return {
        ...initialState,
        errors: [
          ...initialState.errors,
          {
            agent: 'workflow',
            error: errorMessage,
            timestamp: new Date().toISOString(),
            metadata: {
              stack: error instanceof Error ? error.stack : undefined,
            },
          },
        ],
        metrics: {
          ...initialState.metrics,
          endTime: Date.now(),
        },
      } as WorkflowCreationState;
    }
  }
}

  /**
   * Initialize the workflow creation graph
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = (async () => {
      try {
        // Load all agents
        this.agents = await loadAllAgents({ verbose: true });

        // Add nodes for each workflow step
        for (const step of WORKFLOW_STEPS) {
          this.graph.addNode(step, this.createAgentNode(step));
        }

        // Define the workflow edges
        for (let i = 0; i < WORKFLOW_STEPS.length - 1; i++) {
          this.graph.addEdge(WORKFLOW_STEPS[i], WORKFLOW_STEPS[i + 1]);
        }

        // Add conditional edges for validation
        this.graph.addConditionalEdges(
          'validate_workflow',
          async (state: any) => {
            const validationResult = state.validationResult;
            if (validationResult?.isValid === false) {
              if (state.retryCount >= state.maxRetries) {
                return END;
              }
              return 'design_workflow';
            }
            return 'plan_execution';
          }
        );

        // Add the final edge to END
        this.graph.addEdge('plan_execution', END);
        
        this.isInitialized = true;
      } catch (error) {
        console.error('Failed to initialize workflow graph:', error);
        throw error;
      }
    })();

    return this.initializationPromise;
  }
        this.isInitialized = true;
  private getAgentNameForNode(nodeName: string): string {
    // Map node names to agent names
    const agentMap: Record<string, string> = {
      'parse_intent': 'intent-parser',
      'design_workflow': 'workflow-designer',
      'map_integrations': 'integration-mapper',
      'validate_workflow': 'workflow-validator',
      'plan_execution': 'execution-planner'
    };
    
    return agentMap[nodeName] || nodeName;
  }
  
  private getNextNode(currentNode: string, state: WorkflowCreationState): string {
    const nodeFlow: Record<string, string> = {
      'parse_intent': 'design_workflow',
      'design_workflow': 'map_integrations',
      'map_integrations': 'validate_workflow',
      'validate_workflow': state.validationResult?.isValid === false ? 'design_workflow' : 'plan_execution',
      'plan_execution': END,
    };
    return nodeFlow[currentNode] || END;
  }

  private createAgentNode(nodeName: string) {
    const agentName = this.getAgentNameForNode(nodeName);
    
    return async (state: WorkflowCreationState) => {
      const stepStartTime = Date.now();
      const stepId = `${nodeName}_${Date.now()}`;
      
      // Create a new workflow step
      const workflowStep: WorkflowStep = {
        id: stepId,
        type: 'action',
        status: 'in_progress',
        input: {},
        startedAt: new Date(),
        metadata: {
          node: nodeName,
          agent: agentName,
        },
      };

      // Update state with new step
      const updatedState = {
        ...state,
        currentAgent: agentName,
        updatedAt: new Date(),
        steps: [...state.steps, workflowStep],
        progress: {
          ...state.progress,
          currentStep: this.getStepNumber(nodeName),
          stepProgress: {
            ...state.progress.stepProgress,
            [nodeName]: 0, // Start progress at 0%
          },
        },
      };

      try {
        // Executing agent step

        const agent = this.agents.find(a => a.name === agentName);
        if (!agent) {
          throw new Error(`Agent ${agentName} not found`);
        }

        // Prepare input for the agent
        const agentInput = this.prepareAgentInput(nodeName, state);
        
        // Update progress to 25%
        this.updateStepProgress(updatedState, nodeName, 25);

        // Execute the agent
        const result = await agent.plan(agentInput);
        
        // Update progress to 75%
        this.updateStepProgress(updatedState, nodeName, 75);

        // Process the agent output
        const outputKey = this.getOutputKeyForAgent(agentName);
        const agentOutput = {
          [outputKey]: result.output.returnValues.output,
          agentOutputs: {
            ...state.agentOutputs,
            [agentName]: result.output.returnValues.output,
          },
        };

        // Update the workflow step
        const completedStep: WorkflowStep = {
          ...workflowStep,
          status: 'completed',
          output: agentOutput[outputKey],
          completedAt: new Date(),
          durationMs: Date.now() - stepStartTime,
        };

        // Update progress to 100%
        this.updateStepProgress(updatedState, nodeName, 100);

        // Step completed successfully

        return {
          ...updatedState,
          ...agentOutput,
          steps: [...state.steps.filter(s => s.id !== stepId), completedStep],
          metrics: {
            ...state.metrics,
            stepDurations: {
              ...state.metrics.stepDurations,
              [nodeName]: (state.metrics.stepDurations?.[nodeName] || 0) + (completedStep.durationMs || 0),
            },
          },
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error in ${nodeName}:`, error);

        const failedStep: WorkflowStep = {
          ...workflowStep,
          status: 'failed',
          error: errorMessage,
          completedAt: new Date(),
          durationMs: Date.now() - stepStartTime,
        };

        return {
          ...updatedState,
          errors: [
            ...state.errors,
            {
              agent: agentName,
              error: errorMessage,
              timestamp: new Date().toISOString(),
              stepId,
              metadata: {
                node: nodeName,
                stack: error instanceof Error ? error.stack : undefined,
              },
            },
          ],
          steps: [...state.steps.filter(s => s.id !== stepId), failedStep],
        };
      }
    };
  }
  
  private getStepNumber(nodeName: string): number {
    const nodeOrder = ['parse_intent', 'design_workflow', 'map_integrations', 'validate_workflow', 'plan_execution'];
    return nodeOrder.indexOf(nodeName) + 1;
  }
  
  private updateStepProgress(state: WorkflowCreationState, nodeName: string, percent: number) {
    state.progress = {
      ...state.progress,
      stepProgress: {
        ...state.progress.stepProgress,
        [nodeName]: percent,
      },
    };
  }
  
  private prepareAgentInput(nodeName: string, state: WorkflowCreationState) {
    // Prepare the base input
    const baseInput = {
      input: state.userInput,
      intermediate_steps: [],
      context: {
        workflowId: state.id,
        currentStep: nodeName,
        previousSteps: state.steps
          .filter(s => s.status === 'completed')
          .map(s => ({
            step: s.id,
            agent: s.metadata?.agent,
            output: s.output,
          })),
      },
    };

    // Add previous step outputs to context
    switch (nodeName) {
      case 'design_workflow':
        return {
          ...baseInput,
          intent: state.intent,
        };
      case 'map_integrations':
        return {
          ...baseInput,
          workflowDesign: state.workflowDesign,
        };
      case 'validate_workflow':
        return {
          ...baseInput,
          workflowDesign: state.workflowDesign,
          integrationMapping: state.integrationMapping,
        };
      case 'plan_execution':
        return {
          ...baseInput,
          workflowDesign: state.workflowDesign,
          integrationMapping: state.integrationMapping,
          validationResult: state.validationResult,
        };
      default:
        return baseInput;
    }
  }

  private getOutputKeyForAgent(agentName: string): string {
    const outputKeys: Record<string, string> = {
      'intent-parser': 'intent',
      'workflow-designer': 'workflowDesign',
      'integration-mapper': 'integrationMapping',
      'validator': 'validationResult',
      'execution-planner': 'executionPlan',
    };
    return outputKeys[agentName] || 'output';
  }
  
  /**
   * Get the current progress of the workflow
   */
  public getProgress(state: WorkflowCreationState) {
    const completedSteps = state.steps.filter(s => s.status === 'completed').length;
    const totalSteps = 5; // Total number of steps in the workflow
    
    // Calculate overall progress (0-100)
    const progress = Math.min(100, Math.round((completedSteps / totalSteps) * 100));
    
    return {
      progress,
      completedSteps,
      totalSteps,
      currentStep: state.progress.currentStep,
      stepProgress: state.progress.stepProgress,
      currentAgent: state.currentAgent,
      status: state.status,
    };
  }

  /**
   * Create a new workflow based on user input
   */
  async createWorkflow(
    userInput: string,
    options: {
      userId?: string;
      metadata?: Record<string, any>;
      metrics: {
        ...result.metrics,
        endTime,
        totalDuration: endTime - result.metrics.startTime,
      },
    };

    console.log('Workflow execution completed', {
      workflowId,
      status: finalState.status,
      duration: finalState.durationMs,
      stepsCompleted: finalState.steps.filter((s: any) => s.status === 'completed').length,
      hasErrors: finalState.errors.length > 0,
    });

    return finalState;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Workflow execution failed', {
      workflowId,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      ...initialState,
      status: 'failed',
      error: {
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        code: 'WORKFLOW_EXECUTION_FAILED',
      },
      errors: [
        ...initialState.errors,
        {
          agent: 'workflow-creation-graph',
          error: errorMessage,
          timestamp: new Date().toISOString(),
          metadata: {
            step: 'workflow-execution',
            stack: error instanceof Error ? error.stack : undefined,
          stack: error instanceof Error ? error.stack : undefined,
          code: 'WORKFLOW_EXECUTION_FAILED',
        },
        errors: [
          ...initialState.errors,
          {
            agent: 'workflow-creation-graph',
            error: errorMessage,
            timestamp: new Date().toISOString(),
            metadata: {
              step: 'workflow-execution',
              stack: error instanceof Error ? error.stack : undefined,
            },
          },
        ],
        completedAt: new Date(),
        durationMs: Date.now() - initialState.metrics.startTime,
      };
    }
  }
}
