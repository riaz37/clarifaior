"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import { Button } from "@repo/ui/button";
import { Badge } from "@repo/ui/badge";
import { StatusIcon } from "@repo/ui/icons";
import {
  Settings,
  ExternalLink,
  RefreshCw,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  Key,
} from "lucide-react";

export interface Integration {
  id: string;
  name: string;
  description: string;
  type:
    | "deepseek"
    | "gemini"
    | "openai"
    | "gmail"
    | "slack"
    | "notion"
    | "pinecone"
    | "webhook";
  status: "connected" | "disconnected" | "error" | "pending";
  isConfigured: boolean;
  lastUsed?: string;
  usageCount?: number;
  config?: Record<string, any>;
  error?: string;
  requiresOAuth?: boolean;
  hasApiKey?: boolean;
}

interface IntegrationCardProps {
  integration: Integration;
  onConnect?: (integrationId: string) => void;
  onDisconnect?: (integrationId: string) => void;
  onConfigure?: (integrationId: string) => void;
  onTest?: (integrationId: string) => void;
}

const integrationIcons: Record<string, string> = {
  deepseek: "🧠",
  gemini: "💎",
  openai: "🤖",
  gmail: "📧",
  slack: "💬",
  notion: "📝",
  pinecone: "🌲",
  webhook: "🔗",
};

const integrationColors: Record<string, string> = {
  deepseek: "from-blue-500 to-cyan-500",
  gemini: "from-purple-500 to-pink-500",
  openai: "from-green-500 to-teal-500",
  gmail: "from-red-500 to-orange-500",
  slack: "from-purple-600 to-indigo-600",
  notion: "from-gray-600 to-gray-800",
  pinecone: "from-green-600 to-emerald-600",
  webhook: "from-blue-600 to-cyan-600",
};

export function IntegrationCard({
  integration,
  onConnect,
  onDisconnect,
  onConfigure,
  onTest,
}: IntegrationCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async (action: () => void) => {
    setIsLoading(true);
    try {
      await action();
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (integration.status) {
      case "connected":
        return <Badge variant="success">Connected</Badge>;
      case "disconnected":
        return <Badge variant="secondary">Disconnected</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      case "pending":
        return <Badge variant="warning">Pending</Badge>;
      default:
        return <Badge variant="outline">{integration.status}</Badge>;
    }
  };

  const getStatusIcon = () => {
    switch (integration.status) {
      case "connected":
        return <StatusIcon status="success" className="h-4 w-4" />;
      case "error":
        return <StatusIcon status="error" className="h-4 w-4" />;
      case "pending":
        return <StatusIcon status="warning" className="h-4 w-4" />;
      default:
        return <StatusIcon status="info" className="h-4 w-4" />;
    }
  };

  return (
    <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`w-12 h-12 bg-gradient-to-r ${integrationColors[integration.type]} rounded-lg flex items-center justify-center`}
            >
              <span className="text-2xl">
                {integrationIcons[integration.type]}
              </span>
            </div>
            <div>
              <CardTitle className="text-white text-lg flex items-center space-x-2">
                <span>{integration.name}</span>
                {getStatusIcon()}
              </CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                {getStatusBadge()}
                {integration.requiresOAuth && (
                  <Badge variant="outline" className="text-xs">
                    OAuth
                  </Badge>
                )}
                {integration.hasApiKey && (
                  <Badge variant="outline" className="text-xs">
                    <Key className="h-3 w-3 mr-1" />
                    API Key
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
        <CardDescription className="text-gray-300 mt-2">
          {integration.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Error Message */}
        {integration.error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-red-400 text-sm font-medium">
                  Connection Error
                </div>
                <div className="text-red-300 text-xs mt-1">
                  {integration.error}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Usage Stats */}
        {integration.status === "connected" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400">Usage Count</p>
              <p className="text-lg font-semibold text-white">
                {integration.usageCount?.toLocaleString() || 0}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Last Used</p>
              <p className="text-sm text-gray-300">
                {integration.lastUsed
                  ? new Date(integration.lastUsed).toLocaleDateString()
                  : "Never"}
              </p>
            </div>
          </div>
        )}

        {/* Configuration Status */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Configuration</span>
          <div className="flex items-center space-x-2">
            {integration.isConfigured ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-green-400">Complete</span>
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 text-yellow-400" />
                <span className="text-yellow-400">Required</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <div className="flex items-center space-x-2">
            {integration.status === "connected" ? (
              <>
                {onTest && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAction(() => onTest(integration.id))}
                    disabled={isLoading}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    <RefreshCw
                      className={`h-3 w-3 mr-2 ${isLoading ? "animate-spin" : ""}`}
                    />
                    Test
                  </Button>
                )}
                {onConfigure && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      handleAction(() => onConfigure!(integration.id))
                    }
                    disabled={isLoading}
                    className="text-gray-400 hover:text-white"
                  >
                    <Settings className="h-3 w-3 mr-2" />
                    Configure
                  </Button>
                )}
              </>
            ) : (
              onConnect && (
                <Button
                  variant="ai"
                  size="sm"
                  onClick={() => handleAction(() => onConnect(integration.id))}
                  disabled={isLoading}
                >
                  <ExternalLink className="h-3 w-3 mr-2" />
                  Connect
                </Button>
              )
            )}
          </div>

          {integration.status === "connected" && onDisconnect && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAction(() => onDisconnect(integration.id))}
              disabled={isLoading}
              className="text-red-400 hover:text-red-300"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
