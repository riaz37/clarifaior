import { monitoring, AIPackageMonitor } from './monitoring';

export interface PerformanceStats {
  /** Number of operations recorded */
  count: number;
  /** Total duration in milliseconds */
  totalDuration: number;
  /** Average duration in milliseconds */
  averageDuration: number;
  /** Minimum duration in milliseconds */
  minDuration: number;
  /** Maximum duration in milliseconds */
  maxDuration: number;
  /** Timestamp of the first measurement */
  firstMeasurement: Date;
  /** Timestamp of the last measurement */
  lastMeasurement: Date;
  /** Success rate (0-1) */
  successRate: number;
  /** Number of successful operations */
  successCount: number;
  /** Number of failed operations */
  errorCount: number;
}

export interface PerformanceMonitorConfig {
  /** Whether monitoring is enabled */
  enabled?: boolean;
  /** Default tags to include with all metrics */
  defaultTags?: Record<string, string>;
  /** Sample rate (0.0 to 1.0) */
  sampleRate?: number;
  /** Whether to track percentiles */
  trackPercentiles?: boolean;
  /** Percentiles to track (0-100) */
  percentiles?: number[];
  /** Time window in milliseconds for sliding window stats */
  timeWindowMs?: number;
}

export interface OperationRecord {
  duration: number;
  timestamp: Date;
  success: boolean;
  tags?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export class PerformanceMonitor {
  private config: Required<PerformanceMonitorConfig>;
  private operations: Map<string, OperationRecord[]> = new Map();
  private monitor: AIPackageMonitor;
  private statsCache: Map<string, PerformanceStats> = new Map();
  private lastCleanup: number = Date.now();

  constructor(config: PerformanceMonitorConfig = {}) {
    this.monitor = monitoring;
    this.config = {
      enabled: true,
      defaultTags: {},
      sampleRate: 1.0,
      trackPercentiles: true,
      percentiles: [50, 90, 95, 99],
      timeWindowMs: 5 * 60 * 1000, // 5 minutes
      ...config,
    };
  }

  /**
   * Record an operation's performance
   */
  recordOperation(
    operation: string,
    duration: number,
    success: boolean,
    tags: Record<string, string> = {},
    metadata: Record<string, unknown> = {},
  ): void {
    if (!this.config.enabled || Math.random() > this.config.sampleRate) {
      return;
    }

    this.cleanupOldRecords();

    const record: OperationRecord = {
      duration,
      timestamp: new Date(),
      success,
      tags: { ...this.config.defaultTags, ...tags },
      metadata,
    };

    // Store the record
    if (!this.operations.has(operation)) {
      this.operations.set(operation, []);
    }
    this.operations.get(operation)?.push(record);
    this.statsCache.delete(operation); // Invalidate cache

    // Also send to the main monitoring system
    this.monitor.captureMetric('performance.duration', duration, {
      operation,
      success: success.toString(),
      ...tags,
    });

    if (!success) {
      this.monitor.incrementCounter('performance.errors', { operation, ...tags });
    }
  }


  /**
   * Time an operation and automatically record its performance
   */
  async timeOperation<T>(
    operation: string,
    fn: () => Promise<T> | T,
    tags: Record<string, string> = {},
    metadata: Record<string, unknown> = {},
  ): Promise<T> {
    if (!this.config.enabled) {
      return fn();
    }

    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.recordOperation(operation, duration, true, tags, metadata);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordOperation(
        operation,
        duration,
        false,
        tags,
        {
          ...metadata,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  /**
   * Get performance statistics for an operation
   */
  getStats(operation: string): PerformanceStats | undefined {
    this.cleanupOldRecords();

    // Return cached stats if available
    if (this.statsCache.has(operation)) {
      return this.statsCache.get(operation);
    }

    const records = this.operations.get(operation);
    if (!records || records.length === 0) {
      return undefined;
    }

    const durations = records.map((r) => r.duration);
    const successCount = records.filter((r) => r.success).length;
    const errorCount = records.length - successCount;

    const stats: PerformanceStats = {
      count: records.length,
      totalDuration: durations.reduce((sum, d) => sum + d, 0),
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      firstMeasurement: new Date(Math.min(...records.map((r) => r.timestamp.getTime()))),
      lastMeasurement: new Date(Math.max(...records.map((r) => r.timestamp.getTime()))),
      successCount,
      errorCount,
      get averageDuration() {
        return this.totalDuration / this.count;
      },
      get successRate() {
        return this.count > 0 ? this.successCount / this.count : 0;
      },
    };


    // Calculate percentiles if enabled
    if (this.config.trackPercentiles && this.config.percentiles.length > 0) {
      const sorted = [...durations].sort((a, b) => a - b);
      for (const p of this.config.percentiles) {
        if (p < 0 || p > 100) continue;
        const index = Math.ceil((p / 100) * sorted.length) - 1;
        // Add percentile to stats
        Object.defineProperty(stats, `p${p}`, {
          value: sorted[Math.max(0, index)],
          enumerable: true,
        });
      }
    }

    // Cache the result
    this.statsCache.set(operation, stats);
    return stats;
  }

  /**
   * Get all operations being tracked
   */
  getTrackedOperations(): string[] {
    return Array.from(this.operations.keys());
  }

  /**
   * Reset all recorded data
   */
  reset(): void {
    this.operations.clear();
    this.statsCache.clear();
  }

  /**
   * Clean up old records based on the time window
   */
  private cleanupOldRecords(): void {
    const now = Date.now();
    // Only clean up every minute to avoid performance overhead
    if (now - this.lastCleanup < 60000) {
      return;
    }

    const cutoff = new Date(now - this.config.timeWindowMs);

    for (const [operation, records] of this.operations.entries()) {
      const filtered = records.filter((r) => r.timestamp >= cutoff);
      if (filtered.length === 0) {
        this.operations.delete(operation);
        this.statsCache.delete(operation);
      } else if (filtered.length < records.length) {
        this.operations.set(operation, filtered);
        this.statsCache.delete(operation);
      }
    }

    this.lastCleanup = now;
  }
}

// Default instance
export const performanceMonitor = new PerformanceMonitor();

// Helper function
export async function measurePerformance<T>(
  operation: string,
  fn: () => Promise<T> | T,
  tags: Record<string, string> = {},
  metadata: Record<string, unknown> = {},
): Promise<T> {
  return performanceMonitor.timeOperation(operation, fn, tags, metadata);
}