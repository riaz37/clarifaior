import { StateGraph, END, StateGraphArgs } from '@langchain/langgraph';
import { BaseMessage, HumanMessage, AIMessage, SystemMessage, FunctionMessage } from '@langchain/core/messages';
import { v4 as uuidv4 } from 'uuid';
import { 
  ConversationState, 
  Message, 
  ConversationTurn, 
  createInitialConversationState, 
  addMessageToState, 
  updateTurnStatus,
  addToShortTermMemory,
  updateMetrics,
  endConversation
} from '../state/conversation-state';

// Define the shape of our conversation state channels
interface ConversationGraphChannels {
  // Core state
  state: ConversationState;
  
  // Message history
  messages: BaseMessage[];
  
  // Agent state
  agentState: Record<string, any>;
  
  // Error handling
  errors: Array<{
    type: string;
    message: string;
    timestamp: number;
    metadata?: Record<string, any>;
  }>;
  
  // Performance metrics
  metrics: {
    startTime: number;
    endTime?: number;
    totalTokens: number;
    averageResponseTime: number;
    totalTurns: number;
  };
}

// Default channel configurations for the conversation graph
const conversationChannels: StateGraphArgs<ConversationGraphChannels>['channels'] = {
  state: {
    value: (x: ConversationState, y: ConversationState) => ({
      ...x,
      ...y,
      context: {
        ...x.context,
        ...y.context,
        updatedAt: Date.now(),
      },
      messages: y.messages || x.messages,
      turns: y.turns || x.turns,
    }),
    default: () => createInitialConversationState('system'),
  },
  messages: {
    value: (x: BaseMessage[] = [], y: BaseMessage[] = []) => [...x, ...y],
    default: () => [],
  },
  agentState: {
    value: (x: Record<string, any> = {}, y: Record<string, any> = {}) => ({
      ...x,
      ...y,
    }),
    default: () => ({}),
  },
  errors: {
    value: (
      x: Array<{type: string; message: string; timestamp: number; metadata?: any}> = [],
      y: Array<{type: string; message: string; timestamp: number; metadata?: any}> = []
    ) => [...x, ...y],
    default: () => [],
  },
  metrics: {
    value: (
      x: { startTime: number; endTime?: number; totalTokens: number; averageResponseTime: number; totalTurns: number },
      y: { startTime?: number; endTime?: number; totalTokens?: number; averageResponseTime?: number; totalTurns?: number }
    ) => ({
      startTime: y.startTime || x.startTime || Date.now(),
      endTime: y.endTime || x.endTime,
      totalTokens: (x.totalTokens || 0) + (y.totalTokens || 0),
      averageResponseTime: y.averageResponseTime !== undefined 
        ? y.averageResponseTime 
        : x.averageResponseTime || 0,
      totalTurns: y.totalTurns !== undefined ? y.totalTurns : x.totalTurns || 0,
    }),
    default: () => ({
      startTime: Date.now(),
      totalTokens: 0,
      averageResponseTime: 0,
      totalTurns: 0,
    }),
  },
};

type NodeHandler = (state: ConversationState) => Promise<Partial<ConversationState>>;

interface ConversationGraphOptions {
  /**
   * Custom node handlers for the conversation flow
   */
  nodes?: Record<string, NodeHandler>;
  
  /**
   * Custom validation for user input
   */
  validateInput?: (input: string) => { isValid: boolean; error?: string };
  
  /**
   * Maximum number of turns before the conversation is automatically ended
   */
  maxTurns?: number;
  
  /**
   * Maximum number of tokens allowed in the conversation context
   */
  maxTokens?: number;
  
  /**
   * Timeout for the conversation in milliseconds
   */
  timeoutMs?: number;
  
  /**
   * Whether to enable automatic summarization of long conversations
   */
  enableSummarization?: boolean;
  
  /**
   * Callback when the conversation ends
   */
  onConversationEnd?: (state: ConversationState) => void;
  
  /**
   * Callback when an error occurs
   */
  onError?: (error: Error, state: ConversationState) => void;
}

/**
 * ConversationGraph manages the flow of a conversation using a state machine
 */
export class ConversationGraph {
  private graph: StateGraph<ConversationGraphChannels>;
  private options: Required<ConversationGraphOptions>;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  constructor(options: ConversationGraphOptions = {}) {
    this.options = {
      nodes: {},
      validateInput: () => ({ isValid: true }),
      maxTurns: 20,
      maxTokens: 4000,
      timeoutMs: 30000,
      enableSummarization: true,
      onConversationEnd: () => {},
      onError: (error) => console.error('Conversation error:', error),
      ...options,
    };

    this.graph = new StateGraph<ConversationGraphChannels>({
      channels: conversationChannels,
    });
  }

  /**
   * Initialize the conversation graph with default nodes and edges
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
        // Add default nodes
        this.addNode('start', this.handleStart.bind(this));
        this.addNode('processInput', this.handleProcessInput.bind(this));
        this.addNode('generateResponse', this.handleGenerateResponse.bind(this));
        this.addNode('end', this.handleEnd.bind(this));
        this.addNode('error', this.handleError.bind(this));

        // Add custom nodes
        for (const [name, handler] of Object.entries(this.options.nodes)) {
          this.addNode(name, handler);
        }

        // Define the conversation flow
        this.graph.addEdge('start', 'processInput');
        this.graph.addEdge('processInput', 'generateResponse');
        this.graph.addEdge('generateResponse', 'end');
        
        // Error handling edges
        this.graph.addEdge('processInput', 'error');
        this.graph.addEdge('generateResponse', 'error');
        
        // Set entry and end points
        this.graph.setEntryPoint('start');
        this.graph.setFinishPoint('end');
        this.graph.setFinishPoint('error');
        
        this.isInitialized = true;
      } catch (error) {
        console.error('Failed to initialize conversation graph:', error);
        throw error;
      }
    })();

    return this.initializationPromise;
  }

  /**
   * Add a node to the conversation graph
   */
  private addNode(name: string, handler: NodeHandler): void {
    this.graph.addNode(name, async (state) => {
      try {
        const result = await handler(state.state);
        return {
          state: {
            ...state.state,
            ...result,
            context: {
              ...state.state.context,
              updatedAt: Date.now(),
            },
          },
        };
      } catch (error) {
        return this.handleNodeError(name, error, state.state);
      }
    });
  }

