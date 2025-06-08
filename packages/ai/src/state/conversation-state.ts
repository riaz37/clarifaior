import { BaseMessage } from '@langchain/core/messages';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'function';
  content: string;
  timestamp: number;
  metadata?: Record<string, any>;
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
}

export interface ConversationTurn {
  id: string;
  userMessage: Message;
  assistantMessage?: Message;
  timestamp: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  metadata?: Record<string, any>;
}

export interface ConversationContext {
  conversationId: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, any>;
}

export interface ConversationState {
  // Core conversation state
  context: ConversationContext;
  messages: Message[];
  turns: ConversationTurn[];
  currentTurnId?: string;
  
  // Conversation metadata
  title?: string;
  tags?: string[];
  
  // Agent state
  agentState?: Record<string, any>;
  
  // Conversation controls
  isActive: boolean;
  isPaused: boolean;
  
  // Error handling
  error?: {
    message: string;
    code?: string;
    timestamp: number;
    metadata?: Record<string, any>;
  };
  
  // Performance metrics
  metrics: {
    totalTurns: number;
    averageResponseTime: number;
    totalTokens: number;
    startTime: number;
    endTime?: number;
  };
  
  // Memory and context
  shortTermMemory: any[];
  longTermMemory?: any;
  
  // Conversation settings
  settings: {
    maxTurns?: number;
    maxTokens?: number;
    timeoutMs?: number;
    temperature?: number;
    modelName?: string;
  };
}

// Helper functions
export function createInitialConversationState(
  userId: string, 
  initialMessage?: string,
  metadata?: Record<string, any>
): ConversationState {
  const now = Date.now();
  const conversationId = `conv_${now}_${Math.random().toString(36).substr(2, 9)}`;
  
  const initialState: ConversationState = {
    context: {
      conversationId,
      userId,
      createdAt: now,
      updatedAt: now,
      metadata: metadata || {},
    },
    messages: [],
    turns: [],
    isActive: true,
    isPaused: false,
    metrics: {
      totalTurns: 0,
      averageResponseTime: 0,
      totalTokens: 0,
      startTime: now,
    },
    shortTermMemory: [],
    settings: {
      maxTurns: 20,
      maxTokens: 4000,
      timeoutMs: 30000,
      temperature: 0.7,
      modelName: 'gpt-4',
    },
  };
  
  if (initialMessage) {
    const message: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: initialMessage,
      timestamp: now,
    };
    
    initialState.messages.push(message);
    
    const turn: ConversationTurn = {
      id: `turn_${Date.now()}`,
      userMessage: message,
      timestamp: now,
      status: 'pending',
    };
    
    initialState.turns.push(turn);
    initialState.currentTurnId = turn.id;
    initialState.metrics.totalTurns = 1;
  }
  
  return initialState;
}

export function addMessageToState(
  state: ConversationState,
  message: Omit<Message, 'id' | 'timestamp'>
): ConversationState {
  const newMessage: Message = {
    ...message,
    id: `msg_${Date.now()}`,
    timestamp: Date.now(),
  };
  
  const updatedState = {
    ...state,
    messages: [...state.messages, newMessage],
    context: {
      ...state.context,
      updatedAt: Date.now(),
    },
  };
  
  // If this is a user message, create a new turn
  if (message.role === 'user') {
    const newTurn: ConversationTurn = {
      id: `turn_${Date.now()}`,
      userMessage: newMessage,
      timestamp: newMessage.timestamp,
      status: 'pending',
    };
    
    updatedState.turns = [...state.turns, newTurn];
    updatedState.currentTurnId = newTurn.id;
    updatedState.metrics.totalTurns = state.metrics.totalTurns + 1;
  } 
  // If this is an assistant message, update the current turn
  else if (message.role === 'assistant' && state.currentTurnId) {
    const turnIndex = updatedState.turns.findIndex(t => t.id === state.currentTurnId);
    if (turnIndex !== -1) {
      const updatedTurns = [...updatedState.turns];
      updatedTurns[turnIndex] = {
        ...updatedTurns[turnIndex],
        assistantMessage: newMessage,
        status: 'completed',
      };
      updatedState.turns = updatedTurns;
    }
  }
  
  return updatedState;
}

export function updateTurnStatus(
  state: ConversationState,
  turnId: string,
  status: ConversationTurn['status'],
  metadata?: Record<string, any>
): ConversationState {
  const turnIndex = state.turns.findIndex(t => t.id === turnId);
  if (turnIndex === -1) return state;
  
  const updatedTurns = [...state.turns];
  updatedTurns[turnIndex] = {
    ...updatedTurns[turnIndex],
    status,
    metadata: {
      ...updatedTurns[turnIndex].metadata,
      ...metadata,
    },
  };
  
  return {
    ...state,
    turns: updatedTurns,
  };
}

export function addToShortTermMemory(
  state: ConversationState,
  memory: any
): ConversationState {
  return {
    ...state,
    shortTermMemory: [...state.shortTermMemory, memory],
  };
}

export function updateMetrics(
  state: ConversationState,
  updates: Partial<ConversationState['metrics']>
): ConversationState {
  return {
    ...state,
    metrics: {
      ...state.metrics,
      ...updates,
    },
  };
}

export function updateSettings(
  state: ConversationState,
  updates: Partial<ConversationState['settings']>
): ConversationState {
  return {
    ...state,
    settings: {
      ...state.settings,
      ...updates,
    },
  };
}

export function endConversation(state: ConversationState): ConversationState {
  return {
    ...state,
    isActive: false,
    metrics: {
      ...state.metrics,
      endTime: Date.now(),
    },
  };
}
