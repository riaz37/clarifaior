// Main entry point for the AI package
export * from './orchestrator/workflow-orchestrator';

// Export providers
export * from './providers/base.provider';
export * from './providers/deepseek.provider';
export * from './providers/openai.provider';
export * from './providers/provider.factory';

// Export agent types
export * from './agents/base/agent.interface';
export * from './agents/base/base-agent';

// Export state types
export * from './state/workflow-state';

// Export templates
export * from './templates/base/template.interface';
export * from './templates/workflow/workflow-creation.template';

// Export types
export type { 
  LLMConfig, 
  LLMResponse, 
  EmbeddingResponse, 
  StreamingResponse 
} from './providers/base.provider';

export type {
  AgentConfig,
  AgentInput,
  AgentOutput,
  AgentExecution,
  AgentStep
} from './agents/base/agent.interface';

export type {
  WorkflowOrchestratorConfig,
  WorkflowRequest,
  Integration,
  UserContext,
  WorkflowDesign
} from './orchestrator/workflow-orchestrator';