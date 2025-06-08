import { BaseAgent } from './base/base-agent';
import { AgentConfig, AgentInput, AgentOutput, AgentExecution } from './base/agent.interface';

// Re-export types
export * from './base/agent.interface';

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
  // Intent classification threshold (minimum confidence to consider an intent valid)

  constructor(config: AgentConfig) {
    super({
      ...config,
      name: 'intent-parser',
      description: 'Parses natural language input to extract user intents and workflow requirements',
    });
  }

  protected async executeInternal(
    input: AgentInput,
    execution: AgentExecution
  ): Promise<AgentOutput> {
    const userInput = input.input;
    const context = input.context || {};

    try {
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
          processingTime: execution.steps.reduce((acc, step) => 
            acc + ((step.endTime?.getTime() || 0) - (step.startTime?.getTime() || 0)), 0),
          entitiesFound: entities.length,
          complexity: this.assessComplexity(workflowStructure),
        },
      };

      return {
        output: result,
        confidence,
        metadata: {
          executionId: execution.executionId,
          tokensUsed: execution.totalTokensUsed,
          cost: execution.totalCost,
        },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.handleError(new Error(errorMessage), 'Failed to parse intent');
    }
  }

  private async extractEntities(text: string): Promise<ExtractedEntity[]> {
    // In a real implementation, this would use NLP to extract entities
    // For now, we'll use a simple regex-based approach
    const entities: ExtractedEntity[] = [];
    
    // Simple pattern matching for demonstration
    const patterns = [
      { type: 'trigger', regex: /(when|if|on)\s+(\w+)/gi },
      { type: 'action', regex: /(send|create|update|delete)\s+(\w+)/gi },
      { type: 'integration', regex: /(slack|email|github|jira|salesforce)/gi },
      { type: 'schedule', regex: /(every|daily|weekly|monthly)/gi },
      { type: 'data', regex: /(data|file|document|record)/gi },
    ];

    patterns.forEach(({ type, regex }) => {
      let match;
      while ((match = regex.exec(text)) !== null) {
        entities.push({
          type: type as any,
          value: match[0],
          confidence: 0.8, // Base confidence
          position: { start: match.index, end: match.index + match[0].length },
          metadata: { matchedPattern: match[0] },
        });
      }
    });

    return entities;
  }

  private async classifyIntentType(
    text: string,
    entities: ExtractedEntity[]
  ): Promise<IntentType> {
    // Simple keyword-based classification
    const lowerText = text.toLowerCase();
    
    if (/(create|make|build)\s+(a\s+)?workflow/.test(lowerText)) {
      return IntentType.CREATE_WORKFLOW;
    }
    if (/(modify|update|change)\s+(a\s+)?workflow/.test(lowerText)) {
      return IntentType.MODIFY_WORKFLOW;
    }
    if (/(schedule|set up|create)\s+(a\s+)?(recurring\s+)?task/.test(lowerText)) {
      return IntentType.SCHEDULE_TASK;
    }
    if (/(connect|integrate|link)\s+with\s+\w+/.test(lowerText) || 
        entities.some(e => e.type === 'integration')) {
      return IntentType.INTEGRATE_SERVICE;
    }
    if (/(automate|simplify|streamline)\s+(process|task)/.test(lowerText)) {
      return IntentType.AUTOMATE_PROCESS;
    }
    
    return IntentType.UNCLEAR;
  }

  private async extractWorkflowStructure(
    _text: string,
    entities: ExtractedEntity[],
    _context: Record<string, any>
  ): Promise<WorkflowStructure> {
    const structure: WorkflowStructure = {
      trigger: {
        type: 'manual', // Default trigger
        integration: 'user',
        conditions: [],
      },
      actions: [],
      conditions: [],
    };

    // Extract trigger
    const triggerEntity = entities.find(e => e.type === 'trigger');
    if (triggerEntity) {
      structure.trigger = {
        type: 'event',
        integration: this.detectIntegration(triggerEntity.value, entities) || 'system',
        conditions: this.extractConditions(triggerEntity.value),
      };
    }

    // Extract actions
    const actionEntities = entities.filter(e => e.type === 'action');
    for (const entity of actionEntities) {
      structure.actions.push({
        type: 'action',
        integration: this.detectIntegration(entity.value, entities) || 'custom',
        parameters: this.extractParameters(entity.value),
      });
    }

    // Extract schedule if present
    const scheduleEntity = entities.find(e => e.type === 'schedule');
    if (scheduleEntity) {
      structure.schedule = {
        frequency: this.extractFrequency(scheduleEntity.value),
        time: this.extractTime(scheduleEntity.value),
      };
    }

    return structure;
  }

  private extractConditions(text: string): string[] {
    // Simple condition extraction
    const conditions: string[] = [];
    const conditionRegex = /if\s+(.+?)(?=\s+then|$)/gi;
    let match;
    
    while ((match = conditionRegex.exec(text)) !== null) {
      conditions.push(match[1].trim());
    }
    
    return conditions.length > 0 ? conditions : ['always'];
  }

  private extractParameters(text: string): Record<string, any> {
    // Simple parameter extraction
    const params: Record<string, any> = {};
    const paramRegex = /(\w+)\s*[:=]\s*([^,\s]+)/g;
    let match;
    
    while ((match = paramRegex.exec(text)) !== null) {
      params[match[1]] = match[2];
    }
    
    return params;
  }

  private detectIntegration(text: string, entities: ExtractedEntity[]): string | undefined {
    const integrationEntity = entities.find(e => 
      e.type === 'integration' && 
      text.toLowerCase().includes(e.value.toLowerCase())
    );
    return integrationEntity?.value;
  }

  private extractFrequency(text: string): string {
    if (/daily|every day|each day/.test(text)) return 'daily';
    if (/weekly|every week|each week/.test(text)) return 'weekly';
    if (/monthly|every month|each month/.test(text)) return 'monthly';
    if (/hourly|every hour/.test(text)) return 'hourly';
    return 'once'; // Default
  }

  private extractTime(text: string): string {
    const timeMatch = text.match(/\b(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)\b/i);
    return timeMatch ? timeMatch[1] : '09:00 AM'; // Default time
  }

  private calculateConfidence(
    entities: ExtractedEntity[],
    intentType: IntentType,
    structure: WorkflowStructure
  ): number {
    let confidence = 0.7; // Base confidence

    // Increase confidence based on entities found
    if (entities.length > 0) {
      confidence += Math.min(0.2, entities.length * 0.05);
    }

    // Increase confidence if we have a clear intent
    if (intentType !== IntentType.UNCLEAR) {
      confidence += 0.1;
    }

    // Increase confidence if we have actions
    if (structure.actions.length > 0) {
      confidence += 0.1;
    }

    // Cap at 1.0
    return Math.min(1.0, confidence);
  }

  private handleError(error: Error, defaultMessage: string): AgentOutput {
    console.error('Intent parsing error:', error);
    return {
      output: {
        type: IntentType.UNCLEAR,
        entities: [],
        structure: {
          trigger: { type: 'manual', integration: 'system', conditions: [] },
          actions: [],
          conditions: [],
        },
        confidence: 0,
        originalInput: '',
        metadata: {
          processingTime: 0,
          entitiesFound: 0,
          complexity: 'simple',
          error: error.message,
        },
      },
      confidence: 0,
      metadata: {
        error: {
          message: defaultMessage,
          details: error.message,
        },
      },
    };
  }

  async validate(input: AgentInput): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!input.input || typeof input.input !== 'string' || input.input.trim() === '') {
      errors.push('Input must be a non-empty string');
    }

    if (input.input && input.input.length > 10000) {
      errors.push('Input is too long (max 10000 characters)');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async callLLM(_prompt: string, _options: unknown): Promise<any> {
    // This is a placeholder implementation
    // In a real implementation, this would call an actual LLM
    return {
      trigger: {
        type: 'manual',
        integration: 'user',
        conditions: []
      },
      actions: [],
      conditions: []
    };
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