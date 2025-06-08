import { ExtractedEntity } from '../agents/intent-parser.agent';

export type EntityType = 'trigger' | 'action' | 'condition' | 'integration' | 'schedule' | 'data';

/**
 * Options for entity extraction
 */
export interface EntityExtractorOptions {
  /** Whether to include detailed metadata in extracted entities */
  includeMetadata?: boolean;
  /** Custom patterns to extract entities */
  customPatterns?: EntityPattern[];
  /** Whether to enable built-in pattern matching */
  enableBuiltInPatterns?: boolean;
}

/**
 * Pattern definition for entity extraction
 */
export interface EntityPattern {
  /** Unique identifier for the pattern */
  id: string;
  /** Regular expression pattern to match the entity */
  pattern: RegExp;
  /** Type of the entity (must be one of the allowed workflow entity types) */
  type: EntityType;
  /** Priority of the pattern (higher means checked first) */
  priority?: number;
  /** Function to transform the matched value */
  transform?: (match: RegExpMatchArray) => string;
  /** Additional metadata to include with the entity */
  metadata?: Record<string, any>;
}

/**
 * Extracted entity with additional extraction information
 */
export interface ExtractedEntityWithContext extends ExtractedEntity {
  /** The pattern ID that matched this entity */
  patternId: string;
  /** The full text that was matched */
  matchedText: string;
  /** Character positions where the entity was found */
  position: {
    start: number;
    end: number;
  };
}

/**
 * Entity extractor for identifying and extracting structured information from text
 */
export class EntityExtractor {
  private options: Required<EntityExtractorOptions>;
  private patterns: EntityPattern[] = [];

  constructor(options: EntityExtractorOptions = {}) {
    this.options = {
      includeMetadata: options.includeMetadata ?? true,
      customPatterns: options.customPatterns ?? [],
      enableBuiltInPatterns: options.enableBuiltInPatterns ?? true,
    };

    this.initializePatterns();
  }

