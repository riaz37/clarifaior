export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  model: string;
  timestamp: Date;
}

export interface TokenBudget {
  maxTokensPerRequest: number;
  maxTokensPerHour: number;
  maxTokensPerDay: number;
  maxCostPerHour: number;
  maxCostPerDay: number;
}

export interface TokenMetrics {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  averageTokensPerRequest: number;
  averageCostPerRequest: number;
  hourlyUsage: TokenUsage[];
  dailyUsage: TokenUsage[];
}

export class TokenCounter {
  private usage: TokenUsage[] = [];
  private budget: TokenBudget;
  private modelPricing: Map<string, { input: number; output: number }> = new Map();

  constructor(budget: TokenBudget) {
    this.budget = budget;
    this.initializeModelPricing();
  }

  private initializeModelPricing(): void {
    // Pricing per 1K tokens (as of 2024)
    this.modelPricing.set('deepseek-chat', { input: 0.00014, output: 0.00028 });
    this.modelPricing.set('deepseek-coder', { input: 0.00014, output: 0.00028 });
    this.modelPricing.set('gpt-3.5-turbo', { input: 0.0015, output: 0.002 });
    this.modelPricing.set('gpt-4', { input: 0.03, output: 0.06 });
    this.modelPricing.set('gpt-4-turbo', { input: 0.01, output: 0.03 });
    this.modelPricing.set('claude-3-haiku', { input: 0.00025, output: 0.00125 });
    this.modelPricing.set('claude-3-sonnet', { input: 0.003, output: 0.015 });
    this.modelPricing.set('claude-3-opus', { input: 0.015, output: 0.075 });
    this.modelPricing.set('gemini-pro', { input: 0.0005, output: 0.0015 });
  }

  /**
   * Count tokens in text (approximate)
   */
  countTokens(text: string, model: string = 'gpt-3.5-turbo'): number {
    // Simple approximation: ~4 characters per token for most models
    // This is a rough estimate - for production, use tiktoken or similar
    const avgCharsPerToken = this.getAvgCharsPerToken(model);
    return Math.ceil(text.length / avgCharsPerToken);
  }

  /**
   * Record token usage
   */
  recordUsage(usage: Omit<TokenUsage, 'timestamp'>): TokenUsage {
    const fullUsage: TokenUsage = {
      ...usage,
      timestamp: new Date(),
    };

    this.usage.push(fullUsage);
    this.cleanupOldUsage();

    return fullUsage;
  }

  /**
   * Calculate cost for token usage
   */
  calculateCost(inputTokens: number, outputTokens: number, model: string): number {
    const pricing = this.modelPricing.get(model);
    if (!pricing) {
      console.warn(`No pricing data for model: ${model}`);
      return 0;
    }

    const inputCost = (inputTokens / 1000) * pricing.input;
    const outputCost = (outputTokens / 1000) * pricing.output;
    
    return inputCost + outputCost;
  }

  /**
   * Check if request is within budget
   */
  checkBudget(requestTokens: number, model: string): {
    withinBudget: boolean;
    violations: string[];
    remainingBudget: {
      tokens: number;
      cost: number;
    };
  } {
    const violations: string[] = [];
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Check per-request limit
    if (requestTokens > this.budget.maxTokensPerRequest) {
      violations.push(`Request tokens (${requestTokens}) exceed per-request limit (${this.budget.maxTokensPerRequest})`);
    }

    // Check hourly limits
    const hourlyUsage = this.getUsageSince(oneHourAgo);
    const hourlyTokens = hourlyUsage.reduce((sum, u) => sum + u.totalTokens, 0);
    const hourlyCost = hourlyUsage.reduce((sum, u) => sum + u.estimatedCost, 0);

    if (hourlyTokens + requestTokens > this.budget.maxTokensPerHour) {
      violations.push(`Hourly token limit would be exceeded: ${hourlyTokens + requestTokens} > ${this.budget.maxTokensPerHour}`);
    }

    const requestCost = this.calculateCost(requestTokens, requestTokens * 0.5, model); // Estimate 50% output
    if (hourlyCost + requestCost > this.budget.maxCostPerHour) {
      violations.push(`Hourly cost limit would be exceeded: $${(hourlyCost + requestCost).toFixed(4)} > $${this.budget.maxCostPerHour}`);
    }

    // Check daily limits
    const dailyUsage = this.getUsageSince(oneDayAgo);
    const dailyTokens = dailyUsage.reduce((sum, u) => sum + u.totalTokens, 0);
    const dailyCost = dailyUsage.reduce((sum, u) => sum + u.estimatedCost, 0);

    if (dailyTokens + requestTokens > this.budget.maxTokensPerDay) {
      violations.push(`Daily token limit would be exceeded: ${dailyTokens + requestTokens} > ${this.budget.maxTokensPerDay}`);
    }

    if (dailyCost + requestCost > this.budget.maxCostPerDay) {
      violations.push(`Daily cost limit would be exceeded: $${(dailyCost + requestCost).toFixed(4)} > $${this.budget.maxCostPerDay}`);
    }

    return {
      withinBudget: violations.length === 0,
      violations,
      remainingBudget: {
        tokens: Math.min(
          this.budget.maxTokensPerHour - hourlyTokens,
          this.budget.maxTokensPerDay - dailyTokens
        ),
        cost: Math.min(
          this.budget.maxCostPerHour - hourlyCost,
          this.budget.maxCostPerDay - dailyCost
        ),
      },
    };
  }

