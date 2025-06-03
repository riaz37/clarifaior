import { useCallback } from "react";
import { toast } from "react-hot-toast";
import {
  useLoading,
  useLoadingOperation,
  useAsyncOperation,
} from "./loading-context";
import { useErrorHandler } from "./error-handler";

// Hook for API calls with automatic loading management
export function useApiCall<T = any>(operationId: string) {
  const { execute, isLoading, updateProgress, updateText } =
    useAsyncOperation<T>(operationId);
  const { handleError } = useErrorHandler();

  const call = useCallback(
    async (
      apiCall: () => Promise<T>,
      options?: {
        loadingText?: string;
        successMessage?: string;
        errorMessage?: string;
        showOverlay?: boolean;
        onProgress?: (progress: number) => void;
        onSuccess?: (result: T) => void;
        onError?: (error: any) => void;
      },
    ): Promise<T | null> => {
      return execute(apiCall, {
        text: options?.loadingText || "Processing...",
        onProgress: options?.onProgress,
        onSuccess: (result) => {
          if (options?.successMessage) {
            toast.success(options.successMessage);
          }
          options?.onSuccess?.(result);
        },
        onError: (error) => {
          const appError = handleError(error, { context: operationId });
          const errorMessage = options?.errorMessage || appError.message;
          toast.error(errorMessage);
          options?.onError?.(error);
        },
      });
    },
    [execute, handleError, operationId],
  );

  return {
    call,
    isLoading,
    updateProgress,
    updateText,
  };
}

// Hook for form submissions with loading states
export function useFormSubmission(formId: string) {
  const { call, isLoading } = useApiCall(formId);

  const submit = useCallback(
    async <T>(
      submitFn: () => Promise<T>,
      options?: {
        successMessage?: string;
        onSuccess?: (result: T) => void;
        onError?: (error: any) => void;
      },
    ) => {
      return call(submitFn, {
        loadingText: "Submitting...",
        successMessage: options?.successMessage || "Submitted successfully!",
        showOverlay: true,
        onSuccess: options?.onSuccess,
        onError: options?.onError,
      });
    },
    [call],
  );

  return {
    submit,
    isSubmitting: isLoading,
  };
}

// Hook for file uploads with progress tracking
export function useFileUpload(uploadId: string) {
  const { start, update, stop, isLoading } = useLoadingOperation(uploadId);

  const upload = useCallback(
    async (
      file: File,
      uploadFn: (
        file: File,
        onProgress: (progress: number) => void,
      ) => Promise<any>,
      options?: {
        onSuccess?: (result: any) => void;
        onError?: (error: any) => void;
      },
    ) => {
      try {
        start({
          text: `Uploading ${file.name}...`,
          type: "progress",
          progress: 0,
          overlay: true,
          cancellable: true,
        });

        const result = await uploadFn(file, (progress) => {
          update({ progress });
        });

        toast.success("File uploaded successfully!");
        options?.onSuccess?.(result);
        return result;
      } catch (error) {
        toast.error("Upload failed");
        options?.onError?.(error);
        throw error;
      } finally {
        stop();
      }
    },
    [start, update, stop],
  );

  return {
    upload,
    isUploading: isLoading,
  };
}

// Hook for bulk operations with progress tracking
export function useBulkOperation(operationId: string) {
  const { startBulkOperation, updateBulkProgress, stopLoading } = useLoading();
  const { handleError } = useErrorHandler();

  const execute = useCallback(
    async <T>(
      items: Array<{ id: string; data: any }>,
      processFn: (item: any) => Promise<T>,
      options?: {
        batchSize?: number;
        onProgress?: (completed: number, total: number) => void;
        onItemComplete?: (item: any, result: T) => void;
        onItemError?: (item: any, error: any) => void;
        onComplete?: (results: Array<T | null>) => void;
      },
    ) => {
      const batchSize = options?.batchSize || 5;
      const results: Array<T | null> = [];
      let completed = 0;

      try {
        // Start loading for all items
        startBulkOperation(
          items.map((item) => ({
            id: `${operationId}-${item.id}`,
            text: `Processing ${item.id}...`,
          })),
        );

        // Process items in batches
        for (let i = 0; i < items.length; i += batchSize) {
          const batch = items.slice(i, i + batchSize);

          const batchPromises = batch.map(async (item) => {
            try {
              const result = await processFn(item.data);
              completed++;

              // Update progress
              const progress = (completed / items.length) * 100;
              updateBulkProgress({
                [`${operationId}-${item.id}`]: 100,
              });

              options?.onProgress?.(completed, items.length);
              options?.onItemComplete?.(item, result);

              return result;
            } catch (error) {
              completed++;
              options?.onItemError?.(item, error);
              handleError(error, {
                context: `bulk-${operationId}`,
                item: item.id,
              });
              return null;
            } finally {
              stopLoading(`${operationId}-${item.id}`);
            }
          });

          const batchResults = await Promise.all(batchPromises);
          results.push(...batchResults);
        }

        options?.onComplete?.(results);
        return results;
      } catch (error) {
        handleError(error, { context: `bulk-${operationId}` });
        throw error;
      }
    },
    [
      operationId,
      startBulkOperation,
      updateBulkProgress,
      stopLoading,
      handleError,
    ],
  );

  return { execute };
}

