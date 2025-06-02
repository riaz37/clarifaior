"use client";

import * as React from "react";
import { cn } from "./lib/utils";

// Base icon props
export interface IconProps extends React.SVGAttributes<SVGElement> {
  size?: "sm" | "default" | "lg" | "xl";
}

const iconSizes = {
  sm: "h-4 w-4",
  default: "h-5 w-5",
  lg: "h-6 w-6",
  xl: "h-8 w-8",
};

// AI Brain Icon
export const AIBrainIcon: React.FC<IconProps> = ({ 
  className, 
  size = "default", 
  ...props 
}) => (
  <svg
    className={cn(iconSizes[size], "text-current", className)}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
    <circle cx="9" cy="9" r="1" fill="currentColor" />
    <circle cx="15" cy="9" r="1" fill="currentColor" />
  </svg>
);

// Robot Icon
export const RobotIcon: React.FC<IconProps> = ({ 
  className, 
  size = "default", 
  ...props 
}) => (
  <svg
    className={cn(iconSizes[size], "text-current", className)}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    {...props}
  >
    <rect x="3" y="11" width="18" height="10" rx="2" ry="2" strokeWidth={2} />
    <circle cx="12" cy="5" r="2" strokeWidth={2} />
    <path d="M12 7v4" strokeWidth={2} />
    <line x1="8" y1="16" x2="8" y2="16" strokeWidth={2} />
    <line x1="16" y1="16" x2="16" y2="16" strokeWidth={2} />
  </svg>
);

// Flow/Network Icon
export const FlowIcon: React.FC<IconProps> = ({ 
  className, 
  size = "default", 
  ...props 
}) => (
  <svg
    className={cn(iconSizes[size], "text-current", className)}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    {...props}
  >
    <circle cx="5" cy="6" r="3" strokeWidth={2} />
    <circle cx="19" cy="6" r="3" strokeWidth={2} />
    <circle cx="12" cy="18" r="3" strokeWidth={2} />
    <path d="M8 6h8" strokeWidth={2} />
    <path d="M6 9l6 6" strokeWidth={2} />
    <path d="M18 9l-6 6" strokeWidth={2} />
  </svg>
);

// Lightning/Trigger Icon
export const TriggerIcon: React.FC<IconProps> = ({ 
  className, 
  size = "default", 
  ...props 
}) => (
  <svg
    className={cn(iconSizes[size], "text-current", className)}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    {...props}
  >
    <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" strokeWidth={2} />
  </svg>
);

// Gear/Settings Icon
export const GearIcon: React.FC<IconProps> = ({ 
  className, 
  size = "default", 
  ...props 
}) => (
  <svg
    className={cn(iconSizes[size], "text-current", className)}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    {...props}
  >
    <circle cx="12" cy="12" r="3" strokeWidth={2} />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" strokeWidth={2} />
  </svg>
);

// Status Icons
export const StatusIcon: React.FC<IconProps & { status: "success" | "error" | "warning" | "info" }> = ({ 
  status,
  className, 
  size = "default", 
  ...props 
}) => {
  const colors = {
    success: "text-green-500",
    error: "text-red-500", 
    warning: "text-yellow-500",
    info: "text-blue-500",
  };

  const icons = {
    success: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    ),
    error: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    ),
    warning: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
    ),
    info: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
  };

  return (
    <svg
      className={cn(iconSizes[size], colors[status], className)}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      {...props}
    >
      {icons[status]}
    </svg>
  );
};

// Animated AI Pulse Icon
export const AIPulseIcon: React.FC<IconProps> = ({ 
  className, 
  size = "default", 
  ...props 
}) => (
  <div className={cn("relative", iconSizes[size])}>
    <svg
      className={cn("absolute inset-0 text-cyan-500 animate-ping", className)}
      fill="currentColor"
      viewBox="0 0 24 24"
      {...props}
    >
      <circle cx="12" cy="12" r="6" />
    </svg>
    <svg
      className={cn("relative text-cyan-600", className)}
      fill="currentColor"
      viewBox="0 0 24 24"
      {...props}
    >
      <circle cx="12" cy="12" r="4" />
    </svg>
  </div>
);