  /**
   * Initialize patterns including built-in and custom patterns
   */
  private initializePatterns(): void {
    // Add built-in patterns if enabled
    if (this.options.enableBuiltInPatterns) {
      this.patterns.push(...this.getBuiltInPatterns());
    }

    // Add custom patterns
    if (this.options.customPatterns?.length) {
      this.patterns.push(...this.options.customPatterns);
    }

    // Sort patterns by priority (highest first)
    this.patterns.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Get built-in entity patterns
   */
  private getBuiltInPatterns(): EntityPattern[] {
    return [
          // Schedule patterns (dates and times)
      {
        id: 'schedule_date_iso',
        type: 'schedule',
        pattern: /\b\d{4}-\d{2}-\d{2}\b/g,
        priority: 100,
        transform: (match) => `on ${match[0]}`,
      },
      {
        id: 'schedule_date_slash',
        type: 'schedule',
        pattern: /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
        priority: 90,
        transform: (match) => `on ${match[0]}`,
      },
      {
        id: 'schedule_time_24h',
        type: 'schedule',
        pattern: /\b(?:[01]?\d|2[0-3]):[0-5]\d\b/g,
        priority: 100,
        transform: (match) => `at ${match[0]}`,
      },
      {
        id: 'schedule_time_12h',
        type: 'schedule',
        pattern: /\b(?:1[0-2]|0?[1-9]):[0-5]\d\s?(?:[aApP][mM])\b/gi,
        priority: 90,
        transform: (match) => `at ${match[0]}`,
      },
      
          // Action patterns
      {
        id: 'action_create',
        type: 'action',
        pattern: /\b(create|make|add|new)\b/gi,
        priority: 80,
        transform: (match) => match[0].toLowerCase(),
      },
      {
        id: 'action_update',
        type: 'action',
        pattern: /\b(update|modify|change|edit)\b/gi,
        priority: 80,
        transform: (match) => match[0].toLowerCase(),
      },
      {
        id: 'action_delete',
        type: 'action',
        pattern: /\b(delete|remove|erase|clear)\b/gi,
        priority: 80,
        transform: (match) => match[0].toLowerCase(),
      },
      
          // Trigger patterns
      {
        id: 'trigger_keywords',
        type: 'trigger',
        pattern: /\b(when|if|on|after|before|once|every|whenever|new|received|detected|created|updated|deleted|changed)\b/gi,
        priority: 70,
      },
      
      // Condition patterns
      {
        id: 'condition_keywords',
        type: 'condition',
        pattern: /\b(if|when|unless|while|until|provided that|as long as|in case|where|given that)\b/gi,
        priority: 60,
      },
      
          // Integration patterns
      {
        id: 'integration_names',
        type: 'integration',
        pattern: /\b(google|slack|github|gitlab|jira|trello|asana|salesforce|hubspot|zapier|airtable|notion|discord|teams|outlook|gmail|aws|azure|stripe|paypal|shopify|wordpress|squarespace|webflow|wix|squarespace|zendesk|intercom|mailchimp|sendgrid|twilio|stripe|paypal|quickbooks|xero|quickbooks|monday\.com|clickup|linear|figma|sketch|adobe|dropbox|box|onedrive|zoom|meet|teams|webex|slack|discord|microsoft|google|apple|facebook|twitter|instagram|linkedin|youtube|tiktok|pinterest|reddit|tumblr|medium|dev\.to|hashnode|substack|ghost|wordpress\.com|wix\.com|squarespace\.com|webflow\.com|shopify\.com|zendesk\.com|intercom\.com|mailchimp\.com|sendgrid\.com|twilio\.com|stripe\.com|paypal\.com|quickbooks\.com|xero\.com|monday\.com|clickup\.com|linear\.app|figma\.com|sketch\.com|adobe\.com|dropbox\.com|box\.com|onedrive\.live\.com|zoom\.us|meet\.google\.com|teams\.microsoft\.com|webex\.com|slack\.com|discord\.com|microsoft\.com|google\.com|apple\.com|facebook\.com|twitter\.com|instagram\.com|linkedin\.com|youtube\.com|tiktok\.com|pinterest\.com|reddit\.com|tumblr\.com|medium\.com|dev\.to|hashnode\.dev|substack\.com|ghost\.org)\b/gi,
        priority: 50,
        transform: (match) => match[0].toLowerCase(),
      },
      
      // Data patterns
      {
        id: 'data_patterns',
        type: 'data',
        pattern: /\b(\w+@\w+\.\w+)|(https?:\/\/[^\s]+)|(\$\w+)|(\d+(\.\d+)?)|("[^"]+"|'[^']+')/gi,
        priority: 40,
      }
    ];
  }

  /**
   * Extract entities from text
   * @param text Input text to extract entities from
   * @returns Array of extracted entities
   */
  async extract(text: string): Promise<ExtractedEntityWithContext[]> {
    if (!text?.trim()) {
      return [];
    }

    const entities: ExtractedEntityWithContext[] = [];
    const seen = new Set<string>();

    for (const pattern of this.patterns) {
      const matches = text.matchAll(pattern.pattern);
      
      for (const match of matches) {
        if (!match[0] || !match.index) continue;
        
        const matchedText = match[0];
        const value = pattern.transform ? pattern.transform(match) : matchedText;
        const entityKey = `${pattern.type}:${value}:${match.index}`;
        
        // Skip duplicates
        if (seen.has(entityKey)) continue;
        seen.add(entityKey);
        
        const entity: ExtractedEntityWithContext = {
          type: pattern.type as EntityType,
          value,
          confidence: 0.9, // Default high confidence for pattern matches
          patternId: pattern.id,
          matchedText,
          position: {
            start: match.index,
            end: match.index + matchedText.length,
          },
        };
        
        // Include metadata if enabled
        if (this.options.includeMetadata) {
          entity.metadata = {
            ...pattern.metadata,
            source: 'pattern',
            pattern: pattern.pattern.toString(),
          };
        }
        
        entities.push(entity);
      }
    }

    // Sort entities by their position in the text
    return entities.sort((a, b) => a.position.start - b.position.start);
  }

  /**
   * Add a custom pattern for entity extraction
   * @param pattern Pattern to add
   */
  addPattern(pattern: EntityPattern): void {
    this.patterns.push(pattern);
    // Re-sort patterns by priority
    this.patterns.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Remove patterns by ID
   * @param patternIds Array of pattern IDs to remove
   */
  removePatterns(patternIds: string[]): void {
    this.patterns = this.patterns.filter(p => !patternIds.includes(p.id));
  }

  /**
   * Clear all patterns
   */
  clearPatterns(): void {
    this.patterns = [];
  }
}

export default EntityExtractor;
