// Integration Types
export type IntegrationType =
  | "deepseek"
  | "gemini"
  | "openai"
  | "anthropic"
  | "gmail"
  | "slack"
  | "notion"
  | "webhook"
  | "pinecone"
  | "langfuse";

export interface Integration {
  id: number;
  name: string;
  type: IntegrationType;
  workspaceId: number;
  createdBy: number;
  isActive: boolean;
  config: Record<string, any>;
  metadata?: Record<string, any>;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationCredentials {
  id: number;
  integrationId: number;
  userId: number;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIntegrationRequest {
  name: string;
  type: IntegrationType;
  config: Record<string, any>;
}

export interface UpdateIntegrationRequest {
  name?: string;
  isActive?: boolean;
  config?: Record<string, any>;
}

export interface TestIntegrationResponse {
  success: boolean;
  message: string;
  data?: Record<string, any>;
}

// LLM Integration Types
export interface LLMRequest {
  prompt: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  response: string;
  model: string;
  tokensUsed: number;
  cost: number;
}

// Slack Integration Types
export interface SlackMessageRequest {
  channel: string;
  message: string;
  threadReply?: string;
}

export interface SlackMessageResponse {
  messageId: string;
  timestamp: number; // Number representation of Slack timestamp (e.g., 1234567890.123456)
  channel: string;
  permalink: string;
}

// Gmail Integration Types
export interface EmailRequest {
  to: string;
  subject: string;
  body: string;
  html?: boolean;
}

// Notion Integration Types
export interface NotionPageRequest {
  database: string;
  title: string;
  properties: Record<string, any>;
}

// Memory/Vector Search Types
export interface MemorySearchRequest {
  query: string;
  topK: number;
  threshold: number;
}

export interface MemorySearchResult {
  id: string;
  score: number;
  content: string;
  metadata: Record<string, any>;
}

// Integration Status Types
export interface IntegrationStatus {
  service: string;
  connected: boolean;
  configured: boolean;
  message?: string;
}
