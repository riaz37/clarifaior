import { z } from 'zod';

/**
 * Severity levels for prompt injection detection
 */
export enum InjectionSeverity {
  SAFE = 'safe',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Types of prompt injection patterns
 */
export enum InjectionType {
  PROMPT_LEAKING = 'prompt_leaking',
  ROLE_INVERSION = 'role_inversion',
  CODE_INJECTION = 'code_injection',
  COMMAND_INJECTION = 'command_injection',
  OVERRIDE_INSTRUCTIONS = 'override_instructions',
  CONTEXT_OVERRIDE = 'context_override',
  TOKEN_OVERFLOW = 'token_overflow',
  INDIRECT_INJECTION = 'indirect_injection',
}

/**
 * Detection result for prompt injection
 */
export interface InjectionDetectionResult {
  /** Whether the input was flagged as potentially malicious */
  isInjected: boolean;
  /** The highest severity injection found */
  severity: InjectionSeverity;
  /** Specific injection types detected */
  injectionTypes: InjectionType[];
  /** Confidence scores for each injection type */
  scores: Partial<Record<InjectionType, number>>;
  /** The original input text */
  input: string;
  /** Explanation of the detection result */
  explanation?: string;
}

/**
 * Options for the prompt injection detector
 */
export interface PromptInjectionDetectorOptions {
  /**
   * Minimum severity level to flag as injected
   * @default InjectionSeverity.MEDIUM
   */
  threshold?: InjectionSeverity;
  
  /**
   * Whether to include explanation in the result
   * @default false
   */
  includeExplanation?: boolean;
  
