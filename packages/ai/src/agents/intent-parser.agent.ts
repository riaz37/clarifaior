import { BaseAgent } from './base/base-agent';
import { AgentConfig, AgentInput, AgentOutput, AgentExecution } from './base/agent.interface';

export interface ParsedIntent {
  type: IntentType;
  entities: ExtractedEntity[];
  structure: WorkflowStructure;
  confidence: number;
  originalInput: string;
  context?: string;
  metadata: {
    processingTime: number;
    entitiesFound: number;
    complexity: 'simple' | 'medium' | 'complex';
  };
}

export enum IntentType {
  CREATE_WORKFLOW = 'create_workflow',
  MODIFY_WORKFLOW = 'modify_workflow',
  SCHEDULE_TASK = 'schedule_task',
  INTEGRATE_SERVICE = 'integrate_service',
  AUTOMATE_PROCESS = 'automate_process',
  UNCLEAR = 'unclear'
}

export interface ExtractedEntity {
  type: 'trigger' | 'action' | 'condition' | 'integration' | 'schedule' | 'data';
  value: string;
  confidence: number;
  position: { start: number; end: number };
  metadata?: Record<string, any>;
}

export interface WorkflowStructure {
  trigger?: {
    type: string;
    integration: string;
    conditions: string[];
  };
  actions: Array<{
    type: string;
    integration: string;
    parameters: Record<string, any>;
  }>;
  conditions: string[];
  schedule?: {
    frequency: string;
    time?: string;
    timezone?: string;
  };
}

