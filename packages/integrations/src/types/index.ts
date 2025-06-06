// Base Types
export interface OAuth2Credentials {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
  tokenType?: string;
  scope?: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
}

// Slack Types
export interface SlackCredentials extends OAuth2Credentials {
  botToken: string;
  userToken?: string;
  webhookUrl?: string;
  appId?: string;
  teamId?: string;
  teamName?: string;
  botUserId?: string;
  signingSecret?: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
}

export interface SlackMessage {
  channel: string;
  text: string;
  username?: string;
  iconEmoji?: string;
  threadTs?: string;
  blocks?: any[];
  attachments?: any[];
}

export interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  is_im?: boolean;
  user?: string;
  is_member?: boolean;
}

// Gmail Types
export interface GmailCredentials extends OAuth2Credentials {
  clientId: string;
  clientSecret: string;
  email?: string;
  redirectUri?: string;
}

export interface EmailMessage {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  from?: string;
  senderName?: string;
  subject: string;
  body?: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType: string;
  }>;
  threadId?: string;
  references?: string[];
  inReplyTo?: string;
  headers?: Record<string, string>;
  replyTo?: string;
  inReplyToMessageId?: string;
}

export interface EmailFilter {
  from?: string;
  to?: string;
  subject?: string;
  hasAttachment?: boolean;
  newerThan?: Date;
  olderThan?: Date;
  labelIds?: string[];
  query?: string;
  maxResults?: number;
  pageToken?: string;
  includeSpamTrash?: boolean;
  includeThreads?: boolean;
  threadId?: string;
  messageId?: string;
  category?: 'primary' | 'social' | 'promotions' | 'updates' | 'forums' | 'reservations' | 'purchases';
}

export interface EmailLabel {
  id: string;
  name: string;
  type: 'system' | 'user';
  color?: {
    backgroundColor: string;
    textColor: string;
  };
  messageListVisibility?: 'show' | 'hide';
  labelListVisibility?: 'labelShow' | 'labelShowIfUnread' | 'labelHide';
}

// Notion Types
export interface NotionCredentials {
  token: string;
  botId?: string;
  workspaceName?: string;
}

export interface NotionPage {
  parent: { database_id: string };
  properties: Record<string, any>;
  children?: any[];
  icon?: { type: 'emoji'; emoji: string } | { type: 'external'; external: { url: string } };
  cover?: { type: 'external'; external: { url: string } };
}

// Integration Core Types
export type IntegrationType = 'slack' | 'gmail' | 'notion' | 'discord' | 'trello' | 'google-calendar' | 'github';

export interface IntegrationAction {
  type: string;
  params: any;
}

export interface IntegrationConfig {
  id: string;
  type: IntegrationType;
  name: string;
  credentials: Record<string, any>;
  settings?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  workspaceId: string;
  isActive: boolean;
}

export interface IntegrationEvent {
  type: string;
  payload: any;
  timestamp: Date;
  integrationId: string;
  userId: string;
  workspaceId: string;
}

export interface WebhookConfig {
  id: string;
  integrationId: string;
  targetUrl: string;
  events: string[];
  secret?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RateLimitConfig {
  enabled: boolean;
  maxRequests: number;
  interval: number; // in milliseconds
}

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number; // in milliseconds
  maxDelay: number; // in milliseconds
  factor: number;
}

export interface IntegrationStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  lastRequestAt?: Date;
  rateLimited: boolean;
  rateLimitResetAt?: Date;
}