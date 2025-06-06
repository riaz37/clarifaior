import { BaseAgent } from './base/base-agent';
import { AgentConfig, AgentInput, AgentOutput, AgentExecution } from './base/agent.interface';
import { ParsedIntent } from './intent-parser.agent';

export interface WorkflowDesignInput {
  naturalLanguageDescription: string;
  parsedIntent?: ParsedIntent;
  availableIntegrations: Integration[];
  userContext?: UserContext;
  constraints?: Record<string, any>;
}

export interface Integration {
  name: string;
  type: string;
  description: string;
  capabilities: string[];
  actions: IntegrationAction[];
  triggers: IntegrationTrigger[];
  config?: Record<string, any>;
}

export interface IntegrationAction {
  name: string;
  description: string;
  parameters: Parameter[];
  requiredPermissions?: string[];
}

export interface IntegrationTrigger {
  name: string;
  description: string;
  eventType: string;
  parameters: Parameter[];
}

export interface Parameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  defaultValue?: any;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    options?: string[];
  };
}

export interface UserContext {
  userId: string;
  role?: string;
  team?: string;
  preferences?: Record<string, any>;
  previousWorkflows?: WorkflowExample[];
}

export interface WorkflowExample {
  id: string;
  name: string;
  description: string;
  structure: any;
  usage: number;
  rating: number;
}

export interface WorkflowDesign {
  name: string;
  description: string;
  trigger: {
    type: string;
    integration: string;
    config: Record<string, any>;
    conditions?: any[];
  };
  steps: WorkflowStep[];
  errorHandling: {
    retryPolicy: {
      maxRetries: number;
      backoffMultiplier: number;
      initialDelay: number;
    };
    fallbackActions: any[];
    notifications: string[];
  };
  metadata: {
    estimatedExecutionTime: number;
    complexity: 'simple' | 'medium' | 'complex';
    requiredPermissions: string[];
    integrationCount: number;
  };
  explanation: string;
  confidence: number;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'action' | 'condition' | 'parallel' | 'loop';
  integration: string;
  action: string;
  parameters: Record<string, any>;
  conditions?: any[];
  onSuccess?: string; // Next step ID
  onFailure?: string; // Next step ID or error handling
  timeout?: number;
  retries?: number;
}

