"use client";

import React from "react";
import { createPortal } from "react-dom";
import { useLoading } from "../../lib/loading-context";
import { Spinner } from "@repo/ui/spinner";
import { Button } from "@repo/ui/button";
import { X, AlertCircle } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";

interface LoadingOverlayProps {
  className?: string;
}

export function LoadingOverlay({ className }: LoadingOverlayProps) {
  const { globalLoading, operations, stopAllLoading } = useLoading();

  // Don't render if not loading or no overlay needed
  if (!globalLoading.isLoading || !globalLoading.overlay) {
    return null;
  }

  const handleCancel = () => {
    // Find cancellable operations and call their cancel handlers
    const cancellableOps = Array.from(operations.values()).filter(
      (op) => op.cancellable,
    );
    cancellableOps.forEach((op) => {
      if (op.onCancel) {
        op.onCancel();
      }
    });

    // If no specific cancel handlers, stop all loading
    if (
      cancellableOps.length === 0 ||
      cancellableOps.every((op) => !op.onCancel)
    ) {
      stopAllLoading();
    }
  };

  const overlayContent = (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        "bg-black/50 backdrop-blur-sm",
        className,
      )}
    >
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">
            {globalLoading.loadingText || "Loading..."}
          </h3>
          {globalLoading.cancellable && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              className="text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Loading Content */}
        <div className="space-y-4">
          {/* Progress Bar or Spinner */}
          {globalLoading.type === "progress" &&
          typeof globalLoading.progress === "number" ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-300">
                <span>Progress</span>
                <span>{Math.round(globalLoading.progress)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${globalLoading.progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <Spinner className="h-8 w-8 text-cyan-400" />
            </div>
          )}

          {/* Active Operations List */}
          {operations.size > 1 && (
            <div className="space-y-2">
              <div className="text-sm text-gray-400">Active Operations:</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {Array.from(operations.values()).map((operation) => (
                  <div
                    key={operation.id}
                    className="flex items-center justify-between text-xs text-gray-300 bg-white/5 rounded px-2 py-1"
                  >
                    <span className="truncate">{operation.text}</span>
                    {operation.type === "progress" &&
                      typeof operation.progress === "number" && (
                        <span className="ml-2 text-cyan-400">
                          {Math.round(operation.progress)}%
                        </span>
                      )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cancel Button */}
          {globalLoading.cancellable && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render in portal to ensure it's on top
  if (typeof window !== "undefined") {
    return createPortal(overlayContent, document.body);
  }

  return null;
}

// Loading skeleton component for inline loading states
export function LoadingSkeleton({
  lines = 3,
  className,
  showAvatar = false,
}: {
  lines?: number;
  className?: string;
  showAvatar?: boolean;
}) {
  return (
    <div className={cn("animate-pulse space-y-3", className)}>
      {showAvatar && (
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-700 rounded-full" />
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-gray-700 rounded w-1/4" />
            <div className="h-3 bg-gray-700 rounded w-1/3" />
          </div>
        </div>
      )}

      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div
            className="h-4 bg-gray-700 rounded"
            style={{ width: `${Math.random() * 40 + 60}%` }}
          />
          {i < lines - 1 && (
            <div
              className="h-3 bg-gray-700 rounded"
              style={{ width: `${Math.random() * 30 + 50}%` }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// Loading card component
export function LoadingCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "bg-white/5 border border-white/10 rounded-lg p-6",
        className,
      )}
    >
      <LoadingSkeleton lines={3} showAvatar />
    </div>
  );
}

// Loading grid component
export function LoadingGrid({
  count = 6,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <LoadingCard key={i} />
      ))}
    </div>
  );
}

// Loading list component
export function LoadingList({
  count = 5,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white/5 border border-white/10 rounded-lg p-4"
        >
          <LoadingSkeleton lines={2} showAvatar />
        </div>
      ))}
    </div>
  );
}

// Loading button component
export function LoadingButton({
  isLoading,
  children,
  loadingText = "Loading...",
  ...props
}: {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
} & React.ComponentProps<typeof Button>) {
  return (
    <Button {...props} disabled={isLoading || props.disabled}>
      {isLoading ? (
        <>
          <Spinner className="h-4 w-4 mr-2" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

export default LoadingOverlay;
