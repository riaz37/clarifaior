// Missing types for the conversation state system

// Base LangChain message type (if not importing from @langchain/core)
export interface BaseMessage {
  content: string;
  name?: string;
  additional_kwargs?: Record<string, any>;
}

// Workflow execution types
export interface WorkflowStep {
  id: string;
  name: string;
  type: "trigger" | "action" | "condition" | "delay" | "transform";
  config: Record<string, any>;
  position: { x: number; y: number };
  connections: {
    input?: string[];
    output?: string[];
  };
  status?: "pending" | "running" | "completed" | "failed" | "skipped";
  executionTime?: number;
  error?: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  version: string;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  variables: WorkflowVariable[];
  settings: WorkflowSettings;
  metadata?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  status: "draft" | "active" | "paused" | "archived";
}

export interface WorkflowTrigger {
  id: string;
  type: "webhook" | "schedule" | "email" | "api" | "manual" | "integration";
  config: Record<string, any>;
  enabled: boolean;
  conditions?: TriggerCondition[];
}

export interface TriggerCondition {
  field: string;
  operator: "equals" | "contains" | "greater_than" | "less_than" | "regex";
  value: any;
  logicalOperator?: "AND" | "OR";
}

export interface WorkflowVariable {
  id: string;
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  value?: any;
  defaultValue?: any;
  required: boolean;
  description?: string;
  scope: "global" | "step" | "execution";
}

export interface WorkflowSettings {
  maxExecutionTime?: number;
  retryPolicy?: {
    maxRetries: number;
    backoffStrategy: "linear" | "exponential";
    initialDelay: number;
  };
  errorHandling?: {
    strategy: "stop" | "continue" | "rollback";
    notifyOnError: boolean;
    errorWebhook?: string;
  };
  logging?: {
    level: "none" | "basic" | "detailed";
    retention: number; // days
  };
}

// Integration types
export interface Integration {
  id: string;
  name: string;
  type: string;
  provider: string;
  config: IntegrationConfig;
  status: "connected" | "disconnected" | "error" | "pending";
  capabilities: string[];
  rateLimit?: {
    requests: number;
    window: number; // seconds
    remaining: number;
  };
  lastUsed?: number;
  createdAt: number;
  updatedAt: number;
}

export interface IntegrationConfig {
  apiKey?: string;
  baseUrl?: string;
  version?: string;
  timeout?: number;
  headers?: Record<string, string>;
  authentication?: {
    type: "api_key" | "oauth" | "basic" | "bearer";
    credentials: Record<string, any>;
  };
  customFields?: Record<string, any>;
}

// Intent and entity types for NLP
export interface Intent {
  name: string;
  confidence: number;
  parameters?: Record<string, any>;
  examples?: string[];
}

export interface Entity {
  name: string;
  value: any;
  confidence: number;
  start?: number;
  end?: number;
  metadata?: Record<string, any>;
}

export interface NLPResult {
  intent?: Intent;
  entities: Entity[];
  confidence: number;
  processedText: string;
  metadata?: Record<string, any>;
}

// Execution types
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  startTime: number;
  endTime?: number;
  duration?: number;
  triggeredBy: {
    type: "manual" | "schedule" | "webhook" | "api";
    userId?: string;
    metadata?: Record<string, any>;
  };
  steps: StepExecution[];
  variables: Record<string, any>;
  error?: ExecutionError;
  logs: ExecutionLog[];
  metrics: ExecutionMetrics;
}

export interface StepExecution {
  stepId: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  startTime?: number;
  endTime?: number;
  duration?: number;
  input?: any;
  output?: any;
  error?: string;
  retryCount?: number;
  logs: string[];
}

export interface ExecutionError {
  code: string;
  message: string;
  stepId?: string;
  stack?: string;
  metadata?: Record<string, any>;
  recoverable: boolean;
}

export interface ExecutionLog {
  id: string;
  timestamp: number;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  stepId?: string;
  metadata?: Record<string, any>;
}