export class IntentParserAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super({
      ...config,
      name: 'intent-parser',
      description: 'Parses natural language input to extract user intents and workflow requirements',
    });
  }

  protected async executeInternal(input: AgentInput, execution: AgentExecution): Promise<AgentOutput> {
    const userInput = input.input;
    const context = input.context || {};

    // Step 1: Extract entities
    const entities = await this.executeStep(
      'extract-entities',
      { text: userInput },
      execution,
      () => this.extractEntities(userInput)
    );

    // Step 2: Classify intent type
    const intentType = await this.executeStep(
      'classify-intent',
      { text: userInput, entities },
      execution,
      () => this.classifyIntentType(userInput, entities)
    );

    // Step 3: Extract workflow structure
    const workflowStructure = await this.executeStep(
      'extract-structure',
      { text: userInput, entities, intentType },
      execution,
      () => this.extractWorkflowStructure(userInput, entities, context)
    );

    // Step 4: Calculate confidence
    const confidence = this.calculateConfidence(entities, intentType, workflowStructure);

    const result: ParsedIntent = {
      type: intentType,
      entities,
      structure: workflowStructure,
      confidence,
      originalInput: userInput,
      context: context.summary,
      metadata: {
        processingTime: Date.now(),
        entitiesFound: entities.length,
        complexity: this.assessComplexity(workflowStructure)
      }
    };

    return {
      output: result,
      confidence,
      reasoning: `Parsed intent with ${entities.length} entities and ${confidence * 100}% confidence`,
      tokensUsed: execution.steps.reduce((total, step) => total + (step.metadata?.tokensUsed || 0), 0),
      executionTime: Date.now() - execution.startTime.getTime()
    };
  }

  private async extractEntities(text: string): Promise<ExtractedEntity[]> {
    const prompt = `
Extract workflow-related entities from this text: "${text}"

Identify and extract:
1. TRIGGERS: Events that start workflows (email received, time-based, webhook, etc.)
2. ACTIONS: Things to do (send message, create document, notify, etc.)
3. INTEGRATIONS: Services mentioned (Gmail, Slack, Notion, etc.)
4. CONDITIONS: If/when statements or filters
5. SCHEDULE: Time-based patterns (daily, weekly, at 9am, etc.)
6. DATA: Specific data to process or transform

For each entity, provide:
- type: one of [trigger, action, integration, condition, schedule, data]
- value: the extracted text
- confidence: 0-1 score
- position: start and end character positions

Return as JSON array of entities.
`;

    const response = await this.callLLM(prompt, {
      temperature: 0.3,
      structured: true,
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['trigger', 'action', 'integration', 'condition', 'schedule', 'data'] },
            value: { type: 'string' },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            position: {
              type: 'object',
              properties: {
                start: { type: 'number' },
                end: { type: 'number' }
              }
            }
          }
        }
      }
    });

    return response || [];
  }

  private async classifyIntentType(text: string, entities: ExtractedEntity[]): Promise<IntentType> {
    const prompt = `
Classify the user's intent based on their input and extracted entities.

Input: "${text}"
Entities: ${JSON.stringify(entities, null, 2)}

Intent Types:
- CREATE_WORKFLOW: User wants to create a new automated workflow
- MODIFY_WORKFLOW: User wants to change an existing workflow
- SCHEDULE_TASK: User wants to schedule a recurring task
- INTEGRATE_SERVICE: User wants to connect a new service
- AUTOMATE_PROCESS: User wants to automate a manual process
- UNCLEAR: Intent is not clear or ambiguous

Return only the intent type as a string.
`;

    const response = await this.callLLM(prompt, { temperature: 0.1 });
    
    // Parse and validate the response
    const intentType = response.trim().toUpperCase();
    if (Object.values(IntentType).includes(intentType as IntentType)) {
      return intentType as IntentType;
    }
    
    return IntentType.UNCLEAR;
  }

  private async extractWorkflowStructure(
    text: string,
    entities: ExtractedEntity[],
    context: any
  ): Promise<WorkflowStructure> {
    const prompt = `
Extract the workflow structure from this input:

Text: "${text}"
Entities: ${JSON.stringify(entities, null, 2)}
Context: ${JSON.stringify(context, null, 2)}

Identify:
1. TRIGGER: What event starts this workflow?
2. ACTIONS: What actions should be performed?
3. CONDITIONS: Any if/when conditions?
4. SCHEDULE: Any time-based scheduling?

Return a structured workflow definition as JSON.
`;

    const response = await this.callLLM(prompt, {
      temperature: 0.2,
      structured: true,
      schema: {
        type: 'object',
        properties: {
          trigger: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              integration: { type: 'string' },
              conditions: { type: 'array', items: { type: 'string' } }
            }
          },
          actions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                integration: { type: 'string' },
                parameters: { type: 'object' }
              }
            }
          },
          conditions: { type: 'array', items: { type: 'string' } },
          schedule: {
            type: 'object',
            properties: {
              frequency: { type: 'string' },
              time: { type: 'string' },
              timezone: { type: 'string' }
            }
          }
        }
      }
    });

    return response || {
      actions: [],
      conditions: []
    };
  }

  private calculateConfidence(
    entities: ExtractedEntity[],
    intentType: IntentType,
    structure: WorkflowStructure
  ): number {
    let confidence = 0.5; // Base confidence

    // Boost confidence based on entity clarity
    const highConfidenceEntities = entities.filter(e => e.confidence > 0.8);
    confidence += (highConfidenceEntities.length / Math.max(entities.length, 1)) * 0.3;

    // Boost confidence based on structure completeness
    if (structure.trigger && structure.actions.length > 0) {
      confidence += 0.2;
    }

    // Adjust based on intent type clarity
    if (intentType !== IntentType.UNCLEAR) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  private assessComplexity(structure: WorkflowStructure): 'simple' | 'medium' | 'complex' {
    const actionCount = structure.actions.length;
    const conditionCount = structure.conditions.length;
    const hasSchedule = !!structure.schedule;

    if (actionCount <= 1 && conditionCount === 0 && !hasSchedule) {
      return 'simple';
    } else if (actionCount <= 3 && conditionCount <= 2) {
      return 'medium';
    } else {
      return 'complex';
    }
  }
}