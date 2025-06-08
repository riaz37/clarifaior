import { monitoring, AIPackageMonitor, MetricData } from './monitoring';
import { v4 as uuidv4 } from 'uuid';

export interface UsageEvent {
  eventType: string;
  timestamp: Date;
  userId?: string;
  sessionId: string;
  metadata?: Record<string, unknown>;
}

export interface UsageAnalyticsConfig {
  /** Whether analytics collection is enabled */
  enabled?: boolean;
  /** Application or service name */
  serviceName?: string;
  /** Service version */
  serviceVersion?: string;
  /** User ID if available */
  userId?: string;
  /** Custom tags to include with all events */
  tags?: Record<string, string>;
  /** Callback for custom event processing */
  onEvent?: (event: UsageEvent) => void;
  /** Sampling rate (0.0 to 1.0) */
  sampleRate?: number;
}

export class UsageAnalytics {
  private config: Required<Omit<UsageAnalyticsConfig, 'onEvent'>> & {
    onEvent?: (event: UsageEvent) => void;
  };
  private sessionId: string;
  private monitor: AIPackageMonitor;

  constructor(config: UsageAnalyticsConfig = {}) {
    this.monitor = monitoring;
    this.sessionId = uuidv4();
    
    this.config = {
      enabled: true,
      serviceName: 'ai-package',
      serviceVersion: '1.0.0',
      userId: 'anonymous',
      tags: {},
      sampleRate: 1.0,
      ...config,
    };
  }

  /**
   * Track a custom event
   */
  trackEvent(
    eventType: string,
    metadata: Record<string, unknown> = {},
  ): void {
    if (!this.config.enabled || Math.random() > (this.config.sampleRate || 1.0)) {
      return;
    }

    const event: UsageEvent = {
      eventType,
      timestamp: new Date(),
      userId: this.config.userId,
      sessionId: this.sessionId,
      metadata: {
        ...metadata,
        serviceName: this.config.serviceName,
        serviceVersion: this.config.serviceVersion,
      },
    };

    // Send to monitoring system
    this.monitor.captureMetric(`usage.${eventType}`, 1, {
      ...this.config.tags,
      userId: this.config.userId,
      sessionId: this.sessionId,
    });

    // Call custom event handler if provided
    this.config.onEvent?.(event);
  }

  
  /**
   * Track feature usage
   */
  trackFeatureUsage(feature: string, metadata: Record<string, unknown> = {}): void {
    this.trackEvent(`feature.${feature}`, metadata);
  }

  /**
   * Track API call
   */
  trackApiCall(
    endpoint: string,
    status: 'success' | 'error',
    duration: number,
    metadata: Record<string, unknown> = {},
  ): void {
    this.trackEvent('api.call', {
      endpoint,
      status,
      duration,
      ...metadata,
    });

    // Also capture as a metric
    this.monitor.captureMetric('api.call.duration', duration, {
      endpoint,
      status,
      ...this.config.tags,
    });
  }

  /**
   * Track error
   */
  trackError(error: Error, context: Record<string, unknown> = {}): void {
    this.trackEvent('error', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      ...context,
    });
  }

  /**
   * Track model usage
   */
  trackModelUsage(
    model: string,
    inputTokens: number,
    outputTokens: number,
    metadata: Record<string, unknown> = {},
  ): void {
    this.trackEvent('model.usage', {
      model,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      ...metadata,
    });

    // Capture token usage metrics
    this.monitor.captureMetric('model.tokens.input', inputTokens, { model });
    this.monitor.captureMetric('model.tokens.output', outputTokens, { model });
    this.monitor.captureMetric('model.tokens.total', inputTokens + outputTokens, { model });
  }

  /**
   * Set user ID for tracking
   */
  setUserId(userId: string): void {
    this.config.userId = userId;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<UsageAnalyticsConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Default instance
export const usageAnalytics = new UsageAnalytics();

// Helper functions
export function trackFeatureUsage(feature: string, metadata: Record<string, unknown> = {}): void {
  usageAnalytics.trackFeatureUsage(feature, metadata);
}

export function trackModelUsage(
  model: string,
  inputTokens: number,
  outputTokens: number,
  metadata: Record<string, unknown> = {},
): void {
  usageAnalytics.trackModelUsage(model, inputTokens, outputTokens, metadata);
}

export function trackError(error: Error, context: Record<string, unknown> = {}): void {
  usageAnalytics.trackError(error, context);
}