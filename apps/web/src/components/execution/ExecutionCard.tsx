"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { Button } from "@repo/ui/button";
import { Badge } from "@repo/ui/badge";
import {
  ExecutionDetails,
  getStatusColor,
  getTriggerIcon,
  formatDuration,
  formatCost,
  formatTokens,
} from "./execution-types";
import {
  ChevronDown,
  ChevronRight,
  Play,
  Square,
  RotateCcw,
  ExternalLink,
  Clock,
  DollarSign,
  Zap,
  AlertCircle,
} from "lucide-react";
import { cn } from "@repo/ui/lib/utils";

interface ExecutionCardProps {
  execution: ExecutionDetails;
  onViewDetails?: (executionId: number) => void;
  onRetry?: (executionId: number) => void;
  onCancel?: (executionId: number) => void;
}

export function ExecutionCard({
  execution,
  onViewDetails,
  onRetry,
  onCancel,
}: ExecutionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusColor = getStatusColor(execution.status);
  const triggerIcon = getTriggerIcon(execution.triggerType);
  const progressPercentage =
    execution.totalSteps > 0
      ? (execution.completedSteps / execution.totalSteps) * 100
      : 0;

  return (
    <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={cn("w-3 h-3 rounded-full border", statusColor)} />
            <div>
              <CardTitle className="text-white text-base flex items-center space-x-2">
                <span>{execution.agentName}</span>
                <span className="text-lg">{triggerIcon}</span>
              </CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge
                  variant={
                    execution.status === "completed"
                      ? "completed"
                      : execution.status === "running"
                        ? "running"
                        : execution.status === "failed"
                          ? "failed"
                          : execution.status === "pending"
                            ? "pending"
                            : "secondary"
                  }
                >
                  {execution.status}
                </Badge>
                <span className="text-xs text-gray-400">
                  ID: {execution.id}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {execution.status === "running" && onCancel && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-400 hover:text-red-300"
                onClick={() => onCancel(execution.id)}
              >
                <Square className="h-3 w-3" />
              </Button>
            )}
            {execution.status === "failed" && onRetry && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-blue-400 hover:text-blue-300"
                onClick={() => onRetry(execution.id)}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-400 hover:text-white"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {execution.status === "running" && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-400">
              <span>Progress</span>
              <span>
                {execution.completedSteps}/{execution.totalSteps} steps
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Basic Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-400 text-xs">Started</div>
            <div className="text-white">
              {new Date(execution.startedAt).toLocaleTimeString()}
            </div>
          </div>
          <div>
            <div className="text-gray-400 text-xs flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              Duration
            </div>
            <div className="text-white">
              {formatDuration(execution.duration)}
            </div>
          </div>
          <div>
            <div className="text-gray-400 text-xs flex items-center">
              <DollarSign className="h-3 w-3 mr-1" />
              Cost
            </div>
            <div className="text-white">{formatCost(execution.cost)}</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs flex items-center">
              <Zap className="h-3 w-3 mr-1" />
              Tokens
            </div>
            <div className="text-white">
              {formatTokens(execution.tokensUsed)}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {execution.error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-red-400 text-sm font-medium">Error</div>
                <div className="text-red-300 text-xs mt-1">
                  {execution.error}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Expanded Details */}
        {isExpanded && (
          <div className="space-y-4 border-t border-white/10 pt-4">
            {/* Trigger Data */}
            {execution.triggerData && (
              <div>
                <div className="text-sm font-medium text-white mb-2">
                  Trigger Data
                </div>
                <div className="bg-black/20 rounded-lg p-3">
                  <pre className="text-xs text-gray-300 overflow-x-auto">
                    {JSON.stringify(execution.triggerData, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Steps */}
            <div>
              <div className="text-sm font-medium text-white mb-2">
                Execution Steps
              </div>
              <div className="space-y-2">
                {execution.steps.map((step, index) => (
                  <div
                    key={step.id}
                    className="flex items-center justify-between p-2 bg-black/20 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-xs text-gray-400 w-6">
                        {index + 1}
                      </div>
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          getStatusColor(step.status),
                        )}
                      />
                      <div>
                        <div className="text-sm text-white">
                          {step.nodeType}
                        </div>
                        <div className="text-xs text-gray-400">
                          {step.nodeId}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatDuration(step.duration)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <div className="text-xs text-gray-400">
                Execution #{execution.id} • {execution.triggerType} trigger
              </div>
              {onViewDetails && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDetails(execution.id)}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <ExternalLink className="h-3 w-3 mr-2" />
                  View Details
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
