"use client";

import { memo } from "react";
import { NodeProps } from "reactflow";
import { BaseNode, BaseNodeData } from "./BaseNode";
import { Badge } from "@repo/ui/badge";
import { Brain, Search, Zap } from "lucide-react";

interface LLMNodeData extends BaseNodeData {
  category: "ai";
  llmType?: "prompt" | "memory";
}

export const LLMNode = memo(({ data, selected }: NodeProps<LLMNodeData>) => {
  const getLLMIcon = (type?: string) => {
    switch (type) {
      case "memory":
        return <Search className="h-4 w-4" />;
      case "prompt":
      default:
        return <Brain className="h-4 w-4" />;
    }
  };

  const getLLMDetails = () => {
    const config = data.config || {};

    switch (data.llmType) {
      case "prompt":
        return (
          <div className="space-y-2">
            <div className="text-xs text-gray-400">LLM Model</div>
            <Badge variant="ai" className="text-xs">
              {config.model || "deepseek-chat"}
            </Badge>

            {config.prompt && (
              <div className="space-y-1">
                <div className="text-xs text-gray-400">Prompt Preview</div>
                <div className="text-xs text-gray-300 bg-black/20 p-2 rounded max-h-16 overflow-hidden">
                  {config.prompt.length > 100
                    ? `${config.prompt.substring(0, 100)}...`
                    : config.prompt}
                </div>
              </div>
            )}

            <div className="flex space-x-2">
              {config.temperature && (
                <Badge variant="outline" className="text-xs">
                  Temp: {config.temperature}
                </Badge>
              )}
              {config.maxTokens && (
                <Badge variant="outline" className="text-xs">
                  Max: {config.maxTokens}
                </Badge>
              )}
            </div>
          </div>
        );

      case "memory":
        return (
          <div className="space-y-2">
            <div className="text-xs text-gray-400">Memory Search</div>

            {config.query && (
              <div className="space-y-1">
                <div className="text-xs text-gray-400">Query</div>
                <div className="text-xs text-gray-300 bg-black/20 p-2 rounded">
                  {config.query}
                </div>
              </div>
            )}

            <div className="flex space-x-2">
              {config.topK && (
                <Badge variant="outline" className="text-xs">
                  Top {config.topK}
                </Badge>
              )}
              {config.threshold && (
                <Badge variant="outline" className="text-xs">
                  Min: {config.threshold}
                </Badge>
              )}
            </div>
          </div>
        );

      default:
        return <div className="text-xs text-gray-400">AI processing node</div>;
    }
  };

  return (
    <BaseNode
      data={{
        ...data,
        category: "ai",
      }}
      selected={selected}
      onConfigure={() => console.log("Configure LLM")}
      onDelete={() => console.log("Delete LLM")}
    >
      <div className="flex items-center space-x-2 mb-2">
        {getLLMIcon(data.llmType)}
        <span className="text-sm text-gray-300">
          {data.llmType === "memory" ? "Memory" : "AI"}
        </span>
        <Zap className="h-3 w-3 text-cyan-400" />
      </div>

      {getLLMDetails()}
    </BaseNode>
  );
});

LLMNode.displayName = "LLMNode";
