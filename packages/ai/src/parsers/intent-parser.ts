import BaseParser from './base/base-parser';
import { ParsedIntent, IntentType, ExtractedEntity, WorkflowStructure } from '../agents/intent-parser.agent';

/**
 * Options for the IntentParser
 */
export interface IntentParserOptions {
  /** Minimum confidence score to consider an intent valid (0-1) */
  minConfidence?: number;
  /** Whether to include detailed metadata in the output */
  includeMetadata?: boolean;
  /** Custom entity extractors */
  entityExtractors?: Array<(text: string) => Promise<ExtractedEntity[]>>;
}

/**
 * Parser that extracts structured intents from natural language input
 */
export class IntentParser extends BaseParser<string, ParsedIntent> {
  private options: Required<IntentParserOptions>;

  constructor(options: IntentParserOptions = {}) {
    super();
    this.options = {
      minConfidence: options.minConfidence ?? 0.5,
      includeMetadata: options.includeMetadata ?? true,
      entityExtractors: options.entityExtractors ?? [],
    };
  }

  /**
   * Parses natural language input into a structured intent
   * @param input Natural language input string
   * @param context Optional context object
   * @returns Parsed intent with entities and workflow structure
   */
  async parse(input: string, context: Record<string, any> = {}): Promise<ParsedIntent> {
    this.validateInput(input);

    // Extract entities from the input
    const entities = await this.extractEntities(input);
    
    // Classify the intent type
    const intentType = await this.classifyIntentType(input, entities);
    
    // Extract workflow structure
    const structure = await this.extractWorkflowStructure(input, entities, context);
    
    // Calculate confidence score
    const confidence = this.calculateConfidence(entities, intentType, structure);
    
    // Validate the output
    const result: ParsedIntent = {
      type: intentType,
      entities,
      structure,
      confidence,
      originalInput: input,
      context: context.context,
      metadata: this.options.includeMetadata ? {
        processingTime: 0, // Would be set in a real implementation
        entitiesFound: entities.length,
        complexity: this.assessComplexity(structure),
      } : undefined as any,
    };

    this.validateOutput(result);
    return result;
  }

  /**
   * Extracts entities from the input text
   * @param text Input text to extract entities from
   * @private
   */
  private async extractEntities(text: string): Promise<ExtractedEntity[]> {
    const entities: ExtractedEntity[] = [];
    
    // Run all registered entity extractors
    for (const extractor of this.options.entityExtractors) {
      const extracted = await extractor(text);
      entities.push(...extracted);
    }
    
    return entities;
  }

  /**
   * Classifies the intent type based on input and entities
   * @param text Input text
   * @param entities Extracted entities
   * @private
   */
  private async classifyIntentType(text: string, entities: ExtractedEntity[]): Promise<IntentType> {
    // This is a simplified implementation
    // In a real implementation, this would use NLP or ML to classify the intent
    
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('create') && lowerText.includes('workflow')) {
      return IntentType.CREATE_WORKFLOW;
    } else if (lowerText.includes('modify') && lowerText.includes('workflow')) {
      return IntentType.MODIFY_WORKFLOW;
    } else if (lowerText.includes('schedule') || lowerText.includes('every')) {
      return IntentType.SCHEDULE_TASK;
    } else if (lowerText.includes('integrate') || lowerText.includes('connect')) {
      return IntentType.INTEGRATE_SERVICE;
    } else if (lowerText.includes('automate')) {
      return IntentType.AUTOMATE_PROCESS;
    }
    
    return IntentType.UNCLEAR;
  }

  /**
   * Extracts workflow structure from the input
   * @param text Input text
   * @param entities Extracted entities
   * @param context Context object
   * @private
   */
  private async extractWorkflowStructure(
    text: string,
    entities: ExtractedEntity[],
    context: Record<string, any>
  ): Promise<WorkflowStructure> {
    // This is a simplified implementation
    // In a real implementation, this would extract the workflow structure from the input
    
    const structure: WorkflowStructure = {
      actions: [],
      conditions: [],
    };

    // Extract trigger if mentioned
    const triggerEntity = entities.find(e => e.type === 'trigger');
    if (triggerEntity) {
      structure.trigger = {
        type: triggerEntity.value,
        integration: '',
        conditions: [],
      };
    }

    // Extract actions
    const actionEntities = entities.filter(e => e.type === 'action');
    for (const entity of actionEntities) {
      structure.actions.push({
        type: entity.value,
        integration: '',
        parameters: {},
      });
    }

    // Extract conditions
    const conditionEntities = entities.filter(e => e.type === 'condition');
    structure.conditions = conditionEntities.map(e => e.value);

    return structure;
  }

  /**
   * Calculates the confidence score for the parsed intent
   * @param entities Extracted entities
   * @param intentType Classified intent type
   * @param structure Extracted workflow structure
   * @private
   */
  private calculateConfidence(
    entities: ExtractedEntity[],
    intentType: IntentType,
    structure: WorkflowStructure
  ): number {
    // Simple confidence calculation based on entities and intent type
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on number of entities found
    if (entities.length > 0) {
      confidence += Math.min(0.3, entities.length * 0.1);
    }
    
    // Increase confidence if we have a clear intent type
    if (intentType !== IntentType.UNCLEAR) {
      confidence += 0.2;
    }
    
    // Cap confidence at 1.0
    return Math.min(1.0, confidence);
  }

  /**
   * Assesses the complexity of the workflow structure
   * @param structure Workflow structure
   * @private
   */
  private assessComplexity(structure: WorkflowStructure): 'simple' | 'medium' | 'complex' {
    const actionCount = structure.actions.length;
    const conditionCount = structure.conditions.length;
    const hasTrigger = !!structure.trigger;
    
    const complexityScore = 
      (actionCount * 1) + 
      (conditionCount * 2) + 
      (hasTrigger ? 1 : 0);
    
    if (complexityScore <= 1) return 'simple';
    if (complexityScore <= 3) return 'medium';
    return 'complex';
  }
}

export default IntentParser;