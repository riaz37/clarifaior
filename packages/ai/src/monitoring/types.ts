export interface MetricData {
  name: string;
  value: number;
  timestamp?: Date;
  tags?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface ErrorData {
  error: Error;
  context?: Record<string, unknown>;
  timestamp?: Date;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface PerformanceData {
  operation: string;
  duration: number; // in milliseconds
  success: boolean;
  timestamp?: Date;
  metadata?: Record<string, unknown>;
}

export interface MonitoringConfig {
  enabled?: boolean;
  sampleRate?: number; // 0.0 to 1.0
  defaultTags?: Record<string, string>;
  onError?: (error: ErrorData) => void;
  onMetric?: (metric: MetricData) => void;
  onPerformance?: (data: PerformanceData) => void;
}

export interface MonitoringService {
  captureError(error: Error, context?: Record<string, unknown>): void;
  captureMetric(name: string, value: number, tags?: Record<string, string>): void;
  trackPerformance<T>(
    operation: string,
    fn: () => Promise<T> | T,
    metadata?: Record<string, unknown>
  ): Promise<T>;
  startTimer(operation: string): () => PerformanceData;
  getMetrics(): MetricData[];
  getErrors(): ErrorData[];
  getPerformanceData(): PerformanceData[];
  clear(): void;
}