  /**
   * Get usage metrics
   */
  getMetrics(): TokenMetrics {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const hourlyUsage = this.getUsageSince(oneHourAgo);
    const dailyUsage = this.getUsageSince(oneDayAgo);

    const totalTokens = this.usage.reduce((sum, u) => sum + u.totalTokens, 0);
    const totalCost = this.usage.reduce((sum, u) => sum + u.estimatedCost, 0);

    return {
      totalRequests: this.usage.length,
      totalTokens,
      totalCost,
      averageTokensPerRequest: this.usage.length > 0 ? totalTokens / this.usage.length : 0,
      averageCostPerRequest: this.usage.length > 0 ? totalCost / this.usage.length : 0,
      hourlyUsage,
      dailyUsage,
    };
  }

  /**
   * Get usage since a specific time
   */
  getUsageSince(since: Date): TokenUsage[] {
    return this.usage.filter(u => u.timestamp >= since);
  }

  /**
   * Reset usage tracking
   */
  reset(): void {
    
    this.usage = [];
  }

  /**
   * Update budget
   */
  updateBudget(budget: Partial<TokenBudget>): void {
    this.budget = { ...this.budget, ...budget };
  }

  /**
   * Get current budget
   */
  getBudget(): TokenBudget {
    return { ...this.budget };
  }

  /**
   * Export usage data
   */
  exportUsage(): TokenUsage[] {
    return [...this.usage];
  }

  /**
   * Import usage data
   */
  importUsage(usage: TokenUsage[]): void {
    this.usage = [...usage];
    this.cleanupOldUsage();
  }

  private getAvgCharsPerToken(model: string): number {
    // Different models have different tokenization
    const modelTokenRatios: Record<string, number> = {
      'deepseek-chat': 4,
      'deepseek-coder': 4,
      'gpt-3.5-turbo': 4,
      'gpt-4': 4,
      'gpt-4-turbo': 4,
      'claude-3-haiku': 4.5,
      'claude-3-sonnet': 4.5,
      'claude-3-opus': 4.5,
      'gemini-pro': 4,
    };

    return modelTokenRatios[model] || 4;
  }

  private cleanupOldUsage(): void {
    // Keep only last 7 days of usage
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    this.usage = this.usage.filter(u => u.timestamp >= sevenDaysAgo);
  }
}

/**
 * Create a token counter with default budget
 */
export function createTokenCounter(budget?: Partial<TokenBudget>): TokenCounter {
  const defaultBudget: TokenBudget = {
    maxTokensPerRequest: 10000,
    maxTokensPerHour: 100000,
    maxTokensPerDay: 500000,
    maxCostPerHour: 10.0,
    maxCostPerDay: 50.0,
  };

  return new TokenCounter({ ...defaultBudget, ...budget });
}

/**
 * Estimate tokens for a prompt template with variables
 */
export function estimateTemplateTokens(
  template: string,
  variables: Record<string, any>,
  model: string = 'gpt-3.5-turbo'
): number {
  // Replace variables with estimated content
  let estimatedContent = template;
  
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    const replacement = typeof value === 'string' ? value : JSON.stringify(value);
    estimatedContent = estimatedContent.replace(new RegExp(placeholder, 'g'), replacement);
  });

  const counter = createTokenCounter();
  return counter.countTokens(estimatedContent, model);
}

/**
 * Optimize prompt to fit within token budget
 */
export function optimizePromptForBudget(
  prompt: string,
  maxTokens: number,
  model: string = 'gpt-3.5-turbo'
): string {
  const counter = createTokenCounter();
  const currentTokens = counter.countTokens(prompt, model);
  
  if (currentTokens <= maxTokens) {
    return prompt;
  }

  // Simple truncation strategy - in production, use more sophisticated methods
  const avgCharsPerToken = 4; // Approximate
  const maxChars = maxTokens * avgCharsPerToken;
  
  if (prompt.length > maxChars) {
    return prompt.substring(0, maxChars - 100) + '...\n[Content truncated to fit token budget]';
  }

  return prompt;
}