"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./lib/utils";

const spinnerVariants = cva("animate-spin rounded-full border-solid", {
  variants: {
    size: {
      sm: "h-4 w-4 border-2",
      default: "h-6 w-6 border-2",
      lg: "h-8 w-8 border-3",
      xl: "h-12 w-12 border-4",
    },
    variant: {
      default: "border-gray-300 border-t-gray-900 dark:border-gray-600 dark:border-t-gray-100",
      primary: "border-blue-200 border-t-blue-600 dark:border-blue-800 dark:border-t-blue-400",
      ai: "border-cyan-200 border-t-cyan-600 dark:border-cyan-800 dark:border-t-cyan-400",
      success: "border-green-200 border-t-green-600 dark:border-green-800 dark:border-t-green-400",
      warning: "border-yellow-200 border-t-yellow-600 dark:border-yellow-800 dark:border-t-yellow-400",
      destructive: "border-red-200 border-t-red-600 dark:border-red-800 dark:border-t-red-400",
    },
  },
  defaultVariants: {
    size: "default",
    variant: "default",
  },
});

export interface SpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  label?: string;
}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size, variant, label, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex items-center justify-center", className)}
        {...props}
      >
        <div
          className={cn(spinnerVariants({ size, variant }))}
          role="status"
          aria-label={label || "Loading"}
        >
          <span className="sr-only">{label || "Loading..."}</span>
        </div>
      </div>
    );
  }
);
Spinner.displayName = "Spinner";

// Loading overlay component
export interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  className?: string;
  spinnerSize?: "sm" | "default" | "lg" | "xl";
  spinnerVariant?: "default" | "primary" | "ai" | "success" | "warning" | "destructive";
  label?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  children,
  className,
  spinnerSize = "lg",
  spinnerVariant = "ai",
  label = "Loading...",
}) => {
  return (
    <div className={cn("relative", className)}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50 dark:bg-gray-900/80">
          <div className="flex flex-col items-center space-y-2">
            <Spinner size={spinnerSize} variant={spinnerVariant} label={label} />
            <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export { Spinner, LoadingOverlay, spinnerVariants };
