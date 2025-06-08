import { BaseTemplate } from '../base/base-template';

/**
 * Interface for context analysis variables
 */
interface ContextAnalysisVariables {
  /** The input text to analyze */
  input: string;
  
  /** Optional conversation history for context */
  conversationHistory?: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: string;
  }>;
  
  /** Domain or category of the conversation (e.g., 'customer_support', 'ecommerce') */
  domain?: string;
  
  /** Specific aspects to focus on in the analysis */
  focusAreas?: string[];
  
  /** Whether to include sentiment analysis */
  includeSentiment?: boolean;
  
  /** Whether to extract key entities */
  extractEntities?: boolean;
  
  /** Whether to identify user intent */
  identifyIntent?: boolean;
  
  /** Custom instructions for the analysis */
  customInstructions?: string;
}

/**
 * Template for analyzing context in user inputs
 */
export class ContextAnalysisTemplate extends BaseTemplate<ContextAnalysisVariables> {
  constructor() {
    super({
      name: 'context-analysis',
      description: 'Analyzes the context of user inputs and conversations',
      version: '1.0.0',
      variables: [
        {
          name: 'input',
          type: 'string',
          required: true,
          description: 'The input text to analyze',
        },
        {
          name: 'conversationHistory',
          type: 'array',
          required: false,
          description: 'Array of previous conversation turns for context',
        },
        {
          name: 'domain',
          type: 'string',
          required: false,
          description: 'Domain or category of the conversation',
        },
        {
          name: 'focusAreas',
          type: 'array',
          required: false,
          description: 'Specific aspects to focus on in the analysis',
        },
        {
          name: 'includeSentiment',
          type: 'boolean',
          required: false,
          description: 'Whether to include sentiment analysis',
          defaultValue: true,
        },
        {
          name: 'extractEntities',
          type: 'boolean',
          required: false,
          description: 'Whether to extract key entities',
          defaultValue: true,
        },
        {
          name: 'identifyIntent',
          type: 'boolean',
          required: false,
          description: 'Whether to identify user intent',
          defaultValue: true,
        },
        {
          name: 'customInstructions',
          type: 'string',
          required: false,
          description: 'Custom instructions for the analysis',
        },
      ],
      examples: [
        {
          input: {
            input: 'I need help with my order #12345',
            domain: 'customer_support',
            includeSentiment: true,
            extractEntities: true,
            identifyIntent: true,
          },
          expectedOutput: '{"intent":"order_inquiry","sentiment":"neutral","entities":[{"type":"order_number","value":"12345"}],"context":{"domain":"customer_support","requires_action":true},"confidence":0.92}',
        },
      ],
    });
  }

  getTemplate(): string {
    return `You are an advanced context analysis system. Your task is to analyze the provided input and conversation context to understand the user's needs and the situation.

# Input Analysis
Input: {{input}}

# Context Analysis
{{#if conversationHistory}}
## Conversation History
{{#each conversationHistory}}
{{role}}: {{content}}
{{/each}}
{{/if}}

{{#if domain}}
## Domain Context
This conversation is in the domain of: {{domain}}
{{/if}}

# Analysis Instructions
1. Analyze the input and any provided conversation history to understand the context
2. {{#if identifyIntent}}Identify the user's primary intent{{else}}Skip intent identification{{/if}}
3. {{#if includeSentiment}}Determine the sentiment of the input{{else}}Skip sentiment analysis{{/if}}
4. {{#if extractEntities}}Extract key entities mentioned{{else}}Skip entity extraction{{/if}}
5. Consider any domain-specific context

{{#if focusAreas}}
## Focus Areas
Pay special attention to these aspects:
{{#each focusAreas}}
- {{this}}
{{/each}}
{{/if}}

{{#if customInstructions}}
## Custom Instructions
{{customInstructions}}
{{/if}}

# Output Format
Respond with a JSON object containing the analysis. Include these fields:
- intent: The identified user intent (if identifyIntent is true)
- sentiment: The sentiment analysis (if includeSentiment is true)
- entities: Array of extracted entities (if extractEntities is true)
- context: Any additional contextual information
- requires_action: Boolean indicating if the input requires a response or action
- confidence: Confidence score (0-1) of the analysis

# Example Output
{
  "intent": "order_status",
  "sentiment": "neutral",
  "entities": [
    {"type": "order_number", "value": "12345"}
  ],
  "context": {
    "domain": "customer_support",
    "requires_action": true
  },
  "confidence": 0.92
}`;
  }

  /**
   * Validates the input variables against the template requirements
   * @param variables The variables to validate
   * @returns Validation result with success status and any error messages
   */
  public validateVariables(variables: Partial<ContextAnalysisVariables>): void {
    super.validateVariables(variables);
    
    // Add custom validation if needed
    if (variables.conversationHistory && !Array.isArray(variables.conversationHistory)) {
      throw new Error('conversationHistory must be an array');
    }
    
    if (variables.domain && typeof variables.domain !== 'string') {
      throw new Error('domain must be a string');
    }
  }
}

export default ContextAnalysisTemplate;