import { v4 as uuidv4 } from 'uuid';
import {
  MonitoringService,
  MonitoringConfig,
  MetricData,
  ErrorData,
  PerformanceData,
} from './types';

type TimerData = {
  startTime: number;
  operation: string;
  metadata?: Record<string, unknown>;
};

export class AIPackageMonitor implements MonitoringService {
  private metrics: MetricData[] = [];
  private errors: ErrorData[] = [];
  private performanceLogs: PerformanceData[] = [];
  private timers: Map<string, TimerData> = new Map();
  private config: Required<MonitoringConfig>;

  constructor(config: MonitoringConfig = {}) {
    this.config = {
      enabled: true,
      sampleRate: 1.0, // 100% sampling by default
      defaultTags: {},
      onError: () => {},
      onMetric: () => {},
      onPerformance: () => {},
      ...config,
    };
  }

  captureError(error: Error, context: Record<string, unknown> = {}): void {
    if (!this.config.enabled) return;

    const errorData: ErrorData = {
      error,
      context,
      timestamp: new Date(),
      severity: 'medium',
    };

    this.errors.push(errorData);
    this.config.onError?.(errorData);
  }

  captureMetric(
    name: string,
    value: number,
    tags: Record<string, string> = {},
  ): void {
    if (!this.config.enabled || Math.random() > this.config.sampleRate) return;

    const metric: MetricData = {
      name,
      value,
      timestamp: new Date(),
      tags: { ...this.config.defaultTags, ...tags },
    };

    this.metrics.push(metric);
    this.config.onMetric?.(metric);
  }

  async trackPerformance<T>(
    operation: string,
    fn: () => Promise<T> | T,
    metadata: Record<string, unknown> = {},
  ): Promise<T> {
    if (!this.config.enabled) return fn();

    const timer = this.startTimer(operation, metadata);
    try {
      const result = await fn();
      timer({ success: true });
      return result;
    } catch (error) {
      timer({ success: false });
      this.captureError(error as Error, { operation, ...metadata });
      throw error;
    }
  }

  startTimer(
    operation: string,
    metadata: Record<string, unknown> = {},
  ): (endData?: { success: boolean }) => PerformanceData {
    if (!this.config.enabled) {
      return () => ({
        operation,
        duration: 0,
        success: true,
        timestamp: new Date(),
        metadata,
      });
    }

    const id = uuidv4();
    const startTime = performance.now();

    this.timers.set(id, {
      startTime,
      operation,
      metadata,
    });

    return (endData = { success: true }) => {
      const timer = this.timers.get(id);
      if (!timer) {
        throw new Error(`Timer with id ${id} not found`);
      }

      const duration = performance.now() - timer.startTime;
      const performanceData: PerformanceData = {
        operation: timer.operation,
        duration,
        success: endData.success,
        timestamp: new Date(),
        metadata: { ...timer.metadata, ...endData },
      };

      this.performanceLogs.push(performanceData);
      this.config.onPerformance?.(performanceData);
      this.timers.delete(id);

      return performanceData;
    };
  }

  getMetrics(): MetricData[] {
    return [...this.metrics];
  }

  getErrors(): ErrorData[] {
    return [...this.errors];
  }

  getPerformanceData(): PerformanceData[] {
    return [...this.performanceLogs];
  }

  clear(): void {
    this.metrics = [];
    this.errors = [];
    this.performanceLogs = [];
    this.timers.clear();
  }

  // Helper methods for common metrics
  incrementCounter(name: string, tags: Record<string, string> = {}): void {
    this.captureMetric(`${name}.count`, 1, tags);
  }

  observeValue(
    name: string,
    value: number,
    tags: Record<string, string> = {},
  ): void {
    this.captureMetric(`${name}.value`, value, tags);
  }

  // Singleton instance
  private static instance: AIPackageMonitor;

  static getInstance(config?: MonitoringConfig): AIPackageMonitor {
    if (!AIPackageMonitor.instance) {
      AIPackageMonitor.instance = new AIPackageMonitor(config);
    }
    return AIPackageMonitor.instance;
  }
}

// Default export with singleton instance
export const monitoring = AIPackageMonitor.getInstance();

// Helper function to use the default monitor
export function getMonitor(): AIPackageMonitor {
  return monitoring;
}
