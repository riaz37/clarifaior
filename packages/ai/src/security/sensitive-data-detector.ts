import { z } from 'zod';

/**
 * Types of sensitive data that can be detected
 */
export enum SensitiveDataType {
  // Personal Identifiable Information (PII)
  EMAIL = 'email',
  PHONE = 'phone',
  SSN = 'ssn',
  PASSPORT = 'passport',
  DRIVER_LICENSE = 'driver_license',
  IP_ADDRESS = 'ip_address',
  MAC_ADDRESS = 'mac_address',
  
  // Financial Information
  CREDIT_CARD = 'credit_card',
  BANK_ACCOUNT = 'bank_account',
  ROUTING_NUMBER = 'routing_number',
  SWIFT_CODE = 'swift_code',
  IBAN = 'iban',
  
  // Authentication & Secrets
  API_KEY = 'api_key',
  PASSWORD = 'password',
  SECRET_KEY = 'secret_key',
  ACCESS_TOKEN = 'access_token',
  REFRESH_TOKEN = 'refresh_token',
  
  // Location Data
  COORDINATES = 'coordinates',
  ADDRESS = 'address',
  
  // Medical Information
  MEDICAL_RECORD = 'medical_record',
  HEALTH_INSURANCE = 'health_insurance',
  
  // Other
  VEHICLE_ID = 'vehicle_id',
  LICENSE_PLATE = 'license_plate',
  
  // Custom types
  CUSTOM = 'custom',
}

/**
 * Severity levels for sensitive data detection
 */
export enum DetectionSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Detection result for sensitive data
 */
export interface DetectionResult {
  /** The type of sensitive data detected */
  type: SensitiveDataType;
  /** The actual value that was detected */
  value: string;
  /** The start index of the detected value in the original text */
  start: number;
  /** The end index of the detected value in the original text */
  end: number;
  /** The severity of this detection */
  severity: DetectionSeverity;
  /** Optional confidence score (0-1) */
  confidence?: number;
  /** Optional context around the detection */
  context?: string;
  /** Optional custom metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Options for the sensitive data detector
 */
export interface SensitiveDataDetectorOptions {
  /**
   * Whether to mask detected sensitive data in the result
   * @default false
   */
  maskData?: boolean;
  
  /**
   * The character to use for masking
   * @default '*'
   */
  maskCharacter?: string;
  
  /**
   * Whether to include the original text in the result
   * @default false
   */
  includeOriginalText?: boolean;
  
  /**
   * Minimum confidence threshold (0-1) for considering a detection valid
   * @default 0.8
   */
  confidenceThreshold?: number;
  
  /**
   * Whether to include context around detections
   * @default false
   */
  includeContext?: boolean;
  
  /**
   * Number of characters to include before and after the detection for context
   * @default 20
   */
  contextWindow?: number;
  
  /**
   * Custom patterns to detect specific types of sensitive data
   */
  customPatterns?: Array<{
    type: string;
    name: string;
    pattern: RegExp;
    severity: DetectionSeverity;
    confidence?: number;
    description?: string;
  }>;
  
  /**
   * Types of sensitive data to detect (if not provided, all types are detected)
   */
  detectTypes?: SensitiveDataType[];
  
