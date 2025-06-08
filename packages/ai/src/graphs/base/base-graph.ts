import { StateGraph, END, StateGraphArgs, StateGraph as LangGraph } from '@langchain/langgraph';
import { v4 as uuidv4 } from 'uuid';
import { 
  WorkflowNode, 
  IWorkflowGraph, 
  WorkflowGraphConfig,
  WorkflowState,
  WorkflowStep
} from './graph.interface';

/**
 * Default implementation of a workflow graph
 */

export class BaseWorkflowGraph<TState extends WorkflowState = WorkflowState, TInput = any, TOutput = any>
  implements IWorkflowGraph<TState, TInput, TOutput> {
  
  protected config: WorkflowGraphConfig<TState, TInput, TOutput>;
  protected graph?: LangGraph<TState>;
  protected executionId: string;

  constructor(config: WorkflowGraphConfig<TState, TInput, TOutput>) {
    this.config = {
      maxIterations: 100,
      ...config,
    };
    this.executionId = uuidv4();
    this.initializeGraph();
  }

  /**
   * Initializes the state graph with nodes and edges
   */
  protected initializeGraph(): void {
    // Create a new state graph
    this.graph = new LangGraph<TState>({
      channels: {
        // Core workflow state channels
        input: {
          value: (x: any = {}) => x,
          default: () => ({}),
        },
        output: {
          value: (x: any = {}) => x,
          default: () => undefined,
        },
        error: {
          value: (x: Error | undefined) => x,
          default: () => undefined,
        },
        currentStep: {
          value: (x: string | undefined) => x,
          default: () => '',
        },
        steps: {
          value: (x: WorkflowStep[] = [], y: WorkflowStep[] = []) => [...x, ...y],
          default: () => [],
        },
      },
    });

    // Add nodes to the graph
    this.config.nodes.forEach(node => {
      this.addNodeToGraph(node);
    });

    // Set entry point
    if (this.graph) {
      this.graph.setEntryPoint(this.config.entryPoint);
      
      // Add edges based on node.next functions
      this.config.nodes.forEach(node => {
        if (node.next) {
          const nextNodes = node.next({} as TOutput);
          const nextNodeNames = Array.isArray(nextNodes) ? nextNodes : [nextNodes];
          nextNodeNames.forEach(nextNodeName => {
            this.graph?.addEdge(node.name, nextNodeName);
          });
        }
      });

      // Set output node if specified
      if (this.config.outputNode) {
        this.graph.addEdge(this.config.outputNode, END);
      }
    }
  }

  /**
   * Adds a node to the underlying state graph
   */
  protected addNodeToGraph(node: WorkflowNode<TState, any>): void {
    if (!this.graph) {
      throw new Error('State graph not initialized');
    }

    this.graph.addNode(node.name, async (state: TState, config?: any) => {
      const startTime = Date.now();
      let output: any;
      let error: Error | undefined;
      let success = true;

      try {
        output = await node.execute(state, config?.input);
      } catch (err) {
        error = err instanceof Error ? err : new Error(String(err));
        success = false;
      }

      const step: WorkflowStep = {
        node: node.name,
        input: config?.input,
        output,
        duration: Date.now() - startTime,
        success,
        error,
      };

      // Update state with step result
      const updatedState: TState = {
        ...state,
        currentStep: node.name,
        output,
        error,
        steps: [...(state.steps || []), step],
      };

      // Determine next node(s) if this node has a next function
      let nextNodes: string[] = [];
      if (node.next) {
        const next = node.next(output);
        nextNodes = Array.isArray(next) ? next : [next];
      }
      
      return {
        ...updatedState,
        next: nextNodes,
      };
    });
  }

  /**
   * Compiles the workflow graph into an executable state machine
   */
  compile(): StateGraph<TState> {
    if (!this.graph) {
      throw new Error('State graph not initialized');
    }
    return this.graph;
  }

  /**
   * Executes the workflow with the given input
   */
  async execute(input: TInput, initialState: Partial<TState> = {}): Promise<TOutput> {
    if (!this.graph) {
      throw new Error('State graph not initialized');
    }

    // Initialize state with defaults and provided initial state
    const initialGraphState: TState = {
      input,
      steps: [],
      ...this.config.initialState,
      ...initialState,
    } as TState;

    try {
      // Compile the graph
      const runnable = this.graph.compile();
      
      // Execute the graph and collect results
      const stream = await runnable.stream(initialGraphState, {
        recursionLimit: this.config.maxIterations,
      });

      // Process the stream to get the final state
      let finalState: TState = initialGraphState;
      for await (const chunk of stream) {
        if (chunk && typeof chunk === 'object') {
          finalState = { ...finalState, ...chunk };
        }
      }
      
      // Return the final output
      return finalState.output as TOutput;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      throw err; // Re-throw the error to be handled by the caller
    }
  }

  /**
   * Adds a node to the workflow
   */
  addNode(node: WorkflowNode<TState, any>): void {
    this.config.nodes.push(node as WorkflowNode<TState, any, any>);
    this.initializeGraph(); // Rebuild the graph
  }

  /**
   * Removes a node from the workflow
   */
  removeNode(nodeName: string): boolean {
    const initialLength = this.config.nodes.length;
    this.config.nodes = this.config.nodes.filter(node => node.name !== nodeName);
    const removed = initialLength !== this.config.nodes.length;
    
    if (removed) {
      this.initializeGraph(); // Rebuild the graph
    }
    
    return removed;
  }

  /**
   * Gets the current workflow configuration
   */
  getConfig(): WorkflowGraphConfig<TState, TInput, TOutput> {
    return { ...this.config };
  }

  /**
   * Helper to create a conditional node
   */
  protected createConditionalNode(
    name: string, 
    condition: (state: TState) => Promise<string>,
    description?: string
  ): WorkflowNode<TState, any, string> {
    return {
      name,
      description,
      execute: condition,
      next: (output: string) => output,
    };
  }

  /**
   * Helper to create an action node
   */
  protected createActionNode<T = any>(
    name: string,
    action: (state: TState) => Promise<T>,
    nextNode?: string | ((output: T) => string | string[]),
    description?: string
  ): WorkflowNode<TState, any, T> {
    return {
      name,
      description,
      execute: action,
      next: nextNode ? (typeof nextNode === 'string' ? () => nextNode : nextNode) : undefined,
    };
  }
}

export default BaseWorkflowGraph;