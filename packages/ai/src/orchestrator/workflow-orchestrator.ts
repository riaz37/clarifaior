import { BaseLLMProvider } from '../providers/base.provider';
import { ProviderFactory, ProviderConfig } from '../providers/provider.factory';
import { WorkflowCreationTemplate } from '../templates/workflow/workflow-creation.template';

export interface WorkflowOrchestratorConfig {
  defaultProvider: ProviderConfig;
  enableCaching?: boolean;
  maxRetries?: number;
  timeout?: number;
}

export interface WorkflowRequest {
  description: string;
  availableIntegrations: Integration[];
  userContext?: UserContext;
  constraints?: Record<string, any>;
}

export interface Integration {
  name: string;
  type: string;
  description: string;
  capabilities: string[];
  config?: Record<string, any>;
}

export interface UserContext {
  userId: string;
  role?: string;
  team?: string;
  preferences?: Record<string, any>;
  previousWorkflows?: any[];
}

export interface WorkflowDesign {
  name: string;
  description: string;
  trigger: {
    type: string;
    integration: string;
    config: Record<string, any>;
  };
  steps: Array<{
    id: string;
    type: string;
    integration: string;
    action: string;
    parameters: Record<string, any>;
    conditions?: any[];
  }>;
  errorHandling: {
    retryPolicy: Record<string, any>;
    fallbackActions: any[];
  };
  explanation: string;
  confidence: number;
}

export class WorkflowOrchestrator {
  private llmProvider: BaseLLMProvider;
  private config: WorkflowOrchestratorConfig;
  private workflowTemplate: WorkflowCreationTemplate;

  constructor(config: WorkflowOrchestratorConfig) {
    this.config = config;
    this.llmProvider = ProviderFactory.createProvider(config.defaultProvider);
    this.workflowTemplate = new WorkflowCreationTemplate();
  }

  async createWorkflow(request: WorkflowRequest): Promise<WorkflowDesign> {
    try {
      // Validate the request
      this.validateRequest(request);

      // Prepare template variables
      const templateVariables = {
        userInput: request.description,
        availableIntegrations: request.availableIntegrations,
        userContext: request.userContext,
        constraints: request.constraints,
        examples: await this.getRelevantExamples(request),
      };

      // Validate template variables
      const validation = this.workflowTemplate.validate(templateVariables);
      if (!validation.valid) {
        throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
      }

      // Generate the prompt
      const prompt = this.workflowTemplate.format(templateVariables);

      // Define the workflow schema
      const workflowSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          trigger: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              integration: { type: 'string' },
              config: { type: 'object' },
            },
            required: ['type', 'integration'],
          },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                type: { type: 'string' },
                integration: { type: 'string' },
                action: { type: 'string' },
                parameters: { type: 'object' },
                conditions: { type: 'array' },
              },
              required: ['id', 'type', 'integration', 'action'],
            },
          },
          errorHandling: {
            type: 'object',
            properties: {
              retryPolicy: { type: 'object' },
              fallbackActions: { type: 'array' },
            },
          },
          explanation: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
        },
        required: ['name', 'description', 'trigger', 'steps', 'explanation', 'confidence'],
      };

      // Generate structured output
      const workflow = await this.llmProvider.generateStructuredOutput<WorkflowDesign>(
        prompt,
        workflowSchema,
        {
          temperature: 0.3, // Lower temperature for more consistent output
          maxTokens: 2000,
        }
      );

      // Post-process and validate the workflow
      return this.postProcessWorkflow(workflow, request);
    } catch (error) {
      throw new Error(`Workflow creation failed: ${error.message}`);
    }
  }

  async refineWorkflow(
    workflow: WorkflowDesign,
    feedback: string,
    request: WorkflowRequest
  ): Promise<WorkflowDesign> {
    const refinementPrompt = `
You are refining an existing workflow based on user feedback.

## Current Workflow
${JSON.stringify(workflow, null, 2)}

## User Feedback
${feedback}

## Available Integrations
${JSON.stringify(request.availableIntegrations, null, 2)}

Please provide an improved version of the workflow that addresses the feedback while maintaining the same JSON structure.
`;

    const workflowSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        trigger: { type: 'object' },
        steps: { type: 'array' },
        errorHandling: { type: 'object' },
        explanation: { type: 'string' },
        confidence: { type: 'number' },
      },
    };

    const refinedWorkflow = await this.llmProvider.generateStructuredOutput<WorkflowDesign>(
      refinementPrompt,
      workflowSchema,
      { temperature: 0.3 }
    );

    return this.postProcessWorkflow(refinedWorkflow, request);
  }

  async explainWorkflow(workflow: WorkflowDesign): Promise<string> {
    const explanationPrompt = `
Explain this workflow in simple, non-technical terms that a business user can understand:

${JSON.stringify(workflow, null, 2)}

Provide a clear explanation of:
1. What triggers the workflow
2. What actions it performs
3. What the end result will be
4. Any important conditions or logic

Keep the explanation concise but comprehensive.
`;

    const response = await this.llmProvider.generateCompletion(explanationPrompt, {
      temperature: 0.5,
      maxTokens: 500,
    });

    return response.content;
  }

  private validateRequest(request: WorkflowRequest): void {
    if (!request.description || request.description.trim().length === 0) {
      throw new Error('Workflow description is required');
    }

    if (!request.availableIntegrations || request.availableIntegrations.length === 0) {
      throw new Error('At least one integration must be available');
    }

    // Validate integrations
    request.availableIntegrations.forEach((integration, index) => {
      if (!integration.name || !integration.type) {
        throw new Error(`Integration at index ${index} is missing required fields`);
      }
    });
  }

  private async getRelevantExamples(request: WorkflowRequest): Promise<any[]> {
    // In a real implementation, this would query a vector database
    // For now, return some static examples
    return [
      {
        description: 'Email to Slack notification',
        workflow: 'Gmail trigger → Slack message action',
      },
      {
        description: 'Scheduled report generation',
        workflow: 'Schedule trigger → Data fetch → Email report',
      },
    ];
  }

  private postProcessWorkflow(workflow: WorkflowDesign, request: WorkflowRequest): WorkflowDesign {
    // Validate that all referenced integrations are available
    const availableIntegrationNames = request.availableIntegrations.map(i => i.name);
    
    if (!availableIntegrationNames.includes(workflow.trigger.integration)) {
      throw new Error(`Trigger integration '${workflow.trigger.integration}' is not available`);
    }

    workflow.steps.forEach((step, index) => {
      if (!availableIntegrationNames.includes(step.integration)) {
        throw new Error(`Step ${index} integration '${step.integration}' is not available`);
      }
    });

    // Ensure all steps have unique IDs
    const stepIds = new Set();
    workflow.steps.forEach((step, index) => {
      if (stepIds.has(step.id)) {
        step.id = `${step.id}_${index}`;
      }
      stepIds.add(step.id);
    });

    // Set default error handling if not provided
    if (!workflow.errorHandling) {
      workflow.errorHandling = {
        retryPolicy: {
          maxRetries: 3,
          backoffMultiplier: 2,
          initialDelay: 1000,
        },
        fallbackActions: [],
      };
    }

    return workflow;
  }

  // Utility methods
  getProvider(): BaseLLMProvider {
    return this.llmProvider;
  }

  updateProvider(config: ProviderConfig): void {
    this.llmProvider = ProviderFactory.createProvider(config);
  }

  getConfig(): WorkflowOrchestratorConfig {
    return { ...this.config };
  }
}