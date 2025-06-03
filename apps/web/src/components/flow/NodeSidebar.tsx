"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { Button } from "@repo/ui/button";
import { Badge } from "@repo/ui/badge";
import { Input } from "@repo/ui/input";
import { NODE_CATEGORIES, NodeType } from "./node-types";
import { Search, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";

interface NodeSidebarProps {
  onNodeDragStart: (nodeType: NodeType, nodeData: any) => void;
}

export function NodeSidebar({ onNodeDragStart }: NodeSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<string[]>([
    "triggers",
    "ai",
  ]);

  const toggleCategory = (categoryKey: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryKey)
        ? prev.filter((key) => key !== categoryKey)
        : [...prev, categoryKey],
    );
  };

  const filteredCategories = Object.entries(NODE_CATEGORIES)
    .map(([key, category]) => ({
      key,
      ...category,
      nodes: category.nodes.filter(
        (node) =>
          node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          node.description.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    }))
    .filter((category) => category.nodes.length > 0);

  const handleDragStart = (
    event: React.DragEvent,
    nodeType: NodeType,
    nodeData: any,
  ) => {
    event.dataTransfer.setData(
      "application/reactflow",
      JSON.stringify({ nodeType, nodeData }),
    );
    event.dataTransfer.effectAllowed = "move";
    onNodeDragStart(nodeType, nodeData);
  };

  return (
    <div className="w-80 bg-gray-900/95 backdrop-blur-xl border-r border-white/10 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <h2 className="text-lg font-semibold text-white mb-3">Node Library</h2>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/5 border-white/10"
            variant="ai"
          />
        </div>
      </div>

      {/* Node Categories */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredCategories.map((category) => (
          <Card key={category.key} className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <Button
                variant="ghost"
                className="w-full justify-between p-0 h-auto text-white hover:text-cyan-400"
                onClick={() => toggleCategory(category.key)}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{category.icon}</span>
                  <CardTitle className="text-sm">{category.label}</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {category.nodes.length}
                  </Badge>
                </div>
                {expandedCategories.includes(category.key) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CardHeader>

            {expandedCategories.includes(category.key) && (
              <CardContent className="pt-0 space-y-2">
                {category.nodes.map((node) => (
                  <div
                    key={node.type}
                    draggable
                    onDragStart={(e) =>
                      handleDragStart(e, node.type as NodeType, {
                        label: node.label,
                        icon: node.icon,
                        category: category.key,
                        [category.key === "triggers"
                          ? "triggerType"
                          : category.key === "ai"
                            ? "llmType"
                            : category.key === "actions"
                              ? "actionType"
                              : "logicType"]: node.type.split("_")[1],
                      })
                    }
                    className={cn(
                      "group cursor-grab active:cursor-grabbing p-3 rounded-lg border border-white/10 hover:border-white/20 transition-all duration-200 bg-gradient-to-r",
                      category.color,
                      "hover:shadow-lg",
                    )}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                          <span className="text-sm">{node.icon}</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-white group-hover:text-white/90">
                          {node.label}
                        </h4>
                        <p className="text-xs text-gray-300 group-hover:text-gray-200 mt-1">
                          {node.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        ))}

        {filteredCategories.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">No nodes found</div>
            <div className="text-sm text-gray-500">
              Try adjusting your search query
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <div className="text-xs text-gray-400 text-center">
          Drag nodes to the canvas to build your flow
        </div>
      </div>
    </div>
  );
}
