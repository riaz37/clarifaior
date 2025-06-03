"use client";

import { memo } from "react";
import { NodeProps } from "reactflow";
import { BaseNode, BaseNodeData } from "./BaseNode";
import { Badge } from "@repo/ui/badge";
import { Mail, MessageSquare, FileText, Send } from "lucide-react";

interface ActionNodeData extends BaseNodeData {
  category: "action";
  actionType?: "email" | "slack" | "notion";
}

export const ActionNode = memo(
  ({ data, selected }: NodeProps<ActionNodeData>) => {
    const getActionIcon = (type?: string) => {
      switch (type) {
        case "email":
          return <Mail className="h-4 w-4" />;
        case "slack":
          return <MessageSquare className="h-4 w-4" />;
        case "notion":
          return <FileText className="h-4 w-4" />;
        default:
          return <Send className="h-4 w-4" />;
      }
    };

    const getActionDetails = () => {
      const config = data.config || {};

      switch (data.actionType) {
        case "email":
          return (
            <div className="space-y-2">
              <div className="text-xs text-gray-400">Email Details</div>

              {config.to && (
                <div className="space-y-1">
                  <div className="text-xs text-gray-500">To:</div>
                  <div className="text-xs text-gray-300 bg-black/20 p-1 rounded">
                    {config.to}
                  </div>
                </div>
              )}

              {config.subject && (
                <div className="space-y-1">
                  <div className="text-xs text-gray-500">Subject:</div>
                  <div className="text-xs text-gray-300 bg-black/20 p-1 rounded">
                    {config.subject.length > 50
                      ? `${config.subject.substring(0, 50)}...`
                      : config.subject}
                  </div>
                </div>
              )}

              <div className="flex space-x-2">
                <Badge variant="outline" className="text-xs">
                  {config.html ? "HTML" : "Text"}
                </Badge>
                {config.useOAuth && (
                  <Badge variant="ai" className="text-xs">
                    OAuth
                  </Badge>
                )}
              </div>
            </div>
          );

        case "slack":
          return (
            <div className="space-y-2">
              <div className="text-xs text-gray-400">Slack Message</div>

              {config.channel && (
                <div className="space-y-1">
                  <div className="text-xs text-gray-500">Channel:</div>
                  <Badge variant="outline" className="text-xs">
                    {config.channel}
                  </Badge>
                </div>
              )}

              {config.message && (
                <div className="space-y-1">
                  <div className="text-xs text-gray-500">Message:</div>
                  <div className="text-xs text-gray-300 bg-black/20 p-1 rounded max-h-12 overflow-hidden">
                    {config.message.length > 80
                      ? `${config.message.substring(0, 80)}...`
                      : config.message}
                  </div>
                </div>
              )}

              {config.threadReply && (
                <Badge variant="outline" className="text-xs">
                  Thread Reply
                </Badge>
              )}
            </div>
          );

        case "notion":
          return (
            <div className="space-y-2">
              <div className="text-xs text-gray-400">Notion Page</div>

              {config.database && (
                <div className="space-y-1">
                  <div className="text-xs text-gray-500">Database:</div>
                  <Badge variant="outline" className="text-xs">
                    {config.database}
                  </Badge>
                </div>
              )}

              {config.title && (
                <div className="space-y-1">
                  <div className="text-xs text-gray-500">Title:</div>
                  <div className="text-xs text-gray-300 bg-black/20 p-1 rounded">
                    {config.title.length > 50
                      ? `${config.title.substring(0, 50)}...`
                      : config.title}
                  </div>
                </div>
              )}

              {config.properties &&
                Object.keys(config.properties).length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {Object.keys(config.properties).length} Properties
                  </Badge>
                )}
            </div>
          );

        default:
          return <div className="text-xs text-gray-400">Action node</div>;
      }
    };

    return (
      <BaseNode
        data={{
          ...data,
          category: "action",
        }}
        selected={selected}
        showSourceHandle={false} // Actions are typically end nodes
        onConfigure={() => console.log("Configure action")}
        onDelete={() => console.log("Delete action")}
      >
        <div className="flex items-center space-x-2 mb-2">
          {getActionIcon(data.actionType)}
          <span className="text-sm text-gray-300">Action</span>
        </div>

        {getActionDetails()}
      </BaseNode>
    );
  },
);

ActionNode.displayName = "ActionNode";
