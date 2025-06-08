import { StateGraph, END, StateGraphArgs } from "@langchain/langgraph";
import { v4 as uuidv4 } from "uuid";
import {
  WorkflowNode,
  IWorkflowGraph,
  WorkflowGraphConfig,
  WorkflowState,
  WorkflowStep,
} from "./graph.interface";

/**
 * Enhanced base implementation of a workflow graph with proper error handling,
 * validation, and monitoring capabilities
 */
export class BaseWorkflowGraph<
  TState extends WorkflowState = WorkflowState,
  TInput = any,
  TOutput = any,
> implements IWorkflowGraph<TState, TInput, TOutput>
{
  protected config: WorkflowGraphConfig<TState, TInput, TOutput>;
  protected graph?: StateGraph<TState>;
  protected executionId: string;
  protected isCompiled: boolean = false;
  protected compiledGraph?: any;

  constructor(config: WorkflowGraphConfig<TState, TInput, TOutput>) {
    this.config = {
      maxIterations: 100,
      ...config,
    };
    this.executionId = uuidv4();
    this.validateConfig();
    this.initializeGraph();
  }

  /**
   * Validates the workflow configuration
   */
  protected validateConfig(): void {
    if (!this.config.nodes || this.config.nodes.length === 0) {
      throw new Error("Workflow must have at least one node");
    }

    if (!this.config.entryPoint) {
      throw new Error("Workflow must have an entry point");
    }

    // Check if entry point exists in nodes
    const entryNodeExists = this.config.nodes.some(
      (node) => node.name === this.config.entryPoint
    );
    if (!entryNodeExists) {
      throw new Error(
        `Entry point "${this.config.entryPoint}" does not exist in nodes`
      );
    }

    // Check for duplicate node names
    const nodeNames = this.config.nodes.map((node) => node.name);
    const duplicates = nodeNames.filter(
      (name, index) => nodeNames.indexOf(name) !== index
    );
    if (duplicates.length > 0) {
      throw new Error(`Duplicate node names found: ${duplicates.join(", ")}`);
    }

    // Validate node references in next functions
    this.validateNodeReferences();
  }

  /**
   * Validates that all node references in next functions exist
   */
  protected validateNodeReferences(): void {
    const nodeNames = new Set(this.config.nodes.map((node) => node.name));

    for (const node of this.config.nodes) {
      if (node.next) {
        // This is a simplified check - in reality, you'd need to check all possible outputs
        // For now, we'll skip runtime validation and do it during execution
      }
    }
  }

  /**
   * Initializes the state graph with nodes and edges
   */
  protected initializeGraph(): void {
    try {
      // Define state channels based on WorkflowState interface
      const stateChannels = this.createStateChannels();

      // Create a new state graph with proper typing
      const graphArgs: StateGraphArgs<TState> = {
        channels: stateChannels,
      };

      this.graph = new StateGraph<TState>(graphArgs);

      // Add nodes to the graph
      this.config.nodes.forEach((node) => {
        this.addNodeToGraph(node);
      });

      // Set entry point
      this.graph.setEntryPoint(this.config.entryPoint);

      // Add conditional edges for dynamic routing
      this.addConditionalEdges();

      // Set finish point
      this.setFinishCondition();
    } catch (error) {
      throw new Error(
        `Failed to initialize graph: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Creates state channels for the graph
   */
  protected createStateChannels(): Record<string, any> {
    return {
      input: {
        value: (x: any = {}) => x,
        default: () => ({}),
      },
      output: {
        value: (x: any = undefined, y: any = undefined) =>
          y !== undefined ? y : x,
        default: () => undefined,
      },
      error: {
        value: (
          x: Error | undefined = undefined,
          y: Error | undefined = undefined
        ) => (y !== undefined ? y : x),
        default: () => undefined,
      },
      currentStep: {
        value: (x: string = "", y: string = "") => y || x,
        default: () => "",
      },
      steps: {
        value: (x: WorkflowStep[] = [], y: WorkflowStep[] = []) => {
          if (y.length === 0) return x;
          return [...x, ...y];
        },
        default: () => [],
      },
      // Allow for custom state properties
      ...this.getCustomStateChannels(),
    };
  }

  /**
   * Override this method to add custom state channels
   */
  protected getCustomStateChannels(): Record<string, any> {
    return {};
  }

  /**
   * Adds conditional edges to the graph for dynamic routing
   */
  protected addConditionalEdges(): void {
    if (!this.graph) return;

    // Add conditional routing logic
    this.graph.addConditionalEdges(
      // Start node or nodes (can be string or string[])
      this.config.entryPoint,
      // This will be called after each node to determine the next step
      (state: TState) => {
        // Check if there's an error - if so, route to error handling
        if (state.error) {
          return "ERROR_HANDLER";
        }

        // Check if we have a next step defined in the state
        if (state.currentStep) {
          const currentNode = this.config.nodes.find(
            (n) => n.name === state.currentStep
          );
          if (currentNode?.next) {
            const nextStep = currentNode.next(state.output);
            return Array.isArray(nextStep) ? nextStep[0] : nextStep;
          }
        }

        return END;
      },
      // Mapping of possible return values to actual node names
      this.createRouteMap()
    );
  }

  /**
   * Creates a route map for conditional edges
   */
  protected createRouteMap(): Record<string, string> {
    const routeMap: Record<string, string> = {};

    // Add all node names to route map
    this.config.nodes.forEach((node) => {
      routeMap[node.name] = node.name;
    });

    // Add special routes
    routeMap["ERROR_HANDLER"] = "ERROR_HANDLER";
    routeMap[END] = END;

    return routeMap;
  }

  /**
   * Sets the finish condition for the workflow
   */
  protected setFinishCondition(): void {
    if (!this.graph) return;

    // Add error handler node if it doesn't exist
    if (!this.config.nodes.some((n) => n.name === "ERROR_HANDLER")) {
      this.graph.addNode("ERROR_HANDLER", async (state: TState) => {
        return {
          ...state,
          output: { error: state.error?.message || "Unknown error occurred" },
        };
      });
      this.graph.addEdge("ERROR_HANDLER", END);
    }

    // If outputNode is specified, add edge to END
    if (this.config.outputNode) {
      this.graph.addEdge(this.config.outputNode, END);
    }
  }

  /**
   * Adds a node to the underlying state graph with enhanced error handling
   */
  protected addNodeToGraph(node: WorkflowNode<TState, any>): void {
    if (!this.graph) {
      throw new Error("State graph not initialized");
    }

    this.graph.addNode(node.name, async (state: TState) => {
      const startTime = Date.now();
      let output: any;
      let error: Error | undefined;
      let success = true;

      try {
        // Execute the node with timeout protection
        output = await this.executeNodeWithTimeout(node, state);
      } catch (err) {
        error = err instanceof Error ? err : new Error(String(err));
        success = false;
        console.error(`Error in node ${node.name}:`, error);
      }

      // Create execution step
      const step: WorkflowStep = {
        node: node.name,
        input: state.input,
        output,
        duration: Date.now() - startTime,
        success,
        error,
        metadata: {
          executionId: this.executionId,
          timestamp: new Date().toISOString(),
        },
      };

      // Return updated state
      return {
        ...state,
        currentStep: node.name,
        output: success ? output : state.output, // Keep previous output if failed
        error,
        steps: [step], // LangGraph will accumulate these
      } as TState;
    });
  }

  /**
   * Executes a node with timeout protection
   */
  protected async executeNodeWithTimeout(
    node: WorkflowNode<TState, any>,
    state: TState,
    timeoutMs: number = 30000
  ): Promise<any> {
    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new Error(
            `Node ${node.name} execution timed out after ${timeoutMs}ms`
          )
        );
      }, timeoutMs);

      try {
        const result = await node.execute(state, state.input);
        clearTimeout(timeout);
        resolve(result);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Compiles the workflow graph into an executable state machine
   */
  compile(): StateGraph<TState> {
    if (!this.graph) {
      throw new Error("State graph not initialized");
    }

    try {
      // Create compilation config with optional checkpointer
      const compileConfig: any = {};
      
      // Only add checkpointer if it's defined in the config
      if (this.config.checkpointer) {
        compileConfig.checkpointer = this.config.checkpointer;
      }
      
      this.compiledGraph = this.graph.compile(compileConfig);
      this.isCompiled = true;
      return this.graph;
    } catch (error) {
      throw new Error(
        `Failed to compile graph: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Executes the workflow with the given input and enhanced error handling
   */
  async execute(
    input: TInput,
    initialState: Partial<TState> = {}
  ): Promise<TOutput> {
    if (!this.isCompiled) {
      this.compile();
    }

    if (!this.compiledGraph) {
      throw new Error("Graph must be compiled before execution");
    }

    // Create initial state with proper type safety
    const initialGraphState = this.createInitialState(input, initialState);

    try {
      // Execute the graph with streaming for better monitoring
      const stream = await this.compiledGraph.stream(initialGraphState, {
        recursionLimit: this.config.maxIterations,
        streamMode: "updates",
      });

      let finalState: TState = initialGraphState;

      // Process the stream
      for await (const update of stream) {
        if (update && typeof update === "object") {
          // Merge updates into final state
          finalState = this.mergeStateUpdate(finalState, update);
        }
      }

      // Check for execution errors
      if (finalState.error) {
        throw finalState.error;
      }

      return finalState.output as TOutput;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`Workflow execution failed for ${this.executionId}:`, err);
      throw err;
    }
  }

  /**
   * Merges state updates from the stream
   */
  /**
   * Creates a new state object with proper type safety
   */
  protected createInitialState(input: TInput, initialState: Partial<TState> = {}): TState {
    // Create a base state with required properties
    const baseState = {
      input,
      steps: [],
      currentStep: "",
      executionId: this.executionId,
    } as unknown as TState; // Initial type assertion to TState
    
    // Apply config initialState (medium priority)
    if (this.config.initialState) {
      Object.assign(baseState, this.config.initialState);
    }
    
    // Apply provided initialState (highest priority)
    if (initialState) {
      Object.assign(baseState, initialState);
    }
    
    return baseState;
  }

  /**
   * Merges state updates with the current state
   */
  protected mergeStateUpdate(currentState: TState, update: any): TState {
    if (!update || typeof update !== "object") {
      return currentState;
    }

    // Create a new state object with the merged properties
    const mergedState = { ...currentState };
    
    // Handle steps array specially to ensure proper merging
    if (Array.isArray(update.steps) && update.steps.length > 0) {
      mergedState.steps = [
        ...(currentState.steps || []),
        ...update.steps,
      ] as any; // We know this is safe because TState extends WorkflowState
    }
    
    // Merge all other properties
    for (const key in update) {
      if (key !== 'steps' && key in mergedState) {
        (mergedState as any)[key] = update[key];
      }
    }
    
    return mergedState;
  }

  /**
   * Adds a node to the workflow with validation
   */
  addNode(node: WorkflowNode<TState, any>): void {
    // Validate node
    if (!node.name || typeof node.name !== "string") {
      throw new Error("Node must have a valid name");
    }

    if (!node.execute || typeof node.execute !== "function") {
      throw new Error("Node must have an execute function");
    }

    // Check for duplicate names
    if (this.config.nodes.some((n) => n.name === node.name)) {
      throw new Error(`Node with name "${node.name}" already exists`);
    }

    this.config.nodes.push(node as WorkflowNode<TState, any, any>);
    this.isCompiled = false; // Mark as needing recompilation
    this.initializeGraph(); // Rebuild the graph
  }

  /**
   * Removes a node from the workflow with validation
   */
  removeNode(nodeName: string): boolean {
    // Check if node is the entry point
    if (nodeName === this.config.entryPoint) {
      throw new Error("Cannot remove entry point node");
    }

    const initialLength = this.config.nodes.length;
    this.config.nodes = this.config.nodes.filter(
      (node) => node.name !== nodeName
    );
    const removed = initialLength !== this.config.nodes.length;

    if (removed) {
      this.isCompiled = false; // Mark as needing recompilation
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
   * Gets execution statistics
   */
  getExecutionStats(): {
    executionId: string;
    isCompiled: boolean;
    nodeCount: number;
  } {
    return {
      executionId: this.executionId,
      isCompiled: this.isCompiled,
      nodeCount: this.config.nodes.length,
    };
  }

  /**
   * Helper to create a conditional node with type safety
   */
  protected createConditionalNode<T = string>(
    name: string,
    condition: (state: TState) => Promise<T>,
    description?: string
  ): WorkflowNode<TState, any, T> {
    return {
      name,
      description: description || `Conditional node: ${name}`,
      execute: condition,
      next: (output: T) => String(output),
    };
  }

  /**
   * Helper to create an action node with enhanced typing
   */
  protected createActionNode<T = any>(
    name: string,
    action: (state: TState) => Promise<T>,
    nextNode?: string | ((output: T) => string | string[]),
    description?: string
  ): WorkflowNode<TState, any, T> {
    return {
      name,
      description: description || `Action node: ${name}`,
      execute: action,
      next: nextNode
        ? typeof nextNode === "string"
          ? () => nextNode
          : nextNode
        : undefined,
    };
  }
}

export default BaseWorkflowGraph;
