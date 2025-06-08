import { BaseTemplate } from '../base/base-template';

/**
 * Interface for entity extraction variables
 */
interface EntityExtractionVariables {
  /** The input text to extract entities from */
  text: string;
  
  /** List of entity types to extract */
  entityTypes: string[];
  
  /** Optional context to help with disambiguation */
  context?: string;
  
  /** Whether to include confidence scores */
  includeConfidence?: boolean;
  
  /** Whether to include the text span of each entity */
  includeSpans?: boolean;
  
  /** Whether to include additional metadata about entities */
  includeMetadata?: boolean;
  
  /** Maximum number of entities to extract (0 for no limit) */
  maxEntities?: number;
  
  /** Language of the input text (ISO 639-1 code) */
  language?: string;
  
  /** Whether to resolve coreferences (e.g., pronouns to their references) */
  resolveCoreferences?: boolean;
}

/**
 * Template for extracting entities from text
 */
export class EntityExtractionTemplate extends BaseTemplate<EntityExtractionVariables> {
  constructor() {
    super({
      name: 'entity-extraction',
      description: 'Extracts structured entities from text',
      version: '1.0.0',
      variables: [
        {
          name: 'text',
          type: 'string',
          required: true,
          description: 'The input text to extract entities from',
        },
        {
          name: 'entityTypes',
          type: 'array',
          required: true,
          description: 'List of entity types to extract (e.g., ["PERSON", "ORG", "DATE"])',
        },
        {
          name: 'context',
          type: 'string',
          required: false,
          description: 'Additional context to help with entity disambiguation',
        },
        {
          name: 'includeConfidence',
          type: 'boolean',
          required: false,
          defaultValue: true,
          description: 'Whether to include confidence scores for extracted entities',
        },
        {
          name: 'includeSpans',
          type: 'boolean',
          required: false,
          defaultValue: true,
          description: 'Whether to include character spans for extracted entities',
        },
        {
          name: 'includeMetadata',
          type: 'boolean',
          required: false,
          defaultValue: false,
          description: 'Whether to include additional metadata about entities',
        },
        {
          name: 'maxEntities',
          type: 'number',
          required: false,
          description: 'Maximum number of entities to extract (0 for no limit)',
          defaultValue: 0,
        },
        {
          name: 'language',
          type: 'string',
          required: false,
          description: 'Language of the input text (ISO 639-1 code, e.g., "en")',
          defaultValue: 'en',
        },
        {
          name: 'resolveCoreferences',
          type: 'boolean',
          required: false,
          defaultValue: false,
          description: 'Whether to resolve coreferences (e.g., pronouns to their references)',
        },
      ],
      examples: [
        {
          input: {
            text: 'Apple is looking to buy U.K. startup for $1 billion next month.',
            entityTypes: ['ORG', 'GPE', 'MONEY', 'DATE'],
            includeConfidence: true,
            includeSpans: true,
          },
          expectedOutput: `{
            "entities": [
              {
                "text": "Apple",
                "type": "ORG",
                "start": 0,
                "end": 5,
                "confidence": 0.98
              },
              {
                "text": "U.K.",
                "type": "GPE",
                "start": 25,
                "end": 29,
                "confidence": 0.95
              },
              {
                "text": "$1 billion",
                "type": "MONEY",
                "start": 39,
                "end": 48,
                "confidence": 0.99
              },
              {
                "text": "next month",
                "type": "DATE",
                "start": 53,
                "end": 63,
                "confidence": 0.9
              }
            ]
          }`,
        },
      ],
    });
  }

  getTemplate(): string {
    return `You are an advanced entity extraction system. Your task is to identify and extract entities from the provided text based on the specified entity types.

# Input Text
{{text}}

# Entity Types to Extract
{{#each entityTypes}}
- {{this}}
{{/each}}

{{#if context}}
# Additional Context
{{context}}
{{/if}}

# Extraction Instructions
1. Analyze the text and identify all mentions of the specified entity types
2. For each entity, extract the following information:
   - The exact text span of the entity
   - The entity type (from the provided list)
   {{#if includeConfidence}}- Confidence score (0-1){{/if}}
   {{#if includeSpans}}- Start and end character positions{{/if}}
   {{#if includeMetadata}}- Additional metadata (e.g., normalized values, links){{/if}}

{{#if maxEntities}}
# Limit
Extract a maximum of {{maxEntities}} entities.
{{/if}}

{{#if resolveCoreferences}}
# Coreference Resolution
Resolve any coreferences (e.g., pronouns to their referents) before extracting entities.
{{/if}}

# Output Format
Respond with a JSON object containing an "entities" array. Each entity should include:
- "text": The extracted entity text
- "type": The entity type
{{#if includeConfidence}}- "confidence": Confidence score (0-1){{/if}}
{{#if includeSpans}}- "start": Start character position
- "end": End character position{{/if}}
{{#if includeMetadata}}- "metadata": Any additional metadata{{/if}}

# Example Output
{
  "entities": [
    {
      "text": "Apple",
      "type": "ORG"
      {{#if includeConfidence}},
      "confidence": 0.98{{/if}}
      {{#if includeSpans}},
      "start": 0,
      "end": 5{{/if}}
      {{#if includeMetadata}},
      "metadata": {
        "normalized": {"id": "Q312", "name": "Apple Inc.", "wikipedia": "https://en.wikipedia.org/wiki/Apple_Inc."}
      }{{/if}}
    }
  ]
}`;
  }

  /**
   * Validates the input variables
   * @param variables The variables to validate
   */
  public validateVariables(variables: Partial<EntityExtractionVariables>): void {
    super.validateVariables(variables);
    
    if (variables.entityTypes && !Array.isArray(variables.entityTypes)) {
      throw new Error('entityTypes must be an array');
    }
    
    if (variables.maxEntities !== undefined && 
        (typeof variables.maxEntities !== 'number' || variables.maxEntities < 0)) {
      throw new Error('maxEntities must be a non-negative number');
    }
    
    if (variables.language && typeof variables.language !== 'string') {
      throw new Error('language must be a string (ISO 639-1 code)');
    }
  }
}

export default EntityExtractionTemplate;