export class WorkflowDesignerAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super({
      ...config,
      name: 'workflow-designer',
      description: 'Designs comprehensive workflows from natural language descriptions and parsed intents',
    });
  }

  protected async executeInternal(input: AgentInput, execution: AgentExecution): Promise<AgentOutput> {
    const designInput = input.input as WorkflowDesignInput;

    // Step 1: Analyze requirements
    const requirements = await this.executeStep(
      'analyze-requirements',
      designInput,
      execution,
      () => this.analyzeRequirements(designInput)
    );

    // Step 2: Select optimal integrations
    const selectedIntegrations = await this.executeStep(
      'select-integrations',
      { requirements, availableIntegrations: designInput.availableIntegrations },
      execution,
      () => this.selectOptimalIntegrations(requirements, designInput.availableIntegrations)
    );

    // Step 3: Design workflow structure
    const workflowStructure = await this.executeStep(
      'design-structure',
      { requirements, integrations: selectedIntegrations },
      execution,
      () => this.designWorkflowStructure(requirements, selectedIntegrations, designInput)
    );

    // Step 4: Add error handling and optimization
    const finalWorkflow = await this.executeStep(
      'optimize-workflow',
      workflowStructure,
      execution,
      () => this.optimizeWorkflow(workflowStructure, designInput)
    );

    return {
      output: finalWorkflow,
      confidence: finalWorkflow.confidence,
      reasoning: `Designed workflow with ${finalWorkflow.steps.length} steps using ${finalWorkflow.metadata.integrationCount} integrations`,
      tokensUsed: execution.steps.reduce((total, step) => total + (step.metadata?.tokensUsed || 0), 0),
      executionTime: Date.now() - execution.startTime.getTime()
    };
  }

  private async analyzeRequirements(input: WorkflowDesignInput): Promise<any> {
    const prompt = `
Analyze this workflow request and extract detailed requirements:

Description: "${input.naturalLanguageDescription}"
${input.parsedIntent ? `Parsed Intent: ${JSON.stringify(input.parsedIntent, null, 2)}` : ''}
${input.userContext ? `User Context: ${JSON.stringify(input.userContext, null, 2)}` : ''}
${input.constraints ? `Constraints: ${JSON.stringify(input.constraints, null, 2)}` : ''}

Extract:
1. Primary objective: What is the main goal?
2. Trigger requirements: What should start this workflow?
3. Action requirements: What actions need to be performed?
4. Data flow: What data needs to be passed between steps?
5. Conditions: Any conditional logic needed?
6. Performance requirements: Speed, reliability, etc.
7. Security requirements: Permissions, data handling, etc.

Return as structured JSON.
`;

    return await this.callLLM(prompt, {
      temperature: 0.3,
      structured: true,
      schema: {
        type: 'object',
        properties: {
          primaryObjective: { type: 'string' },
          triggerRequirements: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              conditions: { type: 'array', items: { type: 'string' } },
              frequency: { type: 'string' }
            }
          },
          actionRequirements: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                action: { type: 'string' },
                target: { type: 'string' },
                data: { type: 'object' }
              }
            }
          },
          dataFlow: { type: 'array', items: { type: 'string' } },
          conditions: { type: 'array', items: { type: 'string' } },
          performanceRequirements: { type: 'object' },
          securityRequirements: { type: 'object' }
        }
      }
    });
  }

  private async selectOptimalIntegrations(
    requirements: any,
    availableIntegrations: Integration[]
  ): Promise<Integration[]> {
    const prompt = `
Select the optimal integrations for this workflow:

Requirements: ${JSON.stringify(requirements, null, 2)}

Available Integrations:
${availableIntegrations.map(integration => `
- ${integration.name} (${integration.type}): ${integration.description}
  Capabilities: ${integration.capabilities.join(', ')}
  Actions: ${integration.actions.map(a => a.name).join(', ')}
  Triggers: ${integration.triggers.map(t => t.name).join(', ')}
`).join('\n')}

Select integrations that:
1. Can fulfill the trigger requirements
2. Can perform the required actions
3. Have the necessary capabilities
4. Are reliable and well-supported

Return the selected integration names as a JSON array.
`;

    const selectedNames = await this.callLLM(prompt, {
      temperature: 0.2,
      structured: true,
      schema: {
        type: 'array',
        items: { type: 'string' }
      }
    });

    return availableIntegrations.filter(integration => 
      selectedNames.includes(integration.name)
    );
  }

  private async designWorkflowStructure(
    requirements: any,
    integrations: Integration[],
    input: WorkflowDesignInput
  ): Promise<WorkflowDesign> {
    const prompt = `
Design a comprehensive workflow structure:

Requirements: ${JSON.stringify(requirements, null, 2)}
Selected Integrations: ${JSON.stringify(integrations.map(i => ({
  name: i.name,
  actions: i.actions,
  triggers: i.triggers
})), null, 2)}

Create a workflow that:
1. Uses the most appropriate trigger
2. Implements all required actions in logical order
3. Includes proper error handling
4. Handles data flow between steps
5. Includes conditional logic where needed

Return a complete workflow design as JSON.
`;

    return await this.callLLM(prompt, {
      temperature: 0.3,
      structured: true,
      schema: {
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
              conditions: { type: 'array' }
            }
          },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                type: { type: 'string' },
                integration: { type: 'string' },
                action: { type: 'string' },
                parameters: { type: 'object' },
                conditions: { type: 'array' },
                onSuccess: { type: 'string' },
                onFailure: { type: 'string' },
                timeout: { type: 'number' },
                retries: { type: 'number' }
              }
            }
          },
          errorHandling: {
            type: 'object',
            properties: {
              retryPolicy: { type: 'object' },
              fallbackActions: { type: 'array' },
              notifications: { type: 'array' }
            }
          },
          explanation: { type: 'string' },
          confidence: { type: 'number' }
        }
      }
    });
  }

  private async optimizeWorkflow(
    workflow: WorkflowDesign,
    input: WorkflowDesignInput
  ): Promise<WorkflowDesign> {
    // Add metadata
    workflow.metadata = {
      estimatedExecutionTime: this.estimateExecutionTime(workflow.steps),
      complexity: this.assessComplexity(workflow),
      requiredPermissions: this.extractRequiredPermissions(workflow),
      integrationCount: new Set(workflow.steps.map(s => s.integration)).size
    };

    // Optimize step order
    workflow.steps = this.optimizeStepOrder(workflow.steps);

    // Add default error handling if missing
    if (!workflow.errorHandling) {
      workflow.errorHandling = {
        retryPolicy: {
          maxRetries: 3,
          backoffMultiplier: 2,
          initialDelay: 1000
        },
        fallbackActions: [],
        notifications: ['email']
      };
    }

    // Validate and adjust confidence
    workflow.confidence = this.calculateWorkflowConfidence(workflow, input);

    return workflow;
  }

  private estimateExecutionTime(steps: WorkflowStep[]): number {
    // Estimate based on step types and integrations
    return steps.reduce((total, step) => {
      const baseTime = step.type === 'action' ? 2000 : 500; // ms
      const integrationMultiplier = step.integration.includes('email') ? 2 : 1;
      return total + (baseTime * integrationMultiplier);
    }, 0);
  }

  private assessComplexity(workflow: WorkflowDesign): 'simple' | 'medium' | 'complex' {
    const stepCount = workflow.steps.length;
    const hasConditions = workflow.steps.some(s => s.conditions && s.conditions.length > 0);
    const hasParallel = workflow.steps.some(s => s.type === 'parallel');
    const integrationCount = new Set(workflow.steps.map(s => s.integration)).size;

    if (stepCount <= 2 && !hasConditions && !hasParallel && integrationCount <= 2) {
      return 'simple';
    } else if (stepCount <= 5 && integrationCount <= 3) {
      return 'medium';
    } else {
      return 'complex';
    }
  }

  private extractRequiredPermissions(workflow: WorkflowDesign): string[] {
    const permissions = new Set<string>();
    
    // Add trigger permissions
    if (workflow.trigger.integration === 'gmail') {
      permissions.add('gmail.readonly');
    }
    
    // Add step permissions
    workflow.steps.forEach(step => {
      if (step.integration === 'slack') {
        permissions.add('slack.chat:write');
      } else if (step.integration === 'gmail') {
        permissions.add('gmail.send');
      } else if (step.integration === 'notion') {
        permissions.add('notion.write');
      }
    });

    return Array.from(permissions);
  }

  private optimizeStepOrder(steps: WorkflowStep[]): WorkflowStep[] {
    // Simple optimization: ensure dependencies are met
    // In a real implementation, this would be more sophisticated
    return steps.sort((a, b) => {
      // Conditions should come before actions that depend on them
      if (a.type === 'condition' && b.type === 'action') return -1;
      if (a.type === 'action' && b.type === 'condition') return 1;
      return 0;
    });
  }

  private calculateWorkflowConfidence(workflow: WorkflowDesign, input: WorkflowDesignInput): number {
    let confidence = 0.7; // Base confidence

    // Boost for clear trigger
    if (workflow.trigger && workflow.trigger.type) {
      confidence += 0.1;
    }

    // Boost for having steps
    if (workflow.steps.length > 0) {
      confidence += 0.1;
    }

    // Boost for error handling
    if (workflow.errorHandling && workflow.errorHandling.retryPolicy) {
      confidence += 0.05;
    }

    // Reduce for high complexity
    if (workflow.metadata.complexity === 'complex') {
      confidence -= 0.1;
    }

    return Math.min(confidence, 0.95);
  }
}