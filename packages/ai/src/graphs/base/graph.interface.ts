import { StateGraph } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';

/**
 * Represents the state of a workflow execution
 */
export interface WorkflowState {
  // Core workflow state
  input: any;
  output?: any;
  error?: Error;
  
  // Execution tracking
  currentStep?: string;
  steps: WorkflowStep[];
  
  // Additional context
  [key: string]: any;
}

/**
 * Represents a single step in the workflow execution
 */
export interface WorkflowStep {
  node: string;
  input?: any;
  output?: any;
  duration: number;
  success: boolean;
  error?: Error;
  metadata?: Record<string, any>;
}

/**
 * A node in the workflow graph
 */
export interface WorkflowNode<TState extends WorkflowState, TInput = any, TOutput = any> {
  /** Unique identifier for the node */
  name: string;
  
  /** Human-readable description of the node's purpose */
  description?: string;
  
  /**
   * Executes the node's logic
   * @param state Current workflow state
   * @param input Node-specific input
   * @returns The output of the node
   */
  execute: (state: TState, input?: TInput) => Promise<TOutput>;
  
  /**
   * Determines the next node(s) to execute
   * @param output The output from this node's execution
   * @returns Name(s) of the next node(s) to execute
   */
  next?: (output: TOutput) => string | string[];
}

/**
 * Configuration for a workflow graph
 */
export interface WorkflowGraphConfig<TState extends WorkflowState, TInput = any, TOutput = any> {
  /** List of nodes in the workflow */
  nodes: WorkflowNode<TState, TInput, TOutput>[];
  
  /** Name of the entry point node */
  entryPoint: string;
  
  /** Optional name of the output node */
  outputNode?: string;
  
  /** Maximum number of iterations to prevent infinite loops */
  maxIterations?: number;
  
  /** Default state values */
  initialState?: Partial<TState>;
}

/**
 * Interface for a workflow graph executor
 */
export interface IWorkflowGraph<TState extends WorkflowState, TInput = any, TOutput = any> {
  /**
   * Compiles the workflow into an executable graph
   */
  compile(): StateGraph<TState>;
  
  /**
   * Executes the workflow with the given input
   * @param input The input to the workflow
   * @param initialState Optional initial state overrides
   * @returns The output of the workflow
   */
  execute(input: TInput, initialState?: Partial<TState>): Promise<TOutput>;
  
  /**
   * Adds a node to the workflow
   * @param node The node to add
   */
  addNode(node: WorkflowNode<TState, TInput, TOutput>): void;
  
  /**
   * Removes a node from the workflow
   * @param nodeName Name of the node to remove
   * @returns True if the node was removed, false otherwise
   */
  removeNode(nodeName: string): boolean;
  
  /**
   * Gets the current workflow configuration
   */
  getConfig(): WorkflowGraphConfig<TState, TInput, TOutput>;
}
