export class IntentParserAgent extends BaseAgent {
    constructor(
      private llmProvider: BaseLLMProvider,
      private entityExtractor: EntityExtractor,
      private templateService: TemplateService
    ) {
      super('intent-parser');
    }
  
    async parseIntent(input: string, context?: ConversationContext): Promise<ParsedIntent> {
      // Extract entities first
      const entities = await this.entityExtractor.extractEntities(input);
      
      // Classify intent type
      const intentType = await this.classifyIntentType(input, entities);
      
      // Extract workflow structure
      const workflowStructure = await this.extractWorkflowStructure(input, entities, context);
      
      // Calculate confidence score
      const confidence = this.calculateConfidence(entities, intentType, workflowStructure);
  
      return {
        type: intentType,
        entities,
        structure: workflowStructure,
        confidence,
        originalInput: input,
        context: context?.summary,
        metadata: {
          processingTime: Date.now(),
          entitiesFound: entities.length,
          complexity: this.assessComplexity(workflowStructure)
        }
      };
    }
  
    private async classifyIntentType(
      input: string, 
      entities: ExtractedEntity[]
    ): Promise<IntentType> {
      const template = this.templateService.getTemplate('intent-classification');
      
      const prompt = template.format({
        input,
        entities: entities.map(e => `${e.type}: ${e.value}`),
        intentTypes: Object.values(IntentType)
      });
  
      const response = await this.llmProvider.generateCompletion(prompt, {
        temperature: 0.1,
        maxTokens: 50
      });
  
      return this.parseIntentTypeFromResponse(response.content);
    }
  
    private async extractWorkflowStructure(
      input: string,
      entities: ExtractedEntity[],
      context?: ConversationContext
    ): Promise<WorkflowStructure> {
      const template = this.templateService.getTemplate('workflow-structure-extraction');
      
      const prompt = template.format({
        input,
        entities,
        context: context?.relevantWorkflows || [],
        structureSchema: this.getWorkflowStructureSchema()
      });
  
      return await this.llmProvider.generateStructuredOutput<WorkflowStructure>(
        prompt,
        this.getWorkflowStructureSchema()
      );
    }
  
    private calculateConfidence(
      entities: ExtractedEntity[],
      intentType: IntentType,
      structure: WorkflowStructure
    ): number {
      let confidence = 0.5; // Base confidence
  
      // Boost confidence based on entity clarity
      const highConfidenceEntities = entities.filter(e => e.confidence > 0.8);
      confidence += (highConfidenceEntities.length / entities.length) * 0.3;
  
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
  }