// Integration Types
export type IntegrationType =
  | "gmail"
  | "slack"
  | "notion"
  | "webhook"
  | "openai"
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
