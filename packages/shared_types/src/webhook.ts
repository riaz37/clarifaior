// Webhook System Types

export type WebhookStatus = "active" | "inactive" | "failed";

export interface Webhook {
  id: string;
  agentId: string;
  createdBy: string;
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
  id: string;
  webhookId: string;
  method: string;
  headers?: Record<string, string>;
  body?: any;
  query?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  executionId?: string;
  error?: string;
  responseTime?: number;
  createdAt: string;
}

export interface CreateWebhookRequest {
  agentId: string;
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
  webhookId: string;
  testData: any;
}
