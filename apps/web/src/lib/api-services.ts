import { api } from "./api-client";
import {
  Agent,
  AgentExecution,
  CreateAgentRequest,
  UpdateAgentRequest,
  ExecutionStatus,
  TriggerType,
  Integration,
  Trigger,
  User,
  Workspace,
} from "@repo/types";

// Agent Service
export class AgentService {
  // Get all agents for current workspace
  static async getAgents(workspaceId?: string): Promise<Agent[]> {
    const params = workspaceId ? { workspaceId } : {};
    const response = await api.get<Agent[]>("/agents", { params });
    return response.data;
  }

  // Get single agent by ID
  static async getAgent(id: string): Promise<Agent> {
    const response = await api.get<Agent>(`/agents/${id}`);
    return response.data;
  }

  // Create new agent
  static async createAgent(agentData: CreateAgentRequest): Promise<Agent> {
    const response = await api.post<Agent>("/agents", agentData);
    return response.data;
  }

  // Update agent
  static async updateAgent(
    id: string,
    agentData: UpdateAgentRequest,
  ): Promise<Agent> {
    const response = await api.put<Agent>(`/agents/${id}`, agentData);
    return response.data;
  }

  // Delete agent
  static async deleteAgent(id: string): Promise<void> {
    await api.delete(`/agents/${id}`);
  }

  // Deploy agent
  static async deployAgent(id: string): Promise<Agent> {
    const response = await api.post<Agent>(`/agents/${id}/deploy`);
    return response.data;
  }

  // Pause agent
  static async pauseAgent(id: string): Promise<Agent> {
    const response = await api.post<Agent>(`/agents/${id}/pause`);
    return response.data;
  }

  // Execute agent manually
  static async executeAgent(
    id: string,
    triggerData?: any,
  ): Promise<AgentExecution> {
    const response = await api.post<AgentExecution>(`/agents/${id}/execute`, {
      triggerData,
    });
    return response.data;
  }

  // Get agent statistics
  static async getAgentStats(id: string): Promise<{
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageDuration: number;
    totalCost: number;
  }> {
    const response = await api.get(`/agents/${id}/stats`);
    return response.data;
  }
}

// Execution Service
export class ExecutionService {
  // Get executions with filtering
  static async getExecutions(params?: {
    agentId?: string;
    status?: ExecutionStatus;
    triggerType?: TriggerType;
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    executions: AgentExecution[];
    total: number;
    hasMore: boolean;
  }> {
    const response = await api.get("/executions", { params });
    return response.data;
  }

  // Get single execution details
  static async getExecution(id: string): Promise<AgentExecution> {
    const response = await api.get<AgentExecution>(`/executions/${id}`);
    return response.data;
  }

  // Cancel running execution
  static async cancelExecution(id: string): Promise<AgentExecution> {
    const response = await api.post<AgentExecution>(`/executions/${id}/cancel`);
    return response.data;
  }

  // Retry failed execution
  static async retryExecution(id: string): Promise<AgentExecution> {
    const response = await api.post<AgentExecution>(`/executions/${id}/retry`);
    return response.data;
  }

  // Get execution logs
  static async getExecutionLogs(id: string): Promise<{
    logs: Array<{
      timestamp: string;
      level: "info" | "warn" | "error";
      message: string;
      nodeId?: string;
    }>;
  }> {
    const response = await api.get(`/executions/${id}/logs`);
    return response.data;
  }

  // Get execution metrics
  static async getExecutionMetrics(params?: {
    agentId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageDuration: number;
    totalCost: number;
    totalTokens: number;
    successRate: number;
  }> {
    const response = await api.get("/executions/metrics", { params });
    return response.data;
  }
}

// Integration Service
export class IntegrationService {
  // Get all integrations
  static async getIntegrations(): Promise<Integration[]> {
    const response = await api.get<Integration[]>("/integrations");
    return response.data;
  }

  // Get single integration
  static async getIntegration(id: string): Promise<Integration> {
    const response = await api.get<Integration>(`/integrations/${id}`);
    return response.data;
  }

  // Connect integration
  static async connectIntegration(
    type: string,
    config: any,
  ): Promise<Integration> {
    const response = await api.post<Integration>("/integrations", {
      type,
      config,
    });
    return response.data;
  }

  // Update integration config
  static async updateIntegration(
    id: string,
    config: any,
  ): Promise<Integration> {
    const response = await api.put<Integration>(`/integrations/${id}`, {
      config,
    });
    return response.data;
  }

  // Disconnect integration
  static async disconnectIntegration(id: string): Promise<void> {
    await api.delete(`/integrations/${id}`);
  }

  // Test integration connection
  static async testIntegration(id: string): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    const response = await api.post(`/integrations/${id}/test`);
    return response.data;
  }

  // Get OAuth URL for integration
  static async getOAuthUrl(type: string): Promise<{
    url: string;
    state: string;
  }> {
    const response = await api.get(`/integrations/${type}/oauth-url`);
    return response.data;
  }

  // Handle OAuth callback
  static async handleOAuthCallback(
    type: string,
    code: string,
    state: string,
  ): Promise<Integration> {
    const response = await api.post<Integration>(
      `/integrations/${type}/oauth-callback`,
      {
        code,
        state,
      },
    );
    return response.data;
  }
}

// Trigger Service
export class TriggerService {
  // Get all triggers
  static async getTriggers(agentId?: string): Promise<Trigger[]> {
    const params = agentId ? { agentId } : {};
    const response = await api.get<Trigger[]>("/triggers", { params });
    return response.data;
  }

