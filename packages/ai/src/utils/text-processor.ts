// Token counter will be used if available
// @ts-ignore - Will be fixed when TokenCounter is implemented
type TokenCounter = any;

/**
 * Interface for text processing options
 */
export interface TextProcessingOptions {
  /** Whether to convert text to lowercase */
  lowercase?: boolean;
  /** Whether to trim whitespace from the beginning and end of text */
  trim?: boolean;
  /** Whether to remove extra whitespace between words */
  normalizeWhitespace?: boolean;
  /** Whether to remove diacritics/accents from characters */
  removeDiacritics?: boolean;
  /** Whether to remove special characters */
  removeSpecialChars?: boolean;
  /** Whether to remove numbers */
  removeNumbers?: boolean;
  /** Whether to remove URLs */
  removeUrls?: boolean;
  /** Whether to remove email addresses */
  removeEmails?: boolean;
  /** Whether to remove HTML tags */
  removeHtmlTags?: boolean;
  /** Whether to remove stop words */
  removeStopWords?: boolean;
  /** Custom stop words to remove (only used if removeStopWords is true) */
  customStopWords?: string[];
  /** Language for stop words (default: 'en') */
  language?: string;
  /** Maximum length of the processed text (in characters) */
  maxLength?: number;
  /** Whether to truncate the text to maxLength or throw an error */
  truncate?: boolean;
}

/**
 * Default text processing options
 */
const DEFAULT_OPTIONS: TextProcessingOptions = {
  lowercase: true,
  trim: true,
  normalizeWhitespace: true,
  removeDiacritics: false,
  removeSpecialChars: false,
  removeNumbers: false,
  removeUrls: true,
  removeEmails: true,
  removeHtmlTags: true,
  removeStopWords: false,
  language: 'en',
  truncate: true,
};

/**
 * Common stop words for English
 */
const ENGLISH_STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'if', 'in',
  'into', 'is', 'it', 'no', 'not', 'of', 'on', 'or', 'such', 'that', 'the', 'their',
  'then', 'there', 'these', 'they', 'this', 'to', 'was', 'will', 'with', 'i', 'you',
  'he', 'she', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his',
  'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs', 'myself',
  'yourself', 'himself', 'hers', 'itself', 'ourselves', 'yourselves', 'themselves'
]);

/**
 * TextProcessor provides utility methods for text processing tasks
 */
export class TextProcessor {
  private tokenCounter?: TokenCounter;
  private defaultOptions: TextProcessingOptions;

  constructor(options: Partial<TextProcessingOptions> = {}) {
    this.defaultOptions = { ...DEFAULT_OPTIONS, ...options };
    try {
      // @ts-ignore - Will be fixed when TokenCounter is implemented
      this.tokenCounter = new TokenCounter(this.defaultOptions.tokenCounterOptions || {});
    } catch (error) {
      console.warn('TokenCounter not available, falling back to word count');
      this.tokenCounter = undefined;
    }
  }

  /**
   * Process text with the given options
   * @param text The input text to process
   * @param options Processing options
   * @returns Processed text
   */
  process(text: string, options: TextProcessingOptions = {}): string {
    if (typeof text !== 'string') {
      throw new Error('Input must be a string');
    }

    // Merge default options with provided options
    const mergedOptions = { ...this.defaultOptions, ...options };
    let processedText = text;

    // Apply processing steps in order
    const processors: Array<[boolean, (t: string) => string]> = [
      [!!mergedOptions.removeHtmlTags, this.removeHtmlTags],
      [!!mergedOptions.removeUrls, this.removeUrls],
      [!!mergedOptions.removeEmails, this.removeEmails],
      [!!mergedOptions.removeNumbers, this.removeNumbers],
      [!!mergedOptions.removeSpecialChars, this.removeSpecialChars],
      [!!mergedOptions.removeDiacritics, this.removeDiacritics],
      [!!mergedOptions.normalizeWhitespace, this.normalizeWhitespace],
      [!!mergedOptions.trim, this.trim],
      [!!mergedOptions.lowercase, this.toLowerCase],
      [!!mergedOptions.removeStopWords, (t) => this.removeStopWords(t, mergedOptions.language, mergedOptions.customStopWords)],
      [true, (t) => this.truncateText(t, mergedOptions.maxLength, mergedOptions.truncate)],
    ];

    for (const [condition, processor] of processors) {
      if (condition) {
        processedText = processor.call(this, processedText);
      }
    }

    return processedText;
  }

  /**
   * Tokenize text into words
   * @param text Input text
   * @returns Array of tokens
   */
  tokenize(text: string): string[] {
    if (!text) return [];
    return text.split(/\s+/).filter(token => token.length > 0);
  }

  /**
   * Count tokens in text
   * @param text Input text
   * @returns Number of tokens
   */
  countTokens(text: string): number {
    if (!this.tokenCounter || !this.tokenCounter.count) {
      return this.countWords(text);
    }
    
    try {
      // @ts-ignore - Will be fixed when TokenCounter is implemented
      return this.tokenCounter.count(text);
    } catch (error) {
      console.warn('Failed to count tokens, falling back to word count', error);
      return this.countWords(text);
    }
  }

  /**
   * Count words in text
   * @param text Input text
   * @returns Number of words
   */
  private countWords(text: string): number {
    return this.extractWords(text).length;
  }

  /**
   * Truncate text to a maximum number of characters
   * @param text Input text
   * @param maxLength Maximum length in characters
   * @param truncate Whether to truncate or throw an error
   * @returns Truncated text
   */
  truncateText(text: string, maxLength?: number, truncate: boolean = true): string {
    if (!maxLength) return text;
    
    if (text.length <= maxLength) return text;
    
    if (!truncate) {
      throw new Error(`Text exceeds maximum length of ${maxLength} characters`);
    }
    
    return text.substring(0, maxLength).trim() + '...';
  }