export interface ExecutionMetrics {
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  skippedSteps: number;
  totalTime: number;
  apiCallsUsed: number;
  resourcesConsumed: {
    memory?: number;
    cpu?: number;
    storage?: number;
  };
}

// User and workspace types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: "owner" | "admin" | "member" | "viewer";
  permissions: Permission[];
  preferences: UserPreferences;
  createdAt: number;
  updatedAt: number;
  lastActiveAt?: number;
}

export interface Permission {
  resource: string;
  actions: string[];
  conditions?: Record<string, any>;
}

export interface UserPreferences {
  theme: "light" | "dark" | "auto";
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    workflow: boolean;
    security: boolean;
  };
  defaultSettings: {
    workflowTimeout: number;
    autoSave: boolean;
    verboseLogging: boolean;
  };
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  plan: "free" | "pro" | "enterprise";
  limits: WorkspaceLimits;
  settings: WorkspaceSettings;
  members: WorkspaceMember[];
  integrations: string[]; // Integration IDs
  createdAt: number;
  updatedAt: number;
  ownerId: string;
}

export interface WorkspaceLimits {
  maxWorkflows: number;
  maxExecutions: number;
  maxIntegrations: number;
  maxMembers: number;
  storageLimit: number; // bytes
  apiCallsPerMonth: number;
}

export interface WorkspaceSettings {
  allowPublicWorkflows: boolean;
  requireApprovalForIntegrations: boolean;
  auditLogRetention: number; // days
  allowExternalSharing: boolean;
  ssoEnabled: boolean;
  ssoProvider?: string;
}

export interface WorkspaceMember {
  userId: string;
  role: "owner" | "admin" | "member" | "viewer";
  joinedAt: number;
  invitedBy?: string;
  permissions?: Permission[];
}

// Validation types
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions?: string[];
  score?: number; // 0-100
}

export interface ValidationError {
  code: string;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  field?: string;
  stepId?: string;
  metadata?: Record<string, any>;
}

export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
  stepId?: string;
  suggestion?: string;
  metadata?: Record<string, any>;
}

// Security types
export interface SecurityContext {
  userId: string;
  workspaceId: string;
  permissions: Permission[];
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  tokenExpiresAt?: number;
  mfaVerified?: boolean;
}

export interface AuditLog {
  id: string;
  userId: string;
  workspaceId: string;
  action: string;
  resource: string;
  resourceId?: string;
  timestamp: number;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  result: "success" | "failure";
  error?: string;
}

// API types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  metadata?: Record<string, any>;
}

export interface APIError {
  code: string;
  message: string;
  statusCode: number;
  details?: any;
  timestamp: number;
  requestId?: string;
}

// Queue and job types
export interface QueueJob {
  id: string;
  type: string;
  data: any;
  priority: number;
  delay?: number;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  processedAt?: number;
  completedAt?: number;
  failedAt?: number;
  error?: string;
  progress?: number;
}

// WebSocket message types
export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
  id?: string;
  userId?: string;
  workspaceId?: string;
}

// File upload types
export interface FileUpload {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  url?: string;
  uploadedBy: string;
  uploadedAt: number;
  metadata?: Record<string, any>;
}

// Notification types
export interface Notification {
  id: string;
  userId: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  actionText?: string;
  createdAt: number;
  expiresAt?: number;
  metadata?: Record<string, any>;
}

// Analytics types
export interface AnalyticsEvent {
  id: string;
  userId: string;
  workspaceId: string;
  event: string;
  properties: Record<string, any>;
  timestamp: number;
  sessionId?: string;
  source: string;
}

export interface AnalyticsReport {
  id: string;
  name: string;
  type: "workflow" | "user" | "integration" | "execution";
  filters: Record<string, any>;
  dateRange: {
    start: number;
    end: number;
  };
  data: any[];
  generatedAt: number;
  generatedBy: string;
}
