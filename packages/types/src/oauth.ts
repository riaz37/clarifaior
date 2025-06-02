// OAuth and Token Management Types

export interface OAuthToken {
  id: number;
  userId: number;
  workspaceId: number;
  provider: 'google' | 'slack' | 'notion' | 'github';
  providerAccountId?: string;
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  scope?: string;
  expiresAt?: string;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface GmailWatch {
  id: number;
  userId: number;
  workspaceId: number;
  agentId?: number;
  emailAddress: string;
  historyId: string;
  expiration: string;
  topicName: string;
  labelIds?: string[];
  query?: string;
  isActive: boolean;
  lastProcessedHistoryId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationConnection {
  id: number;
  userId: number;
  workspaceId: number;
  provider: string;
  connectionName: string;
  isActive: boolean;
  config?: Record<string, any>;
  lastUsed?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OAuthInitiateRequest {
  workspaceId: number;
  provider: 'google' | 'slack' | 'notion';
  state?: string;
}

export interface OAuthCallbackData {
  code: string;
  state: string;
  error?: string;
}

export interface OAuthConnectionStatus {
  hasToken: boolean;
  expiresAt?: string;
  scope?: string;
  hasRefreshToken: boolean;
  error?: string;
}

export interface GmailWatchRequest {
  workspaceId: number;
  agentId?: number;
  labelIds?: string[];
  query?: string;
}

export interface GmailPushNotification {
  message: {
    data: string;
    messageId: string;
    publishTime: string;
  };
  subscription: string;
}
