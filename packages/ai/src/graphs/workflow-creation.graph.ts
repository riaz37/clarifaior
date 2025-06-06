import { StateGraph, END } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';
import { WorkflowState } from '../state/workflow-state';
import { loadAllAgents, routeToAgent } from '../agents';

interface WorkflowCreationState extends WorkflowState {
  // Input from the user
  userInput: string;
  
  // Agent outputs
  intent?: any;
  workflowDesign?: any;
  integrationMapping?: any;
  validationResult?: any;
  executionPlan?: any;
  
  // Execution context
  currentAgent?: string;
  agentOutputs: Record<string, any>;
  errors: Array<{ agent: string; error: string }>;
}

export class WorkflowCreationGraph {
  private graph: StateGraph<WorkflowCreationState>;
  private agents: Awaited<ReturnType<typeof loadAllAgents>>;

  constructor() {
    this.graph = new StateGraph({
      channels: {
        messages: {
          value: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y),
          default: () => [],
        },
        agentOutputs: {
          value: (x: any, y: any) => ({ ...x, ...y }),
          default: () => ({}),
        },
        errors: {
          value: (x: any[], y: any[]) => x.concat(y),
          default: () => [],
        },
      },
    });

    this.initializeGraph();
  }

  private async initializeGraph() {
    // Load all agents
    this.agents = await loadAllAgents({ verbose: true });

    // Add nodes for each agent
    this.graph.addNode('parse_intent', this.createAgentNode('intent-parser'));
    this.graph.addNode('design_workflow', this.createAgentNode('workflow-designer'));
    this.graph.addNode('map_integrations', this.createAgentNode('integration-mapper'));
    this.graph.addNode('validate_workflow', this.createAgentNode('validator'));
    this.graph.addNode('plan_execution', this.createAgentNode('execution-planner'));

    // Define the workflow
    this.graph.addEdge('parse_intent', 'design_workflow');
    this.graph.addEdge('design_workflow', 'map_integrations');
    this.graph.addEdge('map_integrations', 'validate_workflow');
    this.graph.addEdge('validate_workflow', 'plan_execution');
    this.graph.addEdge('plan_execution', END);

    // Add conditional edges for error handling
    this.graph.addConditionalEdges(
      'validate_workflow',
      async (state: WorkflowCreationState) => {
        if (state.validationResult?.isValid === false) {
          return 'design_workflow'; // Go back to design if validation fails
        }
        return 'plan_execution';
      }
    );
  }

  private createAgentNode(agentName: string) {
    return async (state: WorkflowCreationState) => {
      try {
        const agent = this.agents.find(a => a.name === agentName);
        if (!agent) {
          throw new Error(`Agent ${agentName} not found`);
        }

        // Update state to show which agent is currently running
        const updatedState = {
          ...state,
          currentAgent: agentName,
          updatedAt: new Date(),
        };

        // Execute the agent
        const result = await agent.plan({
          input: state.userInput,
          intermediate_steps: [],
        });

        // Update state with agent output
        const outputKey = this.getOutputKeyForAgent(agentName);
        const agentOutput = {
          [outputKey]: result.output.returnValues.output,
          agentOutputs: {
            ...state.agentOutputs,
            [agentName]: result.output.returnValues.output,
          },
        };

        return {
          ...updatedState,
          ...agentOutput,
        };
      } catch (error) {
        console.error(`Error in ${agentName}:`, error);
        return {
          ...state,
          errors: [
            ...state.errors,
            {
              agent: agentName,
              error: error.message,
              timestamp: new Date().toISOString(),
            },
          ],
        };
      }
    };
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

  async createWorkflow(userInput: string): Promise<WorkflowCreationState> {
    const initialState: WorkflowCreationState = {
      ...createInitialWorkflowState(),
      userInput,
      agentOutputs: {},
      errors: [],
    };

    const compiledGraph = this.graph.compile();
    const result = await compiledGraph.invoke(initialState);
    
    return result as WorkflowCreationState;
  }
}
