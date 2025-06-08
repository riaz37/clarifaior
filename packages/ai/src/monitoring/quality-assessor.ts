import { monitoring, AIPackageMonitor } from './monitoring';

export interface QualityScore {
  /** Overall quality score (0-1) */
  score: number;
  /** Individual dimension scores */
  dimensions: {
    /** Relevance to the input/prompt */
    relevance: number;
    /** Factual accuracy */
    accuracy: number;
    /** Clarity and coherence */
    clarity: number;
    /** Completeness of the response */
    completeness: number;
    /** Custom dimension scores */
    [key: string]: number | Record<string, unknown>;
  };
  /** Any additional metadata */
  metadata?: Record<string, unknown>;
  /** Timestamp of the assessment */
  timestamp: Date;
}

export interface QualityAssessmentOptions {
  /** Whether to store the assessment */
  storeResult?: boolean;
  /** Additional context for the assessment */
  context?: Record<string, unknown>;
  /** Custom dimensions to evaluate */
  customDimensions?: Record<string, (input: string, output: string) => number>;
  /** Weight for each dimension (0-1) */
  weights?: {
    relevance?: number;
    accuracy?: number;
    clarity?: number;
    completeness?: number;
    [key: string]: number | undefined;
  };
}

export interface QualityMetrics {
  /** Total number of assessments */
  totalAssessments: number;
  /** Average quality score */
  averageScore: number;
  /** Score distribution */
  scoreDistribution: Array<{ range: string; count: number }>;
  /** Average scores by dimension */
  dimensionAverages: Record<string, number>;
  /** Timestamp of the first assessment */
  firstAssessment?: Date;
  /** Timestamp of the last assessment */
  lastAssessment?: Date;
}

export class QualityAssessor {
  private assessments: QualityScore[] = [];
  private monitor: AIPackageMonitor;
  private defaultWeights = {
    relevance: 0.3,
    accuracy: 0.3,
    clarity: 0.2,
    completeness: 0.2,
  };

  constructor() {
    this.monitor = monitoring;
  }

  /**
   * Assess the quality of an AI output
   */
  assessQuality(
    input: string,
    output: string,
    options: QualityAssessmentOptions = {},
  ): QualityScore {
    const {
      storeResult = true,
      context = {},
      customDimensions = {},
      weights = {},
    } = options;

    // Calculate dimension scores (0-1)
    const dimensions: Record<string, number> = {
      // Simple heuristic-based scoring (can be replaced with more sophisticated models)
      relevance: this.calculateRelevance(input, output),
      accuracy: this.calculateAccuracy(input, output),
      clarity: this.calculateClarity(output),
      completeness: this.calculateCompleteness(input, output),
    };

    // Calculate custom dimension scores
    for (const [dimension, scorer] of Object.entries(customDimensions)) {
      dimensions[dimension] = scorer(input, output);
    }

    // Merge with default weights
    const effectiveWeights = { ...this.defaultWeights, ...weights };
    
    // Calculate weighted average score
    let totalWeight = 0;
    let weightedSum = 0;
    
    for (const [dimension, score] of Object.entries(dimensions)) {
      const weight = effectiveWeights[dimension] || 0;
      weightedSum += score * weight;
      totalWeight += weight;
    }

    const overallScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

    const assessment: QualityScore = {
      score: parseFloat(overallScore.toFixed(4)),
      dimensions: dimensions as QualityScore['dimensions'],
      metadata: {
        inputLength: input.length,
        outputLength: output.length,
        ...context,
      },
      timestamp: new Date(),
    };

    if (storeResult) {
      this.assessments.push(assessment);
      this.trackMetrics(assessment);
    }

    return assessment;
  }

  /**
   * Get quality metrics based on stored assessments
   */
  getMetrics(): QualityMetrics {
    if (this.assessments.length === 0) {
      return {
        totalAssessments: 0,
        averageScore: 0,
        scoreDistribution: [
          { range: '0-0.2', count: 0 },
          { range: '0.2-0.4', count: 0 },
          { range: '0.4-0.6', count: 0 },
          { range: '0.6-0.8', count: 0 },
          { range: '0.8-1', count: 0 },
        ],
        dimensionAverages: {},
      };
    }


    // Calculate score distribution
    const distribution = [0, 0, 0, 0, 0]; // 0-0.2, 0.2-0.4, etc.
    let totalScore = 0;
    const dimensionSums: Record<string, number> = {};
    const dimensionCounts: Record<string, number> = {};

    for (const assessment of this.assessments) {
      totalScore += assessment.score;

      // Update score distribution
      const index = Math.min(
        Math.floor(assessment.score * 5),
        4,
      );
      distribution[index] = (distribution[index] || 0) + 1;

      // Sum up dimension scores
      for (const [dimension, score] of Object.entries(assessment.dimensions)) {
        if (typeof score === 'number') {
          dimensionSums[dimension] = (dimensionSums[dimension] || 0) + score;
          dimensionCounts[dimension] = (dimensionCounts[dimension] || 0) + 1;
        }
      }
    }

    // Calculate dimension averages
    const dimensionAverages: Record<string, number> = {};
    for (const [dimension, sum] of Object.entries(dimensionSums)) {
      const count = dimensionCounts[dimension] || 0;
      dimensionAverages[dimension] = parseFloat((sum / count).toFixed(4));
    }

    return {
      totalAssessments: this.assessments.length,
      averageScore: parseFloat((totalScore / this.assessments.length).toFixed(4)),
      scoreDistribution: [
        { range: '0-0.2', count: distribution[0] },
        { range: '0.2-0.4', count: distribution[1] },
        { range: '0.4-0.6', count: distribution[2] },
        { range: '0.6-0.8', count: distribution[3] },
        { range: '0.8-1', count: distribution[4] },
      ],
      dimensionAverages,
      firstAssessment: this.assessments[0]?.timestamp,
      lastAssessment: this.assessments[this.assessments.length - 1]?.timestamp,
    };
  }

