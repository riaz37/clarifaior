// Webhook System Types

export type WebhookStatus = 'active' | 'inactive' | 'failed';

export interface Webhook {
  id: number;
  agentId: number;
  createdBy: number;
  name: string;
  endpoint: string;
  url: string;
  secret: string;
  status: WebhookStatus;
  lastTriggered?: string;
  triggerCount: number;
  config?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookLog {
  id: number;
  webhookId: number;
  method: string;
  headers?: Record<string, string>;
  body?: any;
  query?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  executionId?: number;
  error?: string;
  responseTime?: number;
  createdAt: string;
}

export interface CreateWebhookRequest {
  agentId: number;
  name: string;
  config?: Record<string, any>;
}

export interface WebhookTriggerData {
  method: string;
  headers: Record<string, string>;
  body: any;
  query: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface WebhookTriggerResponse {
  success: boolean;
  executionId?: number;
  message: string;
}

export interface WebhookTestRequest {
  webhookId: number;
  testData: any;
}
