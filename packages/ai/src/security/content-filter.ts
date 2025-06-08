import { z } from 'zod';

/**
 * Severity levels for content filtering
 */
export enum ContentSeverity {
  SAFE = 'safe',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Content categories for filtering
 */
export enum ContentCategory {
  HATE = 'hate',
  HARASSMENT = 'harassment',
  SELF_HARM = 'self_harm',
  SEXUAL = 'sexual',
  VIOLENCE = 'violence',
  HATE_THREATENING = 'hate_threatening',
  GRAPHIC_VIOLENCE = 'graphic_violence',
  SELF_HARM_INTENT = 'self_harm_intent',
  SELF_HARM_INSTRUCTIONS = 'self_harm_instructions',
  HARASSMENT_THREATENING = 'harassment_threatening',
  SEXUAL_MINORS = 'sexual_minors',
  VIOLENCE_GRAPHIC = 'violence_graphic',
}

/**
 * Content filter result
 */
export interface ContentFilterResult {
  flagged: boolean;
  severity: ContentSeverity;
  categories: Partial<Record<ContentCategory, ContentSeverity>>;
  scores: Partial<Record<ContentCategory, number>>;
  filteredText?: string;
}

/**
 * Content filter options
 */
export interface ContentFilterOptions {
  /**
   * Minimum severity level to flag content
   * @default ContentSeverity.MEDIUM
   */
  threshold?: ContentSeverity;
  
  /**
   * Whether to return the filtered text with sensitive content removed
   * @default false
   */
  returnFilteredText?: boolean;
  
  /**
   * Custom replacement for filtered content
   * @default '[REDACTED]'
   */
  replacementText?: string;
}

/**
 * Default content filter options
 */
const DEFAULT_OPTIONS: Required<ContentFilterOptions> = {
  threshold: ContentSeverity.MEDIUM,
  returnFilteredText: false,
  replacementText: '[REDACTED]',
};

/**
 * Schema for validating content filter options
 */
const contentFilterOptionsSchema = z.object({
  threshold: z.nativeEnum(ContentSeverity).optional(),
  returnFilteredText: z.boolean().optional(),
  replacementText: z.string().optional(),
}).default({});

/**
 * Content filter class for detecting and filtering inappropriate content
 */
export class ContentFilter {
  private readonly options: Required<ContentFilterOptions>;
  
  /**
   * Create a new ContentFilter instance
   * @param options Content filter options
   */
  constructor(options: ContentFilterOptions = {}) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...contentFilterOptionsSchema.parse(options),
    };
  }
  
  /**
   * Check if content should be flagged based on severity threshold
   * @param severity Severity level to check
   * @returns boolean indicating if content should be flagged
   */
  private isAboveThreshold(severity: ContentSeverity): boolean {
    const severityOrder = Object.values(ContentSeverity);
    const thresholdIndex = severityOrder.indexOf(this.options.threshold);
    const severityIndex = severityOrder.indexOf(severity);
    return severityIndex >= thresholdIndex && thresholdIndex !== -1;
  }
  
  /**
   * Filter text by replacing sensitive content
   * @param text Text to filter
   * @param categories Categories to filter
   * @returns Filtered text with sensitive content replaced
   */
  private filterText(
    text: string,
    categories: ContentCategory[]
  ): string {
    // This is a simplified implementation
    // In a real-world scenario, you would use more sophisticated pattern matching
    // and potentially ML models for better accuracy
    
    // For now, we'll just return the original text
    // as this would be implemented with specific filtering logic
    return text;
  }
  
  /**
   * Scan content for inappropriate material
   * @param content Content to scan
   * @returns Content filter result
   */
  public async scan(content: string): Promise<ContentFilterResult> {
    // This is a placeholder implementation
    // In a real implementation, you would use an API or model to analyze the content
    
    const result: ContentFilterResult = {
      flagged: false,
      severity: ContentSeverity.SAFE,
      categories: {},
      scores: {},
    };
    
    // This would be replaced with actual content analysis
    // For now, we'll return a safe result
    
    if (this.options.returnFilteredText) {
      result.filteredText = this.filterText(content, []);
    }
    
    return result;
  }
  
  /**
   * Check if content is safe
   * @param content Content to check
   * @returns Promise that resolves to true if content is safe
   */
  public async isSafe(content: string): Promise<boolean> {
    const result = await this.scan(content);
    return !result.flagged;
  }
}

/**
 * Default content filter instance
 */
export const defaultContentFilter = new ContentFilter();