  // Get single trigger
  static async getTrigger(id: string): Promise<Trigger> {
    const response = await api.get<Trigger>(`/triggers/${id}`);
    return response.data;
  }

  // Create trigger
  static async createTrigger(triggerData: {
    agentId: string;
    type: TriggerType;
    name: string;
    config: any;
  }): Promise<Trigger> {
    const response = await api.post<Trigger>("/triggers", triggerData);
    return response.data;
  }

  // Update trigger
  static async updateTrigger(
    id: string,
    triggerData: {
      name?: string;
      config?: any;
      isActive?: boolean;
    },
  ): Promise<Trigger> {
    const response = await api.put<Trigger>(`/triggers/${id}`, triggerData);
    return response.data;
  }

  // Delete trigger
  static async deleteTrigger(id: string): Promise<void> {
    await api.delete(`/triggers/${id}`);
  }

  // Activate/deactivate trigger
  static async toggleTrigger(id: string, isActive: boolean): Promise<Trigger> {
    const response = await api.patch<Trigger>(`/triggers/${id}`, { isActive });
    return response.data;
  }

  // Test trigger
  static async testTrigger(id: string): Promise<{
    success: boolean;
    message: string;
    executionId?: string;
  }> {
    const response = await api.post(`/triggers/${id}/test`);
    return response.data;
  }
}

// User Service
export class UserService {
  // Get current user profile
  static async getProfile(): Promise<User> {
    const response = await api.get<User>("/user/profile");
    return response.data;
  }

  // Update user profile
  static async updateProfile(userData: {
    name?: string;
    email?: string;
    avatar?: string;
  }): Promise<User> {
    const response = await api.put<User>("/user/profile", userData);
    return response.data;
  }

  // Get user workspaces
  static async getWorkspaces(): Promise<Workspace[]> {
    const response = await api.get<Workspace[]>("/user/workspaces");
    return response.data;
  }

  // Create workspace
  static async createWorkspace(workspaceData: {
    name: string;
    description?: string;
  }): Promise<Workspace> {
    const response = await api.post<Workspace>("/workspaces", workspaceData);
    return response.data;
  }

  // Switch workspace
  static async switchWorkspace(workspaceId: string): Promise<void> {
    await api.post("/user/switch-workspace", { workspaceId });
  }
}

// WebSocket Service for real-time updates
export class WebSocketService {
  private static instance: WebSocketService;
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  connect(): void {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";
    const token = localStorage.getItem("clarifaior_access_token");

    if (!token) {
      console.warn("No auth token for WebSocket connection");
      return;
    }

    this.ws = new WebSocket(`${wsUrl}?token=${token}`);

    this.ws.onopen = () => {
      console.log("WebSocket connected");
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error("WebSocket message parse error:", error);
      }
    };

    this.ws.onclose = () => {
      console.log("WebSocket disconnected");
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }

  private handleMessage(data: { type: string; payload: any }): void {
    const listeners = this.listeners.get(data.type);
    if (listeners) {
      listeners.forEach((listener) => listener(data.payload));
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000;

      setTimeout(() => {
        console.log(
          `Attempting WebSocket reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
        );
        this.connect();
      }, delay);
    }
  }

  subscribe(eventType: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    this.listeners.get(eventType)!.add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(eventType);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.listeners.delete(eventType);
        }
      }
    };
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
  }
}

export {
  AgentService,
  ExecutionService,
  IntegrationService,
  TriggerService,
  UserService,
  WebSocketService,
};
