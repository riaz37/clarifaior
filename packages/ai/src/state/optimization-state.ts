import { BaseState } from './base/base-state';

export type OptimizationGoal = 'minimize' | 'maximize';

export interface OptimizationMetric {
  /**
   * Unique identifier for the metric
   */
  id: string;
  
  /**
   * Human-readable name for the metric
   */
  name: string;
  
  /**
   * The current value of the metric
   */
  value: number;
  
  /**
   * The target value (if any)
   */
  target?: number;
  
  /**
   * The optimization goal for this metric
   */
  goal: OptimizationGoal;
  
  /**
   * The weight of this metric in the overall optimization
   */
  weight: number;
  
  /**
   * The unit of measurement for this metric
   */
  unit?: string;
  
  /**
   * Whether this metric is currently being tracked
   */
  isActive: boolean;
  
  /**
   * Additional metadata about the metric
   */
  metadata?: Record<string, unknown>;
}

export interface OptimizationConstraint {
  /**
   * Unique identifier for the constraint
   */
  id: string;
  
  /**
   * Human-readable name for the constraint
   */
  name: string;
  
  /**
   * The current value of the constraint
   */
  value: number;
  
  /**
   * The maximum allowed value (inclusive)
   */
  max?: number;
  
  /**
   * The minimum allowed value (inclusive)
   */
  min?: number;
  
  /**
   * Whether the constraint is currently active
   */
  isActive: boolean;
  
  /**
   * The unit of measurement for this constraint
   */
  unit?: string;
  
  /**
   * Additional metadata about the constraint
   */
  metadata?: Record<string, unknown>;
}

export interface OptimizationHistoryEntry {
  /**
   * Timestamp of the entry
   */
  timestamp: Date;
  
  /**
   * The iteration number
   */
  iteration: number;
  
  /**
   * The values of all metrics at this iteration
   */
  metrics: Record<string, number>;
  
  /**
   * The values of all parameters at this iteration
   */
  parameters: Record<string, unknown>;
  
  /**
   * Additional metadata about this iteration
   */
  metadata?: Record<string, unknown>;
}

export interface OptimizationStateData {
  /**
   * The ID of the optimization run
   */
  optimizationId: string;
  
  /**
   * The ID of the workflow or component being optimized
   */
  targetId: string;
  
  /**
   * The type of the target (e.g., 'workflow', 'model')
   */
  targetType: string;
  
  /**
   * The metrics being optimized
   */
  metrics: Record<string, OptimizationMetric>;
  
  /**
   * The constraints for the optimization
   */
  constraints: Record<string, OptimizationConstraint>;
  
  /**
   * The current values of the parameters being optimized
   */
  parameters: Record<string, unknown>;
  
  /**
   * The history of the optimization
   */
  history: OptimizationHistoryEntry[];
  
  /**
   * The current iteration number
   */
  currentIteration: number;
  
  /**
   * The maximum number of iterations to run
   */
  maxIterations: number;
  
  /**
   * The current status of the optimization
   */
  status: 'idle' | 'running' | 'completed' | 'failed' | 'paused';
  
  /**
   * The timestamp when the optimization started
   */
  startedAt?: Date;
  
  /**
   * The timestamp when the optimization completed
   */
  completedAt?: Date;
  
  /**
   * Additional context for the optimization
   */
  context: Record<string, unknown>;
  
  /**
   * Additional metadata about the optimization
   */
  metadata: Record<string, unknown>;
}

export class OptimizationState extends BaseState<OptimizationStateData> {
  constructor(init: {
    optimizationId: string;
    targetId: string;
    targetType: string;
    maxIterations: number;
    metrics?: OptimizationMetric[];
    constraints?: OptimizationConstraint[];
    parameters?: Record<string, unknown>;
    context?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }) {
    // Convert arrays to records for easier access
    const metricsRecord: Record<string, OptimizationMetric> = {};
    const constraintsRecord: Record<string, OptimizationConstraint> = {};
    
    // Initialize metrics
    for (const metric of init.metrics || []) {
      metricsRecord[metric.id] = metric;
    }
    
    // Initialize constraints
    for (const constraint of init.constraints || []) {
      constraintsRecord[constraint.id] = constraint;
    }
    
    super({
      ...init,
      status: 'idle',
      data: {
        optimizationId: init.optimizationId,
        targetId: init.targetId,
        targetType: init.targetType,
        metrics: metricsRecord,
        constraints: constraintsRecord,
        parameters: init.parameters || {},
        history: [],
        currentIteration: 0,
        maxIterations: init.maxIterations,
        status: 'idle',
        context: init.context || {},
        metadata: init.metadata || {},
      },
    });
  }
  
  /**
   * Starts the optimization process
   */
  start(): void {
    this.setStatus('running');
    this.data.startedAt = new Date();
    this.data.completedAt = undefined;
  }
  
  /**
   * Pauses the optimization process
   */
  pause(): void {
    if (this.data.status === 'running') {
      this.setStatus('paused');
    }
  }
  
  /**
   * Resumes the optimization process
   */
  resume(): void {
    if (this.data.status === 'paused') {
      this.setStatus('running');
    }
  }
  
  /**
   * Stops the optimization process
   * @param reason Optional reason for stopping
   */
  stop(reason?: string): void {
    this.setStatus('completed');
    this.data.completedAt = new Date();
    
    if (reason) {
      this.updateMetadata({ stopReason: reason });
    }
  }
  
  /**
   * Fails the optimization process
   * @param error Error information
   */
  fail(error: { message: string; code?: string; details?: unknown }): void {
    this.setStatus('failed');
    this.setError(error);
    this.data.completedAt = new Date();
  }
  
