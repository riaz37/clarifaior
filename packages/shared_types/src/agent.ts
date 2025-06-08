// Agent Types
export type AgentStatus = "draft" | "active" | "paused" | "archived";

export interface Agent {
  id: string;
  name: string;
  description?: string;
  workspaceId: string;
  createdBy: string;
  status: AgentStatus;
  isPublic: boolean;
  flowDefinition?: FlowDefinition;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface AgentVersion {
  id: string;
  agentId: string;
  version: string;
  flowDefinition: FlowDefinition;
  changelog?: string;
  createdBy: string;
  createdAt: string;
}

export interface CreateAgentRequest {
  name: string;
  description?: string;
  workspaceId: string;
}

export interface UpdateAgentRequest {
  name?: string;
  description?: string;
  status?: AgentStatus;
  isPublic?: boolean;
  flowDefinition?: FlowDefinition;
}

// Flow Types
export interface FlowDefinition {
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
}

export type NodeType =
  | "trigger_gmail"
  | "trigger_slack"
  | "trigger_webhook"
  | "trigger_scheduler"
  | "prompt_llm"
  | "prompt_memory"
  | "action_slack"
  | "action_notion"
  | "action_email"
  | "action_webhook"
  | "condition"
  | "transformer";

export interface FlowNode {
  id: string;
  type: NodeType;
  label: string;
  position: { x: number; y: number };
  data: Record<string, any>;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  data?: Record<string, any>;
}