// Hook for page loading states
export function usePageLoading(pageId: string) {
  const { start, stop, isLoading } = useLoadingOperation(pageId);

  const startPageLoad = useCallback(
    (text = "Loading page...") => {
      start({
        text,
        type: "spinner",
        overlay: false,
      });
    },
    [start],
  );

  const stopPageLoad = useCallback(() => {
    stop();
  }, [stop]);

  return {
    startPageLoad,
    stopPageLoad,
    isPageLoading: isLoading,
  };
}

// Hook for navigation loading
export function useNavigationLoading() {
  const { start, stop, isLoading } = useLoadingOperation("navigation");

  const startNavigation = useCallback(
    (destination: string) => {
      start({
        text: `Navigating to ${destination}...`,
        type: "spinner",
        overlay: false,
      });
    },
    [start],
  );

  const stopNavigation = useCallback(() => {
    stop();
  }, [stop]);

  return {
    startNavigation,
    stopNavigation,
    isNavigating: isLoading,
  };
}

// Hook for search operations
export function useSearchLoading(searchId: string) {
  const { start, update, stop, isLoading } = useLoadingOperation(searchId);

  const startSearch = useCallback(
    (query: string) => {
      start({
        text: `Searching for "${query}"...`,
        type: "spinner",
        overlay: false,
      });
    },
    [start],
  );

  const updateSearchProgress = useCallback(
    (text: string) => {
      update({ text });
    },
    [update],
  );

  const stopSearch = useCallback(() => {
    stop();
  }, [stop]);

  return {
    startSearch,
    updateSearchProgress,
    stopSearch,
    isSearching: isLoading,
  };
}

// Hook for data synchronization
export function useSyncLoading(syncId: string) {
  const { start, update, stop, isLoading } = useLoadingOperation(syncId);

  const startSync = useCallback(
    (source: string) => {
      start({
        text: `Syncing with ${source}...`,
        type: "progress",
        progress: 0,
        overlay: false,
      });
    },
    [start],
  );

  const updateSyncProgress = useCallback(
    (progress: number, text?: string) => {
      update({
        progress,
        text: text || `Syncing... ${Math.round(progress)}%`,
      });
    },
    [update],
  );

  const stopSync = useCallback(() => {
    stop();
  }, [stop]);

  return {
    startSync,
    updateSyncProgress,
    stopSync,
    isSyncing: isLoading,
  };
}

// Hook for authentication operations
export function useAuthLoading() {
  const { call, isLoading } = useApiCall("auth");

  const login = useCallback(
    async (loginFn: () => Promise<any>) => {
      return call(loginFn, {
        loadingText: "Signing in...",
        successMessage: "Welcome back!",
        showOverlay: true,
      });
    },
    [call],
  );

  const register = useCallback(
    async (registerFn: () => Promise<any>) => {
      return call(registerFn, {
        loadingText: "Creating account...",
        successMessage: "Account created successfully!",
        showOverlay: true,
      });
    },
    [call],
  );

  const logout = useCallback(
    async (logoutFn: () => Promise<any>) => {
      return call(logoutFn, {
        loadingText: "Signing out...",
        showOverlay: true,
      });
    },
    [call],
  );

  return {
    login,
    register,
    logout,
    isAuthLoading: isLoading,
  };
}

export default {
  useApiCall,
  useFormSubmission,
  useFileUpload,
  useBulkOperation,
  usePageLoading,
  useNavigationLoading,
  useSearchLoading,
  useSyncLoading,
  useAuthLoading,
};
