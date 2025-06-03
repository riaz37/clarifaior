// OAuth and Token Management Types

export type OAuthProvider = "google" | "slack" | "notion" | "github" | string;

export interface OAuthToken {
  id: string;
  userId: string;
  workspaceId: string;
  provider: OAuthProvider;
  providerAccountId: string;
  accessToken: string;
  refreshToken?: string | null;
  tokenType: string;
  scope?: string | null;
  expiresAt?: string | Date | null;
  isActive: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface GmailWatch {
  id: string;
  userId: string;
  workspaceId: string;
  agentId?: string | null;
  emailAddress: string;
  historyId: string;
  expiration: string | Date;
  topicName: string;
  labelIds?: string[] | null;
  query?: string | null;
  isActive: boolean;
  lastProcessedHistoryId?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface IntegrationConnection {
  id: string;
  userId: string;
  workspaceId: string;
  provider: OAuthProvider;
  connectionName: string;
  isActive: boolean;
  config?: Record<string, unknown> | null;
  lastUsed?: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface OAuthInitiateRequest {
  workspaceId: string;
  provider: OAuthProvider;
  state?: string;
  redirectUri?: string;
}

export interface OAuthCallbackData {
  code: string;
  state: string;
  error?: string;
  scope?: string;
  authuser?: string;
  prompt?: string;
}

export interface OAuthConnectionStatus {
  isConnected: boolean;
  hasToken: boolean;
  expiresAt?: string | Date | null;
  scope?: string | null;
  hasRefreshToken: boolean;
  provider?: OAuthProvider;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface GmailWatchRequest {
  userId: string;
  workspaceId: string;
  agentId?: string | null;
  labelIds?: string[];
  query?: string;
  emailAddress: string;
  topicName?: string;
}

export interface GmailPushNotification {
  message: {
    data: string;
    messageId: string;
    publishTime: string;
    attributes?: Record<string, string>;
  };
  subscription: string;
  data: string;
  messageId: string;
  publishTime: string;
  attributes?: Record<string, string>;
  decodedData?: {
    emailAddress: string;
    historyId: string;
    historyIdNumber?: number;
  };
}

export interface OAuthTokenRequest {
  userId: string;
  workspaceId: string;
  provider: OAuthProvider;
  code: string;
  redirectUri: string;
  codeVerifier?: string;
  grantType?: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  id_token?: string;
  created_at?: number;
  expires_at?: number;
}

export interface OAuthUserInfo {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  verified_email?: boolean;
  locale?: string;
  hd?: string; // Google hosted domain
}

export interface GmailMessagePart {
  partId: string;
  mimeType: string;
  filename: string;
  headers: Array<{ name: string; value: string }>;
  body: {
    data?: string;
    size?: number;
    attachmentId?: string;
  };
  parts?: GmailMessagePart[];
}

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  payload?: GmailMessagePart;
  sizeEstimate?: number;
  historyId?: string;
  internalDate?: string;
}

export interface GmailHistoryItem {
  id: string;
  messages?: Array<{ id: string; threadId: string }>;
  messagesAdded?: Array<{
    message: { id: string; threadId: string; labelIds?: string[] };
  }>;
  messagesRemoved?: Array<{
    message: { id: string; threadId: string };
  }>;
  labelsAdded?: Array<{
    message: { id: string; threadId: string; labelIds: string[] };
  }>;
  labelsRemoved?: Array<{
    message: { id: string; threadId: string; labelIds: string[] };
  }>;
}
