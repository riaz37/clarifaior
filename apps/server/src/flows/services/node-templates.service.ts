import { Injectable } from '@nestjs/common';
import { NodeType } from '@repo/types';

export interface NodeTemplate {
  type: NodeType;
  label: string;
  description: string;
  category: 'trigger' | 'action' | 'logic' | 'ai';
  icon: string;
  color: string;
  defaultData: Record<string, any>;
  configSchema: Record<string, any>;
  inputs: string[];
  outputs: string[];
}

@Injectable()
export class NodeTemplatesService {
  private templates: Map<NodeType, NodeTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  getTemplate(type: NodeType): NodeTemplate | undefined {
    return this.templates.get(type);
  }

  getAllTemplates(): NodeTemplate[] {
    return Array.from(this.templates.values());
  }

  getTemplatesByCategory(category: string): NodeTemplate[] {
    return Array.from(this.templates.values()).filter(
      (template) => template.category === category,
    );
  }

  private initializeTemplates(): void {
    // Trigger Templates
    this.templates.set('trigger_gmail', {
      type: 'trigger_gmail',
      label: 'Gmail Trigger',
      description: 'Triggers when new emails are received',
      category: 'trigger',
      icon: '📧',
      color: '#EA4335',
      defaultData: {
        filter: '',
        labels: ['INBOX'],
        pollInterval: '5m',
        markAsRead: false,
      },
      configSchema: {
        filter: {
          type: 'string',
          label: 'Email Filter',
          placeholder: 'from:example@domain.com',
        },
        labels: {
          type: 'array',
          label: 'Gmail Labels',
          items: { type: 'string' },
        },
        pollInterval: {
          type: 'select',
          label: 'Check Interval',
          options: ['1m', '5m', '15m', '30m', '1h'],
        },
        markAsRead: { type: 'boolean', label: 'Mark as Read' },
      },
      inputs: [],
      outputs: ['email'],
    });

    this.templates.set('trigger_slack', {
      type: 'trigger_slack',
      label: 'Slack Trigger',
      description: 'Triggers on Slack messages or events',
      category: 'trigger',
      icon: '💬',
      color: '#4A154B',
      defaultData: {
        channel: '',
        eventType: 'message',
        botMentions: false,
      },
      configSchema: {
        channel: { type: 'string', label: 'Channel', placeholder: '#general' },
        eventType: {
          type: 'select',
          label: 'Event Type',
          options: ['message', 'reaction', 'mention'],
        },
        botMentions: { type: 'boolean', label: 'Include Bot Mentions' },
      },
      inputs: [],
      outputs: ['message'],
    });

    this.templates.set('trigger_webhook', {
      type: 'trigger_webhook',
      label: 'Webhook Trigger',
      description: 'Triggers on HTTP webhook calls',
      category: 'trigger',
      icon: '🔗',
      color: '#6366F1',
      defaultData: {
        endpoint: '',
        method: 'POST',
        authentication: 'none',
      },
      configSchema: {
        endpoint: {
          type: 'string',
          label: 'Endpoint Path',
          placeholder: '/webhook/my-trigger',
        },
        method: {
          type: 'select',
          label: 'HTTP Method',
          options: ['GET', 'POST', 'PUT', 'PATCH'],
        },
        authentication: {
          type: 'select',
          label: 'Authentication',
          options: ['none', 'api_key', 'bearer'],
        },
      },
      inputs: [],
      outputs: ['request'],
    });

    // AI/LLM Templates
    this.templates.set('prompt_llm', {
      type: 'prompt_llm',
      label: 'LLM Prompt',
      description: 'Process data with Large Language Models',
      category: 'ai',
      icon: '🧠',
      color: '#10B981',
      defaultData: {
        prompt: '',
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 1000,
      },
      configSchema: {
        prompt: {
          type: 'textarea',
          label: 'Prompt Template',
          placeholder: 'Analyze this data: {{input}}',
        },
        model: {
          type: 'select',
          label: 'Model',
          options: ['gpt-4', 'gpt-3.5-turbo', 'claude-3', 'llama-2'],
        },
        temperature: {
          type: 'number',
          label: 'Temperature',
          min: 0,
          max: 2,
          step: 0.1,
        },
        maxTokens: { type: 'number', label: 'Max Tokens', min: 1, max: 4000 },
      },
      inputs: ['input'],
      outputs: ['response'],
    });

    this.templates.set('prompt_memory', {
      type: 'prompt_memory',
      label: 'Memory Search',
      description: 'Search and retrieve from vector memory',
      category: 'ai',
      icon: '🧩',
      color: '#8B5CF6',
      defaultData: {
        query: '',
        topK: 5,
        threshold: 0.7,
      },
      configSchema: {
        query: {
          type: 'string',
          label: 'Search Query',
          placeholder: '{{input.question}}',
        },
        topK: { type: 'number', label: 'Top Results', min: 1, max: 20 },
        threshold: {
          type: 'number',
          label: 'Similarity Threshold',
          min: 0,
          max: 1,
          step: 0.1,
        },
      },
      inputs: ['query'],
      outputs: ['results'],
    });

    // Action Templates
    this.templates.set('action_slack', {
      type: 'action_slack',
      label: 'Send Slack Message',
      description: 'Send messages to Slack channels or users',
      category: 'action',
      icon: '📤',
      color: '#4A154B',
      defaultData: {
        channel: '',
        message: '',
        threadReply: false,
      },
      configSchema: {
        channel: {
          type: 'string',
          label: 'Channel/User',
          placeholder: '#general or @username',
        },
        message: {
          type: 'textarea',
          label: 'Message',
          placeholder: 'Hello! {{input.message}}',
        },
        threadReply: { type: 'boolean', label: 'Reply in Thread' },
      },
      inputs: ['message'],
      outputs: ['response'],
    });

    this.templates.set('action_notion', {
      type: 'action_notion',
      label: 'Create Notion Page',
      description: 'Create or update Notion pages and databases',
      category: 'action',
      icon: '📝',
      color: '#000000',
      defaultData: {
        database: '',
        title: '',
        properties: {},
      },
      configSchema: {
        database: {
          type: 'string',
          label: 'Database ID',
          placeholder: 'notion-database-id',
        },
        title: {
          type: 'string',
          label: 'Page Title',
          placeholder: '{{input.title}}',
        },
        properties: { type: 'object', label: 'Page Properties' },
      },
      inputs: ['data'],
      outputs: ['page'],
    });

    this.templates.set('action_email', {
      type: 'action_email',
      label: 'Send Email',
      description: 'Send emails via SMTP or email service',
      category: 'action',
      icon: '✉️',
      color: '#EF4444',
      defaultData: {
        to: '',
        subject: '',
        body: '',
        html: false,
      },
      configSchema: {
        to: {
          type: 'string',
          label: 'Recipients',
          placeholder: 'user@example.com',
        },
        subject: {
          type: 'string',
          label: 'Subject',
          placeholder: '{{input.subject}}',
        },
        body: {
          type: 'textarea',
          label: 'Email Body',
          placeholder: 'Email content here...',
        },
        html: { type: 'boolean', label: 'HTML Format' },
      },
      inputs: ['content'],
      outputs: ['result'],
    });

    // Logic Templates
    this.templates.set('condition', {
      type: 'condition',
      label: 'Condition',
      description: 'Branch flow based on conditions',
      category: 'logic',
      icon: '🔀',
      color: '#F59E0B',
      defaultData: {
        condition: '',
        operator: 'equals',
        value: '',
      },
      configSchema: {
        condition: {
          type: 'string',
          label: 'Condition',
          placeholder: '{{input.status}}',
        },
        operator: {
          type: 'select',
          label: 'Operator',
          options: [
            'equals',
            'not_equals',
            'contains',
            'greater_than',
            'less_than',
          ],
        },
        value: {
          type: 'string',
          label: 'Value',
          placeholder: 'expected_value',
        },
      },
      inputs: ['input'],
      outputs: ['true', 'false'],
    });

    this.templates.set('transformer', {
      type: 'transformer',
      label: 'Data Transformer',
      description: 'Transform and manipulate data',
      category: 'logic',
      icon: '🔄',
      color: '#6B7280',
      defaultData: {
        transformation: 'json',
        script: '',
      },
      configSchema: {
        transformation: {
          type: 'select',
          label: 'Type',
          options: ['json', 'text', 'javascript'],
        },
        script: {
          type: 'textarea',
          label: 'Transformation Script',
          placeholder: 'return { transformed: input.data };',
        },
      },
      inputs: ['input'],
      outputs: ['output'],
    });
  }
}
