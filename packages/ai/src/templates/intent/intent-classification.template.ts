import { BaseTemplate } from '../base/base-template';

/**
 * Interface for intent classification variables
 */
interface IntentClassificationVariables {
  /** The input text to classify */
  text: string;
  
  /** List of possible intents with descriptions */
  intents: Array<{
    name: string;
    description: string;
    examples?: string[];
  }>;
  
  /** Optional conversation history for context */
  conversationHistory?: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  
  /** Whether to include confidence scores */
  includeConfidence?: boolean;
  
  /** Whether to include the reasoning behind the classification */
  includeReasoning?: boolean;
  
  /** Whether to include the most relevant text spans that influenced the decision */
  includeRelevantSpans?: boolean;
  
  /** Language of the input text (ISO 639-1 code) */
  language?: string;
  
  /** Whether to allow multiple intents to be detected */
  allowMultipleIntents?: boolean;
  
  /** Maximum number of intents to return (when allowMultipleIntents is true) */
  maxIntents?: number;
  
  /** Minimum confidence threshold (0-1) */
  confidenceThreshold?: number;
}

/**
 * Template for classifying user intents from text
 */
export class IntentClassificationTemplate extends BaseTemplate<IntentClassificationVariables> {
  constructor() {
    super({
      name: 'intent-classification',
      description: 'Classifies user intents from text',
      version: '1.0.0',
      variables: [
        {
          name: 'text',
          type: 'string',
          required: true,
          description: 'The input text to classify',
        },
        {
          name: 'intents',
          type: 'array',
          required: true,
          description: 'List of possible intents with descriptions',
        },
        {
          name: 'conversationHistory',
          type: 'array',
          required: false,
          description: 'Optional conversation history for context',
        },
        {
          name: 'includeConfidence',
          type: 'boolean',
          required: false,
          defaultValue: true,
          description: 'Whether to include confidence scores',
        },
        {
          name: 'includeReasoning',
          type: 'boolean',
          required: false,
          defaultValue: false,
          description: 'Whether to include the reasoning behind the classification',
        },
        {
          name: 'includeRelevantSpans',
          type: 'boolean',
          required: false,
          defaultValue: false,
          description: 'Whether to include relevant text spans that influenced the decision',
        },
        {
          name: 'language',
          type: 'string',
          required: false,
          defaultValue: 'en',
          description: 'Language of the input text (ISO 639-1 code)',
        },
        {
          name: 'allowMultipleIntents',
          type: 'boolean',
          required: false,
          defaultValue: false,
          description: 'Whether to allow multiple intents to be detected',
        },
        {
          name: 'maxIntents',
          type: 'number',
          required: false,
          description: 'Maximum number of intents to return (when allowMultipleIntents is true)',
          defaultValue: 3,
        },
        {
          name: 'confidenceThreshold',
          type: 'number',
          required: false,
          description: 'Minimum confidence threshold (0-1)',
          defaultValue: 0.5,
        },
      ],
      examples: [
        {
          input: {
            text: 'I need to reset my password',
            intents: [
              { 
                name: 'password_reset', 
                description: 'User wants to reset their password',
                examples: ['I forgot my password', 'How do I reset my password?']
              },
              { 
                name: 'account_lockout', 
                description: 'User is locked out of their account',
                examples: ['I\'m locked out', 'My account is locked']
              },
              { 
                name: 'login_help', 
                description: 'User needs help with logging in',
                examples: ['I can\'t log in', 'Having trouble signing in']
              }
            ],
            includeConfidence: true,
            includeReasoning: true
          },
          expectedOutput: `{
            "intent": "password_reset",
            "confidence": 0.95,
            "reasoning": "The user explicitly mentions 'reset my password', which directly matches the password_reset intent.",
            "alternateIntents": [
              {
                "intent": "login_help",
                "confidence": 0.3,
                "reasoning": "The user might need help with logging in, but they specifically mentioned password reset."
              },
              {
                "intent": "account_lockout",
                "confidence": 0.1,
                "reasoning": "No mention of being locked out, just a password reset request."
              }
            ]
          }`
        }
      ],
    });
  }

