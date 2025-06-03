"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Card } from "@repo/ui/card";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Settings, Play, Pause, Trash2 } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";

export interface BaseNodeData {
  label: string;
  icon?: string;
  status?: "idle" | "running" | "success" | "error";
  config?: Record<string, any>;
  category?: "trigger" | "ai" | "action" | "logic";
}

interface BaseNodeProps extends NodeProps {
  data: BaseNodeData;
  children?: React.ReactNode;
  showSourceHandle?: boolean;
  showTargetHandle?: boolean;
  onConfigure?: () => void;
  onDelete?: () => void;
}

export const BaseNode = memo(
  ({
    data,
    children,
    selected,
    showSourceHandle = true,
    showTargetHandle = true,
    onConfigure,
    onDelete,
  }: BaseNodeProps) => {
    const getCategoryStyles = (category?: string) => {
      switch (category) {
        case "trigger":
          return {
            border: "border-yellow-500/50",
            bg: "bg-gradient-to-br from-yellow-500/10 to-orange-500/10",
            icon: "text-yellow-400",
          };
        case "ai":
          return {
            border: "border-cyan-500/50",
            bg: "bg-gradient-to-br from-cyan-500/10 to-blue-500/10",
            icon: "text-cyan-400",
          };
        case "action":
          return {
            border: "border-green-500/50",
            bg: "bg-gradient-to-br from-green-500/10 to-teal-500/10",
            icon: "text-green-400",
          };
        case "logic":
          return {
            border: "border-purple-500/50",
            bg: "bg-gradient-to-br from-purple-500/10 to-pink-500/10",
            icon: "text-purple-400",
          };
        default:
          return {
            border: "border-gray-500/50",
            bg: "bg-gradient-to-br from-gray-500/10 to-gray-600/10",
            icon: "text-gray-400",
          };
      }
    };

    const getStatusColor = (status?: string) => {
      switch (status) {
        case "running":
          return "border-blue-500 shadow-blue-500/25";
        case "success":
          return "border-green-500 shadow-green-500/25";
        case "error":
          return "border-red-500 shadow-red-500/25";
        default:
          return "";
      }
    };

    const styles = getCategoryStyles(data.category);
    const statusStyles = getStatusColor(data.status);

    return (
      <>
        {/* Target Handle */}
        {showTargetHandle && (
          <Handle
            type="target"
            position={Position.Top}
            className="w-3 h-3 bg-gray-400 border-2 border-white hover:bg-cyan-400 transition-colors"
          />
        )}

        <Card
          className={cn(
            "min-w-[200px] max-w-[300px] transition-all duration-200",
            styles.bg,
            styles.border,
            statusStyles,
            selected &&
              "ring-2 ring-cyan-500 ring-offset-2 ring-offset-gray-900",
            data.status === "running" && "animate-pulse",
          )}
        >
          {/* Node Header */}
          <div className="flex items-center justify-between p-3 border-b border-white/10">
            <div className="flex items-center space-x-2">
              {data.icon && <span className="text-lg">{data.icon}</span>}
              <div>
                <h3 className="text-sm font-medium text-white">{data.label}</h3>
                {data.status && (
                  <Badge
                    variant={
                      data.status === "running"
                        ? "running"
                        : data.status === "success"
                          ? "completed"
                          : data.status === "error"
                            ? "failed"
                            : "pending"
                    }
                    className="text-xs mt-1"
                  >
                    {data.status}
                  </Badge>
                )}
              </div>
            </div>

            {/* Node Actions */}
            <div className="flex items-center space-x-1">
              {onConfigure && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-gray-400 hover:text-white"
                  onClick={onConfigure}
                >
                  <Settings className="h-3 w-3" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-gray-400 hover:text-red-400"
                  onClick={onDelete}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Node Content */}
          {children && <div className="p-3">{children}</div>}
        </Card>

        {/* Source Handle */}
        {showSourceHandle && (
          <Handle
            type="source"
            position={Position.Bottom}
            className="w-3 h-3 bg-gray-400 border-2 border-white hover:bg-cyan-400 transition-colors"
          />
        )}
      </>
    );
  },
);

BaseNode.displayName = "BaseNode";
