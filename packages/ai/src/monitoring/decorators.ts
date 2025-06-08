import { monitoring, AIPackageMonitor } from './monitoring';

interface MonitorOptions {
  /** Custom operation name (defaults to method name) */
  name?: string;
  /** Additional metadata to include */
  metadata?: Record<string, unknown>;
  /** Custom monitor instance to use */
  monitor?: AIPackageMonitor;
}

/**
 * Decorator to monitor method execution time and errors
 */
export function Monitor(options: MonitorOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const operationName = options.name || `${target.constructor.name}.${propertyKey}`;
    const monitor = options.monitor || monitoring;

    if (typeof originalMethod === 'function') {
      descriptor.value = async function (...args: any[]) {
        return monitor.trackPerformance(
          operationName,
          () => originalMethod.apply(this, args),
          {
            ...options.metadata,
            className: target.constructor.name,
            methodName: propertyKey,
            args: args.length > 0 ? args : undefined,
          },
        );
      };
    }

    return descriptor;
  };
}

/**
 * Decorator to count method calls
 */
export function CountCalls(options: Omit<MonitorOptions, 'metadata'> = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const metricName = options.name || `${target.constructor.name}.${propertyKey}.calls`;
    const monitor = options.monitor || monitoring;

    if (typeof originalMethod === 'function') {
      descriptor.value = function (...args: any[]) {
        monitor.incrementCounter(metricName, {
          class: target.constructor.name,
          method: propertyKey,
        });
        return originalMethod.apply(this, args);
      };
    }

    return descriptor;
  };
}

/**
 * Decorator to track errors in methods
 */
export function TrackErrors(options: Omit<MonitorOptions, 'metadata'> = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const operationName = options.name || `${target.constructor.name}.${propertyKey}`;
    const monitor = options.monitor || monitoring;

    if (typeof originalMethod === 'function') {
      descriptor.value = async function (...args: any[]) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          monitor.captureError(error as Error, {
            operation: operationName,
            className: target.constructor.name,
            methodName: propertyKey,
            args: args.length > 0 ? args : undefined,
          });
          throw error; // Re-throw the error after capturing it
        }
      };
    }

    return descriptor;
  };
}
