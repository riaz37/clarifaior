// Integration interfaces
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

export interface MemorySearchRequest {
  query: string;
  topK: number;
  threshold: number;
}

export interface SlackMessageRequest {
  channel: string;
  message: string;
  threadReply?: string; // Timestamp of the thread to reply to
}

export interface NotionPageRequest {
  database: string;
  title: string;
  properties: Record<string, any>;
}

export interface EmailRequest {
  to: string;
  subject: string;
  body: string;
  html?: boolean;
}

export interface WebhookRequest {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: any;
}
