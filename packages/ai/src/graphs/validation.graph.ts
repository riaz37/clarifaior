import { StateGraph } from '@langchain/langgraph';
import type { StateGraphArgs } from '@langchain/langgraph/dist/state';
import type { WorkflowDesign } from '../types/workflow';
import type { ValidationContext, ValidationResult, ValidationSummary } from '../agents/validator.agent';

type ValidationStatus = 'pending' | 'in-progress' | 'completed' | 'failed';

// Define the shape of the validation step
interface ValidationStep {
  name: string;
  status: ValidationStatus;
  startTime?: Date;
  endTime?: Date;
  durationMs?: number;
  error?: string;
}

// Define the shape of the validation graph state
interface ValidationGraphState {
  workflow: WorkflowDesign;
  context?: ValidationContext;
  errors: string[];
  warnings: string[];
  messages: string[];
  status: ValidationStatus;
  startTime: Date;
  endTime?: Date;
  validationResult?: ValidationResult;
  debug: {
    validationSteps: ValidationStep[];
  };
}

// Define the shape of the state that flows through the graph
interface GraphState extends ValidationGraphState {
  // Channels for different types of messages
  _messages: string[];
  _validationResults: Record<string, unknown>;
  _errors: string[];
  _warnings: string[];
}

// Type for the state channels configuration
type StateChannelsConfig = StateGraphArgs<GraphState>['channels'];

export class ValidationGraph {
  private graph: StateGraph<GraphState>;

  constructor() {
    // Define state channels with proper typing
    const channels: StateChannelsConfig = {
      // The main state channel that contains all the validation state
      state: {
        value: (prevState: GraphState = {} as GraphState, newState: GraphState = {} as GraphState): GraphState => {
          // Merge the state objects
          const mergedState: GraphState = {
            // Spread the previous state first
            ...prevState,
            // Then override with new state
            ...newState,
            // Merge arrays and objects that need special handling
            _messages: [...(prevState._messages || []), ...(newState._messages || [])],
            _errors: [...new Set([...(prevState._errors || []), ...(newState._errors || [])])],
            _warnings: [...new Set([...(prevState._warnings || []), ...(newState._warnings || [])])],
            _validationResults: {
              ...(prevState._validationResults || {}),
              ...(newState._validationResults || {})
            },
            // Merge the main validation state
            workflow: newState.workflow || prevState.workflow || {} as WorkflowDesign,
            context: newState.context || prevState.context,
            errors: [...new Set([...(prevState.errors || []), ...(newState.errors || [])])],
            warnings: [...new Set([...(prevState.warnings || []), ...(newState.warnings || [])])],
            messages: [...(prevState.messages || []), ...(newState.messages || [])],
            status: newState.status || prevState.status || 'pending',
            startTime: newState.startTime || prevState.startTime || new Date(),
            endTime: newState.endTime || prevState.endTime,
            validationResult: newState.validationResult || prevState.validationResult,
            debug: {
              ...prevState.debug,
              ...newState.debug,
              validationSteps: [
                ...(prevState.debug?.validationSteps || []),
                ...(newState.debug?.validationSteps || [])
              ]
            }
          };
          
          return mergedState;
        },
        default: (): GraphState => ({
          workflow: {} as WorkflowDesign,
          errors: [],
          warnings: [],
          messages: [],
          status: 'pending',
          startTime: new Date(),
          debug: {
            validationSteps: [],
          },
          _messages: [],
          _validationResults: {},
          _errors: [],
          _warnings: [],
        })
      }
      },
    };

    // Initialize the graph with state channels
    const graph = new StateGraph<GraphState>({ channels });

    // Add nodes
    graph.addNode('initialize', this.initializeValidation.bind(this));
    graph.addNode('validateStructure', this.validateStructure.bind(this));
    graph.addNode('validateSecurity', this.validateSecurity.bind(this));
    graph.addNode('validatePerformance', this.validatePerformance.bind(this));
    graph.addNode('validateCompliance', this.validateCompliance.bind(this));
    graph.addNode('validateUsability', this.validateUsability.bind(this));
    graph.addNode('finalize', this.finalizeValidation.bind(this));

