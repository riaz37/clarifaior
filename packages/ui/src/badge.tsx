"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gray-900 text-gray-50 hover:bg-gray-900/80 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-50/80",
        secondary:
          "border-transparent bg-gray-100 text-gray-900 hover:bg-gray-100/80 dark:bg-gray-800 dark:text-gray-50 dark:hover:bg-gray-800/80",
        destructive:
          "border-transparent bg-red-500 text-gray-50 hover:bg-red-500/80 dark:bg-red-900 dark:text-gray-50 dark:hover:bg-red-900/80",
        outline: "text-gray-950 dark:text-gray-50",
        success:
          "border-transparent bg-green-500 text-white hover:bg-green-500/80 dark:bg-green-600 dark:hover:bg-green-600/80",
        warning:
          "border-transparent bg-yellow-500 text-white hover:bg-yellow-500/80 dark:bg-yellow-600 dark:hover:bg-yellow-600/80",
        info: "border-transparent bg-blue-500 text-white hover:bg-blue-500/80 dark:bg-blue-600 dark:hover:bg-blue-600/80",
        ai: "border-transparent bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600 shadow-lg",
        pending:
          "border-transparent bg-gray-400 text-white hover:bg-gray-400/80 dark:bg-gray-600 dark:hover:bg-gray-600/80",
        running:
          "border-transparent bg-blue-500 text-white hover:bg-blue-500/80 animate-pulse",
        completed:
          "border-transparent bg-green-500 text-white hover:bg-green-500/80",
        failed: "border-transparent bg-red-500 text-white hover:bg-red-500/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
