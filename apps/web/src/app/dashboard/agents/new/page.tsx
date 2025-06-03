"use client";

import { useState } from "react";
import { DashboardLayout } from "../../../../components/dashboard/dashboard-layout";
import { FlowEditor } from "../../../../components/flow/FlowEditor";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Badge } from "@repo/ui/badge";
import {
  ArrowLeft,
  Save,
  Play,
  Settings,
  Bot,
  Zap,
  Clock,
  CheckCircle,
} from "lucide-react";
import { Node, Edge } from "reactflow";

export default function NewAgentPage() {
  const [agentName, setAgentName] = useState("");
  const [agentDescription, setAgentDescription] = useState("");
  const [isDeploying, setIsDeploying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveFlow = async (nodes: Node[], edges: Edge[]) => {
    setIsSaving(true);
    try {
      // TODO: Implement save to backend
      console.log("Saving flow:", { nodes, edges });
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecuteFlow = async () => {
    // TODO: Implement flow execution
    console.log("Executing flow...");
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate execution
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    try {
      // TODO: Implement deployment
      console.log("Deploying agent...");
      await new Promise((resolve) => setTimeout(resolve, 3000)); // Simulate deployment
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="bg-gray-900/95 backdrop-blur-xl border-b border-white/10 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-white"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>

              <div>
                <h1 className="text-2xl font-bold text-white">
                  Create New Agent
                </h1>
                <p className="text-gray-400 mt-1">
                  Build your AI agent with drag-and-drop simplicity
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="text-xs">
                Draft
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeploy}
                disabled={isDeploying}
                className="border-white/20 text-white hover:bg-white/10"
              >
                {isDeploying ? (
                  <>
                    <Zap className="h-4 w-4 mr-2 animate-pulse" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Deploy
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Agent Configuration */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-white flex items-center">
                  <Bot className="h-4 w-4 mr-2 text-cyan-400" />
                  Agent Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Name
                  </label>
                  <Input
                    placeholder="e.g., Customer Support Bot"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    variant="ai"
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Description
                  </label>
                  <Input
                    placeholder="What does this agent do?"
                    value={agentDescription}
                    onChange={(e) => setAgentDescription(e.target.value)}
                    variant="ai"
                    className="text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-white flex items-center">
                  <Settings className="h-4 w-4 mr-2 text-blue-400" />
                  Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    Auto-retry failed executions
                  </span>
                  <input type="checkbox" className="rounded" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Enable logging</span>
                  <input type="checkbox" className="rounded" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    Timeout (seconds)
                  </span>
                  <Input
                    type="number"
                    defaultValue="300"
                    className="w-16 h-6 text-xs"
                    variant="ai"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-white flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                  Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Nodes</span>
                  <Badge variant="outline" className="text-xs">
                    0
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Connections</span>
                  <Badge variant="outline" className="text-xs">
                    0
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Last saved</span>
                  <span className="text-xs text-gray-500">Never</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Flow Editor */}
        <div className="flex-1">
          <FlowEditor
            agentId="new"
            onSave={handleSaveFlow}
            onExecute={handleExecuteFlow}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