  /**
   * Remove HTML tags from text
   * @param text Input text
   * @returns Text with HTML tags removed
   */
  removeHtmlTags(text: string): string {
    return text.replace(/<[^>]*>/g, ' ');
  }

  /**
   * Remove URLs from text
   * @param text Input text
   * @returns Text with URLs removed
   */
  removeUrls(text: string): string {
    return text.replace(/https?:\/\/[^\s]+/g, '');
  }

  /**
   * Remove email addresses from text
   * @param text Input text
   * @returns Text with email addresses removed
   */
  removeEmails(text: string): string {
    return text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '');
  }

  /**
   * Remove numbers from text
   * @param text Input text
   * @returns Text with numbers removed
   */
  removeNumbers(text: string): string {
    return text.replace(/\d+/g, '');
  }

  /**
   * Remove special characters from text
   * @param text Input text
   * @returns Text with special characters removed
   */
  removeSpecialChars(text: string): string {
    // Keep letters, numbers, and basic punctuation
    return text.replace(/[^\w\s.,!?;:']/g, '');
  }

  /**
   * Remove diacritics/accents from text
   * @param text Input text
   * @returns Text with diacritics removed
   */
  removeDiacritics(text: string): string {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  /**
   * Normalize whitespace in text
   * @param text Input text
   * @returns Text with normalized whitespace
   */
  normalizeWhitespace(text: string): string {
    return text.replace(/\s+/g, ' ');
  }

  /**
   * Trim whitespace from the beginning and end of text
   * @param text Input text
   * @returns Trimmed text
   */
  trim(text: string): string {
    return text.trim();
  }

  /**
   * Convert text to lowercase
   * @param text Input text
   * @returns Lowercase text
   */
  toLowerCase(text: string): string {
    return text.toLowerCase();
  }

  /**
   * Remove stop words from text
   * @param text Input text
   * @param language Language code (default: 'en')
   * @param customStopWords Custom stop words to use
   * @returns Text with stop words removed
   */
  removeStopWords(
    text: string,
    language: string = 'en',
    customStopWords?: string[]
  ): string {
    let stopWords: Set<string>;
    
    if (customStopWords && customStopWords.length > 0) {
      stopWords = new Set(customStopWords.map(w => w.toLowerCase()));
    } else if (language === 'en') {
      stopWords = ENGLISH_STOP_WORDS;
    } else {
      // For other languages, you would load the appropriate stop words
      console.warn(`No stop words available for language: ${language}`);
      return text;
    }

    return text
      .split(/\s+/)
      .filter(word => {
        // Remove punctuation from word for comparison
        const cleanWord = word.replace(/[^\w']/g, '').toLowerCase();
        return cleanWord && !stopWords.has(cleanWord);
      })
      .join(' ');
  }

  /**
   * Extract sentences from text
   * @param text Input text
   * @returns Array of sentences
   */
  extractSentences(text: string): string[] {
    if (!text) return [];
    // Simple sentence splitting - can be enhanced with NLP for better accuracy
    return text
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  /**
   * Extract words from text
   * @param text Input text
   * @returns Array of words
   */
  extractWords(text: string): string[] {
    if (!text) return [];
    return text.match(/\b[\w']+\b/g) || [];
  }

  /**
   * Calculate reading time for text
   * @param text Input text
   * @param wordsPerMinute Average reading speed (words per minute)
   * @returns Reading time in minutes
   */
  calculateReadingTime(text: string, wordsPerMinute: number = 200): number {
    const wordCount = this.extractWords(text).length;
    return Math.ceil(wordCount / wordsPerMinute) || 1;
  }

  /**
   * Generate an excerpt from text
   * @param text Input text
   * @param maxLength Maximum length of excerpt in words
   * @returns Excerpt text
   */
  generateExcerpt(text: string, maxLength: number = 50): string {
    const words = this.extractWords(text);
    if (words.length <= maxLength) return text;
    
    return words.slice(0, maxLength).join(' ') + '...';
  }
}

// Default export with default options
export const defaultTextProcessor = new TextProcessor();

// Utility functions
export const textUtils = {
  /**
   * Check if a string is empty or contains only whitespace
   */
  isEmpty: (text: string): boolean => {
    return !text || text.trim().length === 0;
  },

  /**
   * Convert a string to title case
   */
  toTitleCase: (text: string): string => {
    return text
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  },

  /**
   * Generate a URL-friendly slug from text
   */
  slugify: (text: string, separator: string = '-'): string => {
    return text
      .toString()
      .toLowerCase()
      .normalize('NFD') // Split accented characters into base + diacritic
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^\w\s-]/g, '') // Remove non-word characters
      .replace(/\s+/g, separator) // Replace spaces with separator
      .replace(new RegExp(`^${separator}+|${separator}+$`, 'g'), ''); // Trim separators
  },

  /**
   * Truncate text to a specified length and add an ellipsis
   */
  truncate: (text: string, maxLength: number, ellipsis: string = '...'): string => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + ellipsis;
  },

  /**
   * Remove duplicate lines from text
   */
  removeDuplicateLines: (text: string): string => {
    const lines = text.split('\n');
    const uniqueLines = [...new Set(lines)];
    return uniqueLines.join('\n');
  },

  /**
   * Count the number of words in text
   */
  wordCount: (text: string): number => {
    if (!text) return 0;
    return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  },

  /**
   * Count the number of characters in text (excluding spaces)
   */
  charCount: (text: string, includeSpaces: boolean = false): number => {
    if (!text) return 0;
    return includeSpaces ? text.length : text.replace(/\s+/g, '').length;
  },
};