  /**
   * Clear all stored assessments
   */
  clearAssessments(): void {
    this.assessments = [];
  }

  /**
   * Get all assessments
   */
  getAllAssessments(): QualityScore[] {
    return [...this.assessments];
  }

  // Internal scoring methods (can be overridden or extended)
  private calculateRelevance(input: string, output: string): number {
    // Simple keyword matching (can be enhanced with embeddings)
    const inputKeywords = this.extractKeywords(input);
    const outputKeywords = this.extractKeywords(output);
    
    if (inputKeywords.size === 0) return 0.5; // Neutral score if no keywords
    
    let matches = 0;
    for (const keyword of inputKeywords) {
      if (outputKeywords.has(keyword)) {
        matches++;
      }
    }
    
    return Math.min(1, matches / inputKeywords.size);
  }

  private calculateAccuracy(input: string, output: string): number {
    // Simple implementation - could be enhanced with fact-checking
    // For now, just check for obvious contradictions or uncertainty markers
    const uncertaintyMarkers = [
      'i think', 'i believe', 'i\'m not sure', 'maybe', 'perhaps',
      'might be', 'could be', 'possibly', 'likely', 'unlikely'
    ];
    
    const lowerOutput = output.toLowerCase();
    const uncertaintyCount = uncertaintyMarkers.filter(marker => 
      lowerOutput.includes(marker)
    ).length;
    
    // More uncertainty markers → lower accuracy score
    return Math.max(0, 1 - (uncertaintyCount * 0.1));
  }

  private calculateClarity(output: string): number {
    // Simple implementation - could be enhanced with readability metrics
    const sentences = output.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length === 0) return 0;
    
    const words = output.split(/\s+/).filter(w => w.length > 0);
    const avgWordsPerSentence = words.length / sentences.length;
    
    // Score based on average words per sentence (10-20 is considered ideal)
    if (avgWordsPerSentence < 5) return 0.3; // Too short
    if (avgWordsPerSentence > 30) return 0.4; // Too long
    if (avgWordsPerSentence >= 10 && avgWordsPerSentence <= 20) return 0.9; // Ideal
    
    // Linear interpolation for values between thresholds
    if (avgWordsPerSentence < 10) {
      return 0.3 + (0.6 * (avgWordsPerSentence - 5) / 5);
    } else {
      return 0.9 - (0.5 * (avgWordsPerSentence - 20) / 10);
    }
  }

  private calculateCompleteness(input: string, output: string): number {
    // Simple implementation - checks if output addresses the input
    const inputQuestionWords = ['what', 'why', 'how', 'when', 'where', 'who'];
    const isQuestion = inputQuestionWords.some(word => 
      input.trim().toLowerCase().startsWith(word)
    );
    
    if (!isQuestion) return 0.8; // Default for non-questions
    
    // For questions, check if the answer is non-empty and ends with punctuation
    if (output.trim().length === 0) return 0;
    if (!/[.!?]$/.test(output.trim())) return 0.5;
    
    return 0.9; // Looks like a complete answer
  }

  private extractKeywords(text: string): Set<string> {
    // Simple keyword extraction (can be enhanced with NLP)
    const stopWords = new Set([
      'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
      'to', 'of', 'in', 'on', 'at', 'for', 'with', 'by', 'about', 'as',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
      'my', 'your', 'his', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs',
      'this', 'that', 'these', 'those', 'there', 'here',
      'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing',
      'can', 'could', 'may', 'might', 'must', 'shall', 'should', 'will', 'would'
    ]);
    
    return new Set(
      text
        .toLowerCase()
        .split(/\W+/)
        .filter(word => 
          word.length > 2 && 
          !stopWords.has(word) && 
          !/^\d+$/.test(word)
        )
    );
  }

  private trackMetrics(assessment: QualityScore): void {
    // Track overall score
    this.monitor.captureMetric('quality.overall', assessment.score);
    
    // Track dimension scores
    for (const [dimension, score] of Object.entries(assessment.dimensions)) {
      if (typeof score === 'number') {
        this.monitor.captureMetric(`quality.dimension.${dimension}`, score);
      }
    }
    
    // Track input/output lengths
    if (assessment.metadata?.inputLength) {
      this.monitor.captureMetric('quality.input_length', Number(assessment.metadata.inputLength));
    }
    if (assessment.metadata?.outputLength) {
      this.monitor.captureMetric('quality.output_length', Number(assessment.metadata.outputLength));
    }
  }
}

// Default instance
export const qualityAssessor = new QualityAssessor();

// Helper function
export function assessQuality(
  input: string,
  output: string,
  options: QualityAssessmentOptions = {},
): QualityScore {
  return qualityAssessor.assessQuality(input, output, options);
}