  /**
   * Whether to enable validation for detected values
   * @default true
   */
  validateDetections?: boolean;
}

/**
 * Default detection patterns for common sensitive data types
 */
const DEFAULT_PATTERNS = [
  // Email addresses
  {
    type: SensitiveDataType.EMAIL,
    name: 'Email Address',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    severity: DetectionSeverity.HIGH,
    confidence: 0.95,
  },
  
  // US Phone numbers
  {
    type: SensitiveDataType.PHONE,
    name: 'US Phone Number',
    pattern: /(\+?1[ \-.]?)?\(?([0-9]{3})\)?[ \-.]?([0-9]{3})[ \-.]?([0-9]{4})/g,
    severity: DetectionSeverity.MEDIUM,
    confidence: 0.9,
  },
  
  // Social Security Numbers (SSN)
  {
    type: SensitiveDataType.SSN,
    name: 'US Social Security Number',
    pattern: /\b(?!000|666|9\d{2})\d{3}[- ]?(?!00)\d{2}[- ]?(?!0000)\d{4}\b/g,
    severity: DetectionSeverity.CRITICAL,
    confidence: 0.99,
  },
  
  // Credit card numbers (generic)
  {
    type: SensitiveDataType.CREDIT_CARD,
    name: 'Credit Card Number',
    pattern: /\b(?:\d[ -]*?){13,16}\b/g,
    severity: DetectionSeverity.CRITICAL,
    confidence: 0.8,
  },
  
  // IP addresses
  {
    type: SensitiveDataType.IP_ADDRESS,
    name: 'IP Address',
    pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    severity: DetectionSeverity.MEDIUM,
    confidence: 0.9,
  },
  
  // API keys (common patterns)
  {
    type: SensitiveDataType.API_KEY,
    name: 'API Key',
    pattern: /\b(?:[A-Za-z0-9+/=]{32,}|[A-Za-z0-9_\-]{20,})\b/g,
    severity: DetectionSeverity.HIGH,
    confidence: 0.7,
  },
  
  // Passwords (very basic pattern, should be used with caution)
  {
    type: SensitiveDataType.PASSWORD,
    name: 'Password',
    pattern: /(?:password|pwd|pass)[:=]\s*['"]?([^\s'"]+)['"]?/gi,
    severity: DetectionSeverity.CRITICAL,
    confidence: 0.85,
  },
];

/**
 * Default options for the sensitive data detector
 */
const DEFAULT_OPTIONS: Required<Omit<SensitiveDataDetectorOptions, 'customPatterns' | 'detectTypes'>> = {
  maskData: false,
  maskCharacter: '*',
  includeOriginalText: false,
  confidenceThreshold: 0.8,
  includeContext: false,
  contextWindow: 20,
  validateDetections: true,
};

/**
 * Schema for validating detector options
 */
const detectorOptionsSchema = z.object({
  maskData: z.boolean().optional(),
  maskCharacter: z.string().length(1).optional(),
  includeOriginalText: z.boolean().optional(),
  confidenceThreshold: z.number().min(0).max(1).optional(),
  includeContext: z.boolean().optional(),
  contextWindow: z.number().int().positive().optional(),
  customPatterns: z.array(z.object({
    type: z.string(),
    name: z.string(),
    pattern: z.instanceof(RegExp),
    severity: z.nativeEnum(DetectionSeverity),
    confidence: z.number().min(0).max(1).optional(),
    description: z.string().optional(),
  })).optional(),
  detectTypes: z.array(z.nativeEnum(SensitiveDataType)).optional(),
  validateDetections: z.boolean().optional(),
}).default({});

/**
 * Class for detecting sensitive data in text
 */
export class SensitiveDataDetector {
  private readonly options: Required<Omit<SensitiveDataDetectorOptions, 'customPatterns' | 'detectTypes'>> & {
    customPatterns: NonNullable<SensitiveDataDetectorOptions['customPatterns']>;
    detectTypes: SensitiveDataType[] | null;
  };
  
  /**
   * Create a new SensitiveDataDetector instance
   * @param options Configuration options
   */
  constructor(options: SensitiveDataDetectorOptions = {}) {
    const parsedOptions = detectorOptionsSchema.parse(options);
    
    this.options = {
      ...DEFAULT_OPTIONS,
      ...parsedOptions,
      customPatterns: [
        ...DEFAULT_PATTERNS,
        ...(parsedOptions.customPatterns || []),
      ],
      detectTypes: parsedOptions.detectTypes || null,
    };
  }
  