  /**
   * Custom patterns to detect specific injection types
   */
  customPatterns?: Array<{
    type: InjectionType | string;
    pattern: RegExp;
    severity: InjectionSeverity;
    description?: string;
  }>;
}

/**
 * Default detection patterns for common prompt injection attacks
 */
const DEFAULT_PATTERNS = [
  // Prompt leaking attempts
  {
    type: InjectionType.PROMPT_LEAKING,
    pattern: /(?:show|what(?:'s| is) your|reveal|display|output).*?(?:prompt|system message|instructions?|initial prompt)/i,
    severity: InjectionSeverity.MEDIUM,
    description: 'Attempt to reveal system prompt',
  },
  
  // Role inversion attempts
  {
    type: InjectionType.ROLE_INVERSION,
    pattern: /(?:act as|pretend to be|you are now|from now on|ignore previous).*?(?:user|human|me|i am|i'm)/i,
    severity: InjectionSeverity.HIGH,
    description: 'Attempt to invert AI/human roles',
  },
  
  // Code injection patterns
  {
    type: InjectionType.CODE_INJECTION,
    pattern: /(?:```|`|\{\{|\}\}|<|>|;|&&|\|\||\$\()/,
    severity: InjectionSeverity.HIGH,
    description: 'Potential code injection pattern',
  },
  
  // Command injection patterns
  {
    type: InjectionType.COMMAND_INJECTION,
    pattern: /(?:rm -|del |erase |format |sudo |chmod |chown |\|\s*\w+\s*\||\$\()/i,
    severity: InjectionSeverity.CRITICAL,
    description: 'Potential command injection attempt',
  },
  
  // Instruction override attempts
  {
    type: InjectionType.OVERRIDE_INSTRUCTIONS,
    pattern: /(?:ignore (?:previous |all )?(?:instructions?|prompts?)|forget (?:all )?(?:instructions?|prompts?)|start(?:ing)? over|reset(?: conversation)?|new (?:chat|conversation))/i,
    severity: InjectionSeverity.HIGH,
    description: 'Attempt to override system instructions',
  },
  
  // Context override attempts
  {
    type: InjectionType.CONTEXT_OVERRIDE,
    pattern: /(?:context:.*?\n|system:.*?\n|user:.*?\n|assistant:.*?\n){3,}/i,
    severity: InjectionSeverity.MEDIUM,
    description: 'Attempt to override conversation context',
  },
  
  // Token overflow patterns (very long inputs)
  {
    type: InjectionType.TOKEN_OVERFLOW,
    pattern: /^.{1000,}$/s,
    severity: InjectionSeverity.LOW,
    description: 'Excessively long input that might be a token overflow attempt',
  },
];

/**
 * Default options for the prompt injection detector
 */
const DEFAULT_OPTIONS: Required<Omit<PromptInjectionDetectorOptions, 'customPatterns'>> & {
  customPatterns: NonNullable<PromptInjectionDetectorOptions['customPatterns']>;
} = {
  threshold: InjectionSeverity.MEDIUM,
  includeExplanation: false,
  customPatterns: [],
};

/**
 * Schema for validating detector options
 */
const detectorOptionsSchema = z.object({
  threshold: z.nativeEnum(InjectionSeverity).optional(),
  includeExplanation: z.boolean().optional(),
  customPatterns: z.array(z.object({
    type: z.string(),
    pattern: z.instanceof(RegExp),
    severity: z.nativeEnum(InjectionSeverity),
    description: z.string().optional(),
  })).optional(),
}).default({});

/**
 * Class for detecting prompt injection attacks
 */
export class PromptInjectionDetector {
  private readonly options: Required<PromptInjectionDetectorOptions> & {
    customPatterns: NonNullable<PromptInjectionDetectorOptions['customPatterns']>;
  };
  private readonly patterns: Array<{
    type: InjectionType | string;
    pattern: RegExp;
    severity: InjectionSeverity;
    description?: string;
  }>;
  
  /**
   * Create a new PromptInjectionDetector instance
   * @param options Configuration options
   */
  constructor(options: PromptInjectionDetectorOptions = {}) {
    const parsedOptions = detectorOptionsSchema.parse(options);
    
    this.options = {
      ...DEFAULT_OPTIONS,
      ...parsedOptions,
      customPatterns: parsedOptions.customPatterns || [],
    };
    
    // Combine default patterns with custom patterns
    this.patterns = [
      ...DEFAULT_PATTERNS,
      ...this.options.customPatterns,
    ];
  }
  
  /**
   * Check if a severity is above the configured threshold
   * @param severity Severity to check
   * @returns boolean indicating if severity is above threshold
   */
  private isAboveThreshold(severity: InjectionSeverity): boolean {
    const severityOrder = Object.values(InjectionSeverity);
    const thresholdIndex = severityOrder.indexOf(this.options.threshold);
    const severityIndex = severityOrder.indexOf(severity);
    return severityIndex >= thresholdIndex && thresholdIndex !== -1;
  }
  
  /**
   * Get the highest severity from an array of severities
   * @param severities Array of severities
   * @returns Highest severity level
   */
  private getHighestSeverity(severities: InjectionSeverity[]): InjectionSeverity {
    const severityOrder = Object.values(InjectionSeverity);
    let highestSeverity = InjectionSeverity.SAFE;
    
    for (const severity of severities) {
      const currentIndex = severityOrder.indexOf(severity);
      const highestIndex = severityOrder.indexOf(highestSeverity);
      
      if (currentIndex > highestIndex) {
        highestSeverity = severity;
      }
    }
    
    return highestSeverity;
  }
  
  /**
   * Detect prompt injection in the given text
   * @param input Text to analyze
   * @returns Detection result
   */
  public detect(input: string): InjectionDetectionResult {
    const detectedTypes: InjectionType[] = [];
    const scores: Record<string, number> = {};
    const explanations: string[] = [];
    
    // Check against all patterns
    for (const { type, pattern, severity, description } of this.patterns) {
      if (pattern.test(input)) {
        detectedTypes.push(type as InjectionType);
        scores[type] = (scores[type] || 0) + 1;
        
        if (this.options.includeExplanation && description) {
          explanations.push(`${type}: ${description}`);
        }
      }
    }
    
    // Determine the highest severity of detected injections
    const severities = this.patterns
      .filter(p => detectedTypes.includes(p.type as InjectionType))
      .map(p => p.severity);
    
    const highestSeverity = this.getHighestSeverity(severities);
    const isInjected = this.isAboveThreshold(highestSeverity);
    
    // Prepare the result
    const result: InjectionDetectionResult = {
      isInjected,
      severity: highestSeverity,
      injectionTypes: [...new Set(detectedTypes)],
      scores,
      input,
    };
    
    // Add explanation if requested
    if (this.options.includeExplanation && explanations.length > 0) {
      result.explanation = explanations.join('\n');
    }
    
    return result;
  }
  
  /**
   * Check if the input is safe (not injected)
   * @param input Text to check
   * @returns boolean indicating if input is safe
   */
  public isSafe(input: string): boolean {
    const result = this.detect(input);
    return !result.isInjected;
  }
}

/**
 * Default prompt injection detector instance
 */
export const defaultPromptInjectionDetector = new PromptInjectionDetector();