  getTemplate(): string {
    return `You are an advanced intent classification system. Your task is to analyze the provided text and determine the user's intent from the given options.

# Input Text
{{text}}

# Available Intents
{{#each intents}}
## {{name}}
{{description}}
{{#if examples}}
### Examples:
{{#each examples}}
- {{this}}
{{/each}}
{{/if}}
{{/each}}

{{#if conversationHistory}}
# Conversation History
{{#each conversationHistory}}
{{role}}: {{content}}
{{/each}}
{{/if}}

# Classification Instructions
1. Carefully analyze the input text and conversation history (if provided)
2. Determine the most likely intent from the available options
{{#if allowMultipleIntents}}
3. You may select up to {{maxIntents}} intents if the input contains multiple distinct intents
{{else}}
3. Select only the single most appropriate intent
{{/if}}
4. {{#if includeConfidence}}Provide a confidence score (0-1) for your classification{{/if}}
5. {{#if includeReasoning}}Explain your reasoning for the classification{{/if}}
6. {{#if includeRelevantSpans}}Identify the most relevant text spans that influenced your decision{{/if}}

{{#if confidenceThreshold}}
# Confidence Threshold
Only return intents with confidence >= {{confidenceThreshold}}
{{/if}}

# Output Format
Respond with a JSON object containing the classification results. Include these fields:
{{#if allowMultipleIntents}}
- "intents": Array of detected intents, sorted by confidence (highest first)
  - "intent": The name of the intent
  {{#if includeConfidence}}- "confidence": Confidence score (0-1){{/if}}
  {{#if includeReasoning}}- "reasoning": Explanation of why this intent was chosen{{/if}}
  {{#if includeRelevantSpans}}- "relevantSpans": Array of relevant text spans{{/if}}
{{else}}
- "intent": The name of the most likely intent
{{#if includeConfidence}}- "confidence": Confidence score (0-1){{/if}}
{{#if includeReasoning}}- "reasoning": Explanation of why this intent was chosen{{/if}}
{{#if includeRelevantSpans}}- "relevantSpans": Array of relevant text spans{{/if}}
- "alternateIntents": Array of other possible intents with lower confidence
{{/if}}

# Example Output
{
  {{#if allowMultipleIntents}}
  "intents": [
    {
      "intent": "intent_name",
      {{#if includeConfidence}}"confidence": 0.95,{{/if}}
      {{#if includeReasoning}}"reasoning": "Explanation of classification",{{/if}}
      {{#if includeRelevantSpans}}"relevantSpans": ["relevant text"]{{/if}}
    }
  ]
  {{else}}
  "intent": "intent_name"
  {{#if includeConfidence}},
  "confidence": 0.95{{/if}}
  {{#if includeReasoning}},
  "reasoning": "Explanation of classification"{{/if}}
  {{#if includeRelevantSpans}},
  "relevantSpans": ["relevant text"]{{/if}}
  {{/if}}
}`;
  }

  /**
   * Validates the input variables
   * @param variables The variables to validate
   */
  public validateVariables(variables: Partial<IntentClassificationVariables>): void {
    super.validateVariables(variables);
    
    if (variables.intents && !Array.isArray(variables.intents)) {
      throw new Error('intents must be an array');
    }
    
    if (variables.maxIntents !== undefined && 
        (typeof variables.maxIntents !== 'number' || variables.maxIntents < 1)) {
      throw new Error('maxIntents must be a positive number');
    }
    
    if (variables.confidenceThreshold !== undefined && 
        (typeof variables.confidenceThreshold !== 'number' || 
         variables.confidenceThreshold < 0 || 
         variables.confidenceThreshold > 1)) {
      throw new Error('confidenceThreshold must be a number between 0 and 1');
    }
    
    if (variables.language && typeof variables.language !== 'string') {
      throw new Error('language must be a string (ISO 639-1 code)');
    }
  }
}

export default IntentClassificationTemplate;