    // Define edges
    graph.addEdge('initialize', 'validateStructure');
    graph.addEdge('validateStructure', 'validateSecurity');
    graph.addEdge('validateSecurity', 'validatePerformance');
    graph.addEdge('validatePerformance', 'validateCompliance');
    graph.addEdge('validateCompliance', 'validateUsability');
    graph.addEdge('validateUsability', 'finalize');

    // Compile the graph
    this.graph = graph.compile();
  }

  // Node handlers
  public async validate(workflow: WorkflowDesign, context?: ValidationContext): Promise<ValidationResult> {
    const startTime = new Date();

    // Create the initial state with all required properties
    const initialState: GraphState = {
      state: {
        workflow,
        context,
        errors: [],
        warnings: [],
        messages: [],
        status: 'pending',
        startTime,
        debug: {
          validationSteps: [
            { name: 'initialize', status: 'pending' },
            { name: 'validateStructure', status: 'pending' },
            { name: 'validateSecurity', status: 'pending' },
            { name: 'validatePerformance', status: 'pending' },
            { name: 'validateCompliance', status: 'pending' },
            { name: 'validateUsability', status: 'pending' },
            { name: 'finalize', status: 'pending' },
          ],
        },
      },
      _messages: [],
      _validationResults: {},
      _errors: [],
      _warnings: [],
    };

    try {
      // Compile and execute the graph
      const compiledGraph = this.graph.compile();
      const result = await compiledGraph.invoke(initialState);

      if (result.state.validationResult) {
        return result.state.validationResult;
      }

      // Fallback in case validation result is missing
      return {
        isValid: false,
        summary: {
          totalIssues: 1,
          errorCount: 1,
          warningCount: 0,
          infoCount: 0,
          passedChecks: 0,
          totalChecks: 0,
          estimatedFixTime: 0,
          riskLevel: 'high' as const,
        },
        issues: [
          {
            type: 'error' as const,
            message: 'Validation completed but no result was produced',
            severity: 'critical' as const,
          },
        ],
      };
    } catch (error) {
      console.error('Validation failed:', error);
      return {
        isValid: false,
        summary: {
          totalIssues: 1,
          errorCount: 1,
          warningCount: 0,
          infoCount: 0,
          passedChecks: 0,
          totalChecks: 0,
          estimatedFixTime: 0,
          riskLevel: 'high' as const,
        },
        issues: [
          {
            type: 'error' as const,
            message: error instanceof Error ? error.message : 'Unknown error during validation',
            severity: 'critical' as const,
          },
        ],
      };
    }
  }

  private initializeValidation = async (state: GraphState): Promise<Partial<GraphState>> => {
    const updatedState = this.updateStepStatus(
      { 
        ...state.state, 
        status: 'running', 
        startTime: new Date(), 
        messages: [...state.state.messages, 'Starting validation...'] 
      },
      'initialize',
      'completed'
    );
    return { 
      state: updatedState,
      _messages: [...state._messages, 'Starting validation...']
    };
  };

  private async validateStructure(state: GraphState): Promise<Partial<GraphState>> {
    try {
      // Update step status to in-progress
      const updatedState = this.updateStepStatus(
        state,
        'validateStructure',
        'in-progress'
      );

      // Perform structure validation
      // ...

      // Update step status to completed
      return this.updateStepStatus(
        updatedState,
        'validateStructure',
        'completed'
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during structure validation';
      return this.updateStepStatus(
        state,
        'validateStructure',
        'failed',
        errorMessage
      );
    }
  };

  private async validateSecurity(state: GraphState): Promise<Partial<GraphState>> {
    try {
      let updatedState = this.updateStepStatus(state.state, 'validateSecurity', 'in-progress');

      // Perform security validation
      // ...

      return this.updateStepStatus(updatedState, 'validateSecurity', 'completed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during security validation';
      return this.updateStepStatus(
        state,
        'validateSecurity',
        'failed',
        errorMessage
      );
    }
  };

  private async validatePerformance(state: GraphState): Promise<Partial<GraphState>> {
    try {
      let updatedState = this.updateStepStatus(state.state, 'validatePerformance', 'in-progress');

      // Perform performance validation
      // ...

      return this.updateStepStatus(updatedState, 'validatePerformance', 'completed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during performance validation';
      return this.updateStepStatus(
        state,
        'validatePerformance',
        'failed',
        errorMessage
      );
    }
  };

  private async validateCompliance(state: GraphState): Promise<Partial<GraphState>> {
    try {
      let updatedState = this.updateStepStatus(state.state, 'validateCompliance', 'in-progress');

      // Perform compliance validation
      // ...

      return this.updateStepStatus(updatedState, 'validateCompliance', 'completed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during compliance validation';
      return this.updateStepStatus(
        state,
        'validateCompliance',
        'failed',
        errorMessage
      );
    }
  };

  private async validateUsability(state: GraphState): Promise<Partial<GraphState>> {
    try {
      let updatedState = this.updateStepStatus(state.state, 'validateUsability', 'in-progress');

      // Perform usability validation
      // ...

      return this.updateStepStatus(updatedState, 'validateUsability', 'completed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during usability validation';
      return this.updateStepStatus(
        state,
        'validateUsability',
        'failed',
        errorMessage
      );
    }
  };

  private async finalizeValidation(state: GraphState): Promise<Partial<GraphState>> {
    const endTime = new Date();
    const startTime = state.state.startTime || endTime;
    const durationMs = endTime.getTime() - startTime.getTime();
    const completedSteps = state.state.debug.validationSteps.filter((s) => s.status === 'completed').length;
    const totalSteps = state.state.debug.validationSteps.length;
    const errors = [...new Set([...state._errors, ...state.state.errors])];
    const warnings = [...new Set([...state._warnings, ...state.state.warnings])];
    const completionMessage = `Validation completed in ${durationMs}ms with ${errors.length} errors and ${warnings.length} warnings`;

    const summary: ValidationSummary = {
      totalIssues: errors.length + warnings.length,
      errorCount: errors.length,
      warningCount: warnings.length,
      infoCount: 0,
      passedChecks: completedSteps,
      totalChecks: totalSteps,
      estimatedFixTime: 0,
      riskLevel: errors.length > 0 ? 'high' : warnings.length > 0 ? 'medium' : 'low',
    };

    const validationResult: ValidationResult = {
      isValid: errors.length === 0,
      summary,
      issues: [
        ...errors.map((msg) => ({
          type: 'error' as const,
          message: msg,
          severity: 'high' as const,
        })),
        ...warnings.map((msg) => ({
          type: 'warning' as const,
          message: msg,
          severity: 'medium' as const,
        })),
      ],
    };

    const updatedState = this.updateStepStatus(
      {
        ...state.state,
        status: 'completed',
        endTime,
        validationResult,
        messages: [...state.state.messages, completionMessage],
        errors,
        warnings,
      },
      'finalize',
      'completed'
    );

    return {
      state: updatedState,
      _validationResults: {
        ...state._validationResults,
        validationResult,
      },
      _messages: [...state._messages, completionMessage],
      _errors: errors,
      _warnings: warnings,
    };
  };

  private updateStepStatus(
    state: GraphState,
    stepName: string,
    status: ValidationStatus,
    error?: string
  ): GraphState {
    const now = new Date();
    const updatedSteps = (state.debug?.validationSteps || []).map((step) => {
      if (step.name === stepName) {
        const updatedStep = { ...step, status };
        if (status === 'in-progress') {
          updatedStep.startTime = now;
        } else if (status === 'completed' || status === 'failed') {
          updatedStep.endTime = now;
          updatedStep.durationMs = updatedStep.startTime
            ? now.getTime() - updatedStep.startTime.getTime()
            : 0;
          if (error) {
            updatedStep.error = error;
          }
        }
        return updatedStep;
      }
      return step;
    });
    
    return {
      ...state,
      debug: {
        ...state.debug,
        validationSteps: updatedSteps,
      },
    };
  }

  private calculateValidationScore(state: GraphState): number {
    // Calculate a score based on the number of errors and warnings
    const errorCount = state.errors.length;
    const warningCount = state.warnings.length;
    const maxScore = 100;
    const errorPenalty = Math.min(errorCount * 10, 70); // Cap error penalty at 70%
    const warningPenalty = Math.min(warningCount * 2, 20); // Cap warning penalty at 20%
    
    return Math.max(0, maxScore - errorPenalty - warningPenalty);
  }
}

// Export a singleton instance
export const validationGraph = new ValidationGraph();