  /**
   * Handle errors that occur in node handlers
   */
  private handleNodeError(
    nodeName: string, 
    error: unknown, 
    state: ConversationState
  ): Partial<ConversationGraphChannels> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorId = `err_${Date.now()}`;
    
    if (this.options.onError) {
      try {
        this.options.onError(error instanceof Error ? error : new Error(errorMessage), state);
      } catch (handlerError) {
        console.error('Error in onError handler:', handlerError);
      }
    }
    
    return {
      state: {
        ...state,
        error: {
          message: errorMessage,
          code: 'NODE_ERROR',
          timestamp: Date.now(),
          metadata: {
            node: nodeName,
            errorId,
          },
        },
      },
      errors: [{
        type: 'node_error',
        message: errorMessage,
        timestamp: Date.now(),
        metadata: {
          node: nodeName,
          errorId,
        },
      }],
    };
  }

  /**
   * Start a new conversation
   */
  private async handleStart(state: ConversationState): Promise<Partial<ConversationState>> {
    // Initialize a new conversation if needed
    if (!state.context?.conversationId) {
      return createInitialConversationState(
        state.context?.userId || 'anonymous',
        state.messages[0]?.content,
        state.context?.metadata
      );
    }
    
    return {};
  }

  /**
   * Process user input
   */
  private async handleProcessInput(state: ConversationState): Promise<Partial<ConversationState>> {
    const lastMessage = state.messages[state.messages.length - 1];
    
    // Skip if no new user message
    if (!lastMessage || lastMessage.role !== 'user') {
      return { isPaused: true };
    }
    
    // Validate input
    const validation = this.options.validateInput(lastMessage.content);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid input');
    }
    
    // Update turn status
    return updateTurnStatus(
      state,
      state.currentTurnId!,
      'processing',
      { processedAt: new Date().toISOString() }
    );
  }

  /**
   * Generate a response to the user
   */
  private async handleGenerateResponse(state: ConversationState): Promise<Partial<ConversationState>> {
    // In a real implementation, this would call an LLM or other logic to generate a response
    // For now, we'll just echo the last message
    const lastMessage = state.messages[state.messages.length - 1];
    
    if (lastMessage.role !== 'user') {
      throw new Error('No user message to respond to');
    }
    
    const response: Message = {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: `You said: ${lastMessage.content}`,
      timestamp: Date.now(),
    };
    
    // Add the response to the conversation
    return addMessageToState(state, response);
  }

  /**
   * End the conversation
   */
  private async handleEnd(state: ConversationState): Promise<Partial<ConversationState>> {
    // Call the onConversationEnd callback if provided
    if (this.options.onConversationEnd) {
      try {
        await this.options.onConversationEnd(state);
      } catch (error) {
        console.error('Error in onConversationEnd callback:', error);
      }
    }
    
    // Mark the conversation as inactive
    return endConversation(state);
  }

  /**
   * Handle errors in the conversation
   */
  private async handleError(state: ConversationState): Promise<Partial<ConversationState>> {
    // Log the error and end the conversation
    console.error('Conversation error:', state.error);
    return endConversation({
      ...state,
      isActive: false,
    });
  }

  /**
   * Process a user message in the conversation
   */
  public async processMessage(
    message: string, 
    userId: string,
    conversationId?: string,
    metadata: Record<string, any> = {}
  ): Promise<ConversationState> {
    await this.initialize();
    
    // Create or update the conversation state
    const initialState: ConversationState = conversationId
      ? {
          ...createInitialConversationState(userId, message, metadata),
          context: {
            ...createInitialConversationState(userId, message, metadata).context,
            conversationId,
          },
        }
      : createInitialConversationState(userId, message, metadata);
    
    // Add the user message to the state
    const stateWithMessage = addMessageToState(initialState, {
      role: 'user',
      content: message,
      metadata,
    });
    
    try {
      // Compile and run the graph
      const runnable = this.graph.compile();
      const result = await runnable.invoke({
        state: stateWithMessage,
        messages: [],
        agentState: {},
        errors: [],
        metrics: {
          startTime: Date.now(),
          totalTokens: 0,
          averageResponseTime: 0,
          totalTurns: 1,
        },
      });
      
      return result.state;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error processing message:', error);
      
      return {
        ...stateWithMessage,
        error: {
          message: errorMessage,
          code: 'PROCESSING_ERROR',
          timestamp: Date.now(),
        },
        isActive: false,
      };
    }
  }
  
  /**
   * End the current conversation
   */
  public async endConversation(conversationId: string): Promise<boolean> {
    // In a real implementation, you would update the conversation state in your database
    // to mark it as ended
    return true;
  }
  
  /**
   * Get the current state of the conversation
   */
  public async getConversationState(conversationId: string): Promise<ConversationState | null> {
    // In a real implementation, you would fetch this from your database
    return null;
  }
}

export default ConversationGraph;