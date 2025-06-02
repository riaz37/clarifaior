import { NodeTypes } from 'reactflow';
import { TriggerNode } from './nodes/TriggerNode';
import { LLMNode } from './nodes/LLMNode';
import { ActionNode } from './nodes/ActionNode';
import { LogicNode } from './nodes/LogicNode';

// Node type definitions matching backend
export const NODE_TYPES = {
  // Trigger Nodes
  trigger_manual: 'trigger_manual',
  trigger_webhook: 'trigger_webhook',
  trigger_schedule: 'trigger_schedule',
  trigger_gmail: 'trigger_gmail',
  trigger_slack: 'trigger_slack',
  
  // AI/LLM Nodes
  prompt_llm: 'prompt_llm',
  prompt_memory: 'prompt_memory',
  
  // Action Nodes
  action_email: 'action_email',
  action_slack: 'action_slack',
  action_notion: 'action_notion',
  
  // Logic Nodes
  logic_condition: 'logic_condition',
  logic_loop: 'logic_loop',
} as const;

export type NodeType = typeof NODE_TYPES[keyof typeof NODE_TYPES];

// Node categories for the sidebar
export const NODE_CATEGORIES = {
  triggers: {
    label: 'Triggers',
    icon: '⚡',
    color: 'from-yellow-500 to-orange-500',
    nodes: [
      {
        type: NODE_TYPES.trigger_manual,
        label: 'Manual Trigger',
        description: 'Start the flow manually',
        icon: '👆',
      },
      {
        type: NODE_TYPES.trigger_webhook,
        label: 'Webhook',
        description: 'Trigger from HTTP requests',
        icon: '🔗',
      },
      {
        type: NODE_TYPES.trigger_schedule,
        label: 'Schedule',
        description: 'Run on a schedule',
        icon: '⏰',
      },
      {
        type: NODE_TYPES.trigger_gmail,
        label: 'Gmail',
        description: 'Trigger on new emails',
        icon: '📧',
      },
      {
        type: NODE_TYPES.trigger_slack,
        label: 'Slack',
        description: 'Trigger on Slack messages',
        icon: '💬',
      },
    ],
  },
  ai: {
    label: 'AI & LLM',
    icon: '🧠',
    color: 'from-cyan-500 to-blue-500',
    nodes: [
      {
        type: NODE_TYPES.prompt_llm,
        label: 'LLM Prompt',
        description: 'Generate text with AI',
        icon: '🤖',
      },
      {
        type: NODE_TYPES.prompt_memory,
        label: 'Memory Search',
        description: 'Search vector memory',
        icon: '🧠',
      },
    ],
  },
  actions: {
    label: 'Actions',
    icon: '🎯',
    color: 'from-green-500 to-teal-500',
    nodes: [
      {
        type: NODE_TYPES.action_email,
        label: 'Send Email',
        description: 'Send emails via Gmail',
        icon: '📤',
      },
      {
        type: NODE_TYPES.action_slack,
        label: 'Slack Message',
        description: 'Send Slack messages',
        icon: '💬',
      },
      {
        type: NODE_TYPES.action_notion,
        label: 'Notion Page',
        description: 'Create Notion pages',
        icon: '📝',
      },
    ],
  },
  logic: {
    label: 'Logic',
    icon: '🔀',
    color: 'from-purple-500 to-pink-500',
    nodes: [
      {
        type: NODE_TYPES.logic_condition,
        label: 'Condition',
        description: 'If/else logic',
        icon: '❓',
      },
      {
        type: NODE_TYPES.logic_loop,
        label: 'Loop',
        description: 'Repeat actions',
        icon: '🔄',
      },
    ],
  },
};

// React Flow node types mapping
export const nodeTypes: NodeTypes = {
  [NODE_TYPES.trigger_manual]: TriggerNode,
  [NODE_TYPES.trigger_webhook]: TriggerNode,
  [NODE_TYPES.trigger_schedule]: TriggerNode,
  [NODE_TYPES.trigger_gmail]: TriggerNode,
  [NODE_TYPES.trigger_slack]: TriggerNode,
  [NODE_TYPES.prompt_llm]: LLMNode,
  [NODE_TYPES.prompt_memory]: LLMNode,
  [NODE_TYPES.action_email]: ActionNode,
  [NODE_TYPES.action_slack]: ActionNode,
  [NODE_TYPES.action_notion]: ActionNode,
  [NODE_TYPES.logic_condition]: LogicNode,
  [NODE_TYPES.logic_loop]: LogicNode,
};

// Default node data based on type
export const getDefaultNodeData = (type: NodeType) => {
  const baseData = {
    label: NODE_CATEGORIES.triggers.nodes.find(n => n.type === type)?.label ||
           NODE_CATEGORIES.ai.nodes.find(n => n.type === type)?.label ||
           NODE_CATEGORIES.actions.nodes.find(n => n.type === type)?.label ||
           NODE_CATEGORIES.logic.nodes.find(n => n.type === type)?.label ||
           'Unknown Node',
    config: {},
  };

  // Type-specific default configurations
  switch (type) {
    case NODE_TYPES.prompt_llm:
      return {
        ...baseData,
        config: {
          prompt: '',
          model: 'deepseek-chat',
          temperature: 0.7,
          maxTokens: 1000,
        },
      };
    
    case NODE_TYPES.action_email:
      return {
        ...baseData,
        config: {
          to: '',
          subject: '',
          body: '',
          html: false,
        },
      };
    
    case NODE_TYPES.trigger_schedule:
      return {
        ...baseData,
        config: {
          cronExpression: '0 9 * * *',
          timezone: 'UTC',
        },
      };
    
    case NODE_TYPES.logic_condition:
      return {
        ...baseData,
        config: {
          condition: '',
          operator: 'equals',
          value: '',
        },
      };
    
    default:
      return baseData;
  }
};
