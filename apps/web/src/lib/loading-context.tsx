"use client";

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

// Loading state types
export interface LoadingState {
  isLoading: boolean;
  loadingText?: string;
  progress?: number;
  type?: 'spinner' | 'progress' | 'skeleton';
  overlay?: boolean;
  cancellable?: boolean;
}

export interface LoadingOperation {
  id: string;
  text: string;
  progress?: number;
  type?: 'spinner' | 'progress' | 'skeleton';
  overlay?: boolean;
  cancellable?: boolean;
  onCancel?: () => void;
  startTime: number;
}

interface LoadingContextType {
  // Current loading state
  globalLoading: LoadingState;
  operations: Map<string, LoadingOperation>;
  
  // Loading control methods
  startLoading: (id: string, options?: Partial<LoadingOperation>) => void;
  updateLoading: (id: string, updates: Partial<LoadingOperation>) => void;
  stopLoading: (id: string) => void;
  stopAllLoading: () => void;
  
  // Utility methods
  isOperationLoading: (id: string) => boolean;
  getOperation: (id: string) => LoadingOperation | undefined;
  
  // Bulk operations
  startBulkOperation: (operations: Array<{ id: string; text: string }>) => void;
  updateBulkProgress: (progress: Record<string, number>) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [operations, setOperations] = useState<Map<string, LoadingOperation>>(new Map());
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Calculate global loading state from all operations
  const globalLoading: LoadingState = React.useMemo(() => {
    const activeOperations = Array.from(operations.values());
    
    if (activeOperations.length === 0) {
      return { isLoading: false };
    }

    // Find the most important operation (overlay > progress > spinner)
    const overlayOp = activeOperations.find(op => op.overlay);
    const progressOp = activeOperations.find(op => op.type === 'progress');
    const primaryOp = overlayOp || progressOp || activeOperations[0];

    return {
      isLoading: true,
      loadingText: primaryOp.text,
      progress: primaryOp.progress,
      type: primaryOp.type || 'spinner',
      overlay: primaryOp.overlay,
      cancellable: primaryOp.cancellable,
    };
  }, [operations]);

  const startLoading = useCallback((id: string, options: Partial<LoadingOperation> = {}) => {
    const operation: LoadingOperation = {
      id,
      text: options.text || 'Loading...',
      progress: options.progress,
      type: options.type || 'spinner',
      overlay: options.overlay || false,
      cancellable: options.cancellable || false,
      onCancel: options.onCancel,
      startTime: Date.now(),
    };

    setOperations(prev => new Map(prev).set(id, operation));

    // Auto-stop loading after 30 seconds to prevent stuck states
    const timeout = setTimeout(() => {
      console.warn(`Loading operation "${id}" auto-stopped after 30 seconds`);
      stopLoading(id);
    }, 30000);

    timeoutRefs.current.set(id, timeout);
  }, []);

  const updateLoading = useCallback((id: string, updates: Partial<LoadingOperation>) => {
    setOperations(prev => {
      const current = prev.get(id);
      if (!current) return prev;

      const updated = { ...current, ...updates };
      const newMap = new Map(prev);
      newMap.set(id, updated);
      return newMap;
    });
  }, []);

  const stopLoading = useCallback((id: string) => {
    setOperations(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });

    // Clear timeout
    const timeout = timeoutRefs.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutRefs.current.delete(id);
    }
  }, []);

  const stopAllLoading = useCallback(() => {
    setOperations(new Map());
    
    // Clear all timeouts
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    timeoutRefs.current.clear();
  }, []);

  const isOperationLoading = useCallback((id: string) => {
    return operations.has(id);
  }, [operations]);

  const getOperation = useCallback((id: string) => {
    return operations.get(id);
  }, [operations]);

  const startBulkOperation = useCallback((operationList: Array<{ id: string; text: string }>) => {
    operationList.forEach(({ id, text }) => {
      startLoading(id, { text, type: 'progress', progress: 0 });
    });
  }, [startLoading]);

  const updateBulkProgress = useCallback((progress: Record<string, number>) => {
    Object.entries(progress).forEach(([id, progressValue]) => {
      updateLoading(id, { progress: progressValue });
    });
  }, [updateLoading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  const value: LoadingContextType = {
    globalLoading,
    operations,
    startLoading,
    updateLoading,
    stopLoading,
    stopAllLoading,
    isOperationLoading,
    getOperation,
    startBulkOperation,
    updateBulkProgress,
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
}

// Hook to use loading context
export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}

// Hook for managing a specific loading operation
export function useLoadingOperation(id: string) {
  const { startLoading, updateLoading, stopLoading, isOperationLoading, getOperation } = useLoading();

  const start = useCallback((options?: Partial<LoadingOperation>) => {
    startLoading(id, options);
  }, [id, startLoading]);

  const update = useCallback((updates: Partial<LoadingOperation>) => {
    updateLoading(id, updates);
  }, [id, updateLoading]);

  const stop = useCallback(() => {
    stopLoading(id);
  }, [id, stopLoading]);

  const isLoading = isOperationLoading(id);
  const operation = getOperation(id);

  return {
    isLoading,
    operation,
    start,
    update,
    stop,
  };
}

// Hook for async operations with automatic loading management
export function useAsyncOperation<T = any>(id: string) {
  const { start, stop, update, isLoading } = useLoadingOperation(id);

  const execute = useCallback(async (
    operation: () => Promise<T>,
    options?: {
      text?: string;
      onProgress?: (progress: number) => void;
      onSuccess?: (result: T) => void;
      onError?: (error: any) => void;
    }
  ): Promise<T | null> => {
    try {
      start({
        text: options?.text || 'Processing...',
        type: options?.onProgress ? 'progress' : 'spinner',
        progress: options?.onProgress ? 0 : undefined,
      });

      const result = await operation();
      
      if (options?.onSuccess) {
        options.onSuccess(result);
      }
      
      return result;
    } catch (error) {
      if (options?.onError) {
        options.onError(error);
      }
      throw error;
    } finally {
      stop();
    }
  }, [start, stop, update]);

  return {
    execute,
    isLoading,
    updateProgress: (progress: number) => update({ progress }),
    updateText: (text: string) => update({ text }),
  };
}

export default LoadingContext;