  /**
   * Scan text for sensitive data
   * @param text The text to scan
   * @returns Array of detection results
   */
  public scan(text: string): DetectionResult[] {
    if (!text || typeof text !== 'string') {
      return [];
    }
    
    const results: DetectionResult[] = [];
    const seen = new Set<string>();
    
    // Process each pattern
    for (const pattern of this.options.customPatterns) {
      // Skip if we're filtering by type and this pattern's type isn't in the list
      if (this.options.detectTypes && !this.options.detectTypes.includes(pattern.type as SensitiveDataType)) {
        continue;
      }
      
      // Reset the regex lastIndex to ensure we start from the beginning
      pattern.pattern.lastIndex = 0;
      
      let match: RegExpExecArray | null;
      while ((match = pattern.pattern.exec(text)) !== null) {
        const value = match[0];
        const start = match.index;
        const end = start + value.length;
        
        // Skip if we've already seen this exact match
        const matchKey = `${start}:${end}:${value}`;
        if (seen.has(matchKey)) {
          continue;
        }
        
        seen.add(matchKey);
        
        // Skip if confidence is below threshold
        const confidence = pattern.confidence ?? 1.0;
        if (confidence < this.options.confidenceThreshold) {
          continue;
        }
        
        // Get context if needed
        let context: string | undefined;
        if (this.options.includeContext) {
          const startPos = Math.max(0, start - this.options.contextWindow);
          const endPos = Math.min(text.length, end + this.options.contextWindow);
          context = text.substring(startPos, endPos);
        }
        
        // Add the detection result
        results.push({
          type: pattern.type as SensitiveDataType,
          value,
          start,
          end,
          severity: pattern.severity,
          confidence,
          context,
          metadata: {
            patternName: pattern.name,
          },
        });
      }
    }
    
    // Sort results by start position
    return results.sort((a, b) => a.start - b.start);
  }
  
  /**
   * Mask sensitive data in text
   * @param text The text to process
   * @param customMaskFn Optional custom masking function
   * @returns Object with masked text and detection results
   */
  public mask(
    text: string,
    customMaskFn?: (result: DetectionResult) => string
  ): { maskedText: string; detections: DetectionResult[] } {
    if (!text) {
      return { maskedText: text, detections: [] };
    }
    
    const detections = this.scan(text);
    if (detections.length === 0) {
      return { maskedText: text, detections: [] };
    }
    
    // Sort detections by start position in reverse order to avoid offset issues
    const sortedDetections = [...detections].sort((a, b) => b.start - a.start);
    
    let maskedText = text;
    
    for (const detection of sortedDetections) {
      const mask = customMaskFn 
        ? customMaskFn(detection)
        : this.options.maskCharacter.repeat(detection.value.length);
      
      maskedText = 
        maskedText.substring(0, detection.start) + 
        mask + 
        maskedText.substring(detection.end);
    }
    
    return {
      maskedText,
      detections,
    };
  }
  
  /**
   * Check if text contains any sensitive data
   * @param text The text to check
   * @returns boolean indicating if sensitive data was found
   */
  public hasSensitiveData(text: string): boolean {
    if (!text) {
      return false;
    }
    
    return this.scan(text).length > 0;
  }
  
  /**
   * Get a summary of detected sensitive data
   * @param detections Array of detection results
   * @returns Summary object with counts by type and severity
   */
  public getSummary(detections: DetectionResult[]): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<DetectionSeverity, number>;
  } {
    const summary = {
      total: detections.length,
      byType: {} as Record<string, number>,
      bySeverity: {
        [DetectionSeverity.LOW]: 0,
        [DetectionSeverity.MEDIUM]: 0,
        [DetectionSeverity.HIGH]: 0,
        [DetectionSeverity.CRITICAL]: 0,
      },
    };
    
    for (const detection of detections) {
      // Count by type
      if (!summary.byType[detection.type]) {
        summary.byType[detection.type] = 0;
      }
      summary.byType[detection.type]++;
      
      // Count by severity
      summary.bySeverity[detection.severity]++;
    }
    
    return summary;
  }
}

/**
 * Default sensitive data detector instance
 */
export const defaultSensitiveDataDetector = new SensitiveDataDetector();