  /**
   * Adds a new iteration to the optimization history
   * @param metrics The metrics for this iteration
   * @param parameters The parameters used in this iteration
   * @param metadata Additional metadata for this iteration
   */
  addIteration(
    metrics: Record<string, number>,
    parameters: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): void {
    this.data.currentIteration++;
    
    const entry: OptimizationHistoryEntry = {
      timestamp: new Date(),
      iteration: this.data.currentIteration,
      metrics: { ...metrics },
      parameters: { ...parameters },
      metadata: metadata ? { ...metadata } : undefined,
    };
    
    this.data.history.push(entry);
    
    // Update the current parameters
    this.data.parameters = { ...parameters };
    
    // Update metrics with new values
    for (const [metricId, value] of Object.entries(metrics)) {
      if (this.data.metrics[metricId]) {
        this.data.metrics[metricId].value = value;
      }
    }
    
    // Check if we've reached the maximum number of iterations
    if (this.data.currentIteration >= this.data.maxIterations) {
      this.stop('Maximum iterations reached');
    }
  }
  
  /**
   * Adds a new metric to track
   * @param metric The metric to add
   */
  addMetric(metric: Omit<OptimizationMetric, 'isActive'> & { isActive?: boolean }): void {
    this.data.metrics[metric.id] = {
      ...metric,
      isActive: metric.isActive !== undefined ? metric.isActive : true,
    };
  }
  
  /**
   * Updates an existing metric
   * @param metricId The ID of the metric to update
   * @param updates The updates to apply
   */
  updateMetric(
    metricId: string,
    updates: Partial<Omit<OptimizationMetric, 'id'>>
  ): boolean {
    if (!this.data.metrics[metricId]) {
      return false;
    }
    
    this.data.metrics[metricId] = {
      ...this.data.metrics[metricId],
      ...updates,
    };
    
    return true;
  }
  
  /**
   * Adds a new constraint
   * @param constraint The constraint to add
   */
  addConstraint(
    constraint: Omit<OptimizationConstraint, 'isActive'> & { isActive?: boolean }
  ): void {
    this.data.constraints[constraint.id] = {
      ...constraint,
      isActive: constraint.isActive !== undefined ? constraint.isActive : true,
    };
  }
  
  /**
   * Updates an existing constraint
   * @param constraintId The ID of the constraint to update
   * @param updates The updates to apply
   */
  updateConstraint(
    constraintId: string,
    updates: Partial<Omit<OptimizationConstraint, 'id'>>
  ): boolean {
    if (!this.data.constraints[constraintId]) {
      return false;
    }
    
    this.data.constraints[constraintId] = {
      ...this.data.constraints[constraintId],
      ...updates,
    };
    
    return true;
  }
  
  /**
   * Checks if all constraints are satisfied
   */
  checkConstraints(): { satisfied: boolean; violations: string[] } {
    const violations: string[] = [];
    
    for (const [id, constraint] of Object.entries(this.data.constraints)) {
      if (!constraint.isActive) continue;
      
      const value = constraint.value;
      if (constraint.min !== undefined && value < constraint.min) {
        violations.push(`Constraint '${id}': value ${value} is below minimum ${constraint.min}`);
      }
      
      if (constraint.max !== undefined && value > constraint.max) {
        violations.push(`Constraint '${id}': value ${value} is above maximum ${constraint.max}`);
      }
    }
    
    return {
      satisfied: violations.length === 0,
      violations,
    };
  }
  
  /**
   * Gets the current best parameters based on the optimization goal
   */
  getBestParameters(): { parameters: Record<string, unknown>; score: number } | null {
    if (this.data.history.length === 0) {
      return null;
    }
    
    // Get all active metrics
    const activeMetrics = Object.values(this.data.metrics).filter(m => m.isActive);
    
    if (activeMetrics.length === 0) {
      return null;
    }
    
    // For now, just use the first metric to determine the best iteration
    // In a real implementation, you might want to combine multiple metrics
    const primaryMetric = activeMetrics[0];
    
    let bestIteration = this.data.history[0];
    let bestScore = this.calculateScore(bestIteration.metrics, activeMetrics);
    
    for (const iteration of this.data.history.slice(1)) {
      const score = this.calculateScore(iteration.metrics, activeMetrics);
      
      if (
        (primaryMetric.goal === 'maximize' && score > bestScore) ||
        (primaryMetric.goal === 'minimize' && score < bestScore)
      ) {
        bestScore = score;
        bestIteration = iteration;
      }
    }
    
    return {
      parameters: bestIteration.parameters,
      score: bestScore,
    };
  }
  
  /**
   * Calculates a combined score from multiple metrics
   * @private
   */
  private calculateScore(
    metrics: Record<string, number>,
    activeMetrics: OptimizationMetric[]
  ): number {
    let totalScore = 0;
    let totalWeight = 0;
    
    for (const metric of activeMetrics) {
      const value = metrics[metric.id];
      if (value === undefined) continue;
      
      // Normalize the value if target is specified
      let normalizedValue = value;
      if (metric.target !== undefined) {
        normalizedValue = Math.abs(value - metric.target);
        // If we're at the target, give maximum score
        if (normalizedValue === 0) {
          return metric.goal === 'maximize' ? Infinity : -Infinity;
        }
        // Invert for minimization problems
        if (metric.goal === 'minimize') {
          normalizedValue = 1 / normalizedValue;
        }
      } else {
        // If no target, use the value as-is
        if (metric.goal === 'minimize') {
          normalizedValue = -value;
        }
      }
      
      totalScore += normalizedValue * metric.weight;
      totalWeight += metric.weight;
    }
    
    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }
}

export default OptimizationState;
