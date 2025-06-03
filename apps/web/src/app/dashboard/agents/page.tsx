"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { DashboardLayout } from "../../../components/dashboard/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import { Button } from "@repo/ui/button";
import { Badge } from "@repo/ui/badge";
import { Input } from "@repo/ui/input";
import { Spinner } from "@repo/ui/spinner";
import { AIBrainIcon, RobotIcon } from "@repo/ui/icons";
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Play,
  Pause,
  Edit,
  Trash2,
  Copy,
  Calendar,
  Activity,
  Zap,
} from "lucide-react";
import {
  useAgents,
  useDeleteAgent,
  useExecuteAgent,
  useUpdateAgent,
} from "../../../lib/react-query";
import { useErrorHandler } from "../../../lib/error-handler";
import {
  LoadingGrid,
  LoadingButton,
} from "../../../components/loading/LoadingOverlay";
import { useApiCall } from "../../../lib/loading-hooks";

export default function AgentsPage() {
  const { handleError } = useErrorHandler();
  const { call: executeCall, isLoading: isExecuting } =
    useApiCall("execute-agent");
  const { call: deleteCall, isLoading: isDeleting } =
    useApiCall("delete-agent");
  const { call: updateCall, isLoading: isUpdating } =
    useApiCall("update-agent");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch real data
  const { data: agents, isLoading, error } = useAgents();
  const { mutate: deleteAgent } = useDeleteAgent();
  const { mutate: executeAgent } = useExecuteAgent();
  const { mutate: updateAgent } = useUpdateAgent();

  const filteredAgents =
    agents?.filter((agent) => {
      const matchesSearch =
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || agent.status === statusFilter;
      return matchesSearch && matchesStatus;
    }) || [];

  const handleExecuteAgent = async (agentId: string) => {
    await executeCall(() => executeAgent({ id: agentId }), {
      loadingText: "Starting agent execution...",
      successMessage: "Agent execution started",
    });
  };

  const handleToggleAgent = async (agentId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    await updateCall(
      () => updateAgent({ id: agentId, data: { status: newStatus } }),
      {
        loadingText: `${newStatus === "active" ? "Activating" : "Pausing"} agent...`,
        successMessage: `Agent ${newStatus === "active" ? "activated" : "paused"}`,
      },
    );
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm("Are you sure you want to delete this agent?")) return;

    await deleteCall(() => deleteAgent(agentId), {
      loadingText: "Deleting agent...",
      successMessage: "Agent deleted successfully",
      showOverlay: true,
    });
  };

  const handleCopyAgent = async (agentId: string) => {
    // TODO: Implement agent duplication
    toast.success("Agent copied to clipboard");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="success">Active</Badge>;
      case "paused":
        return <Badge variant="warning">Paused</Badge>;
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">AI Agents</h1>
            <p className="text-gray-400 mt-1">
              Manage and monitor your AI agents
            </p>
          </div>
          <Link href="/dashboard/agents/new">
            <Button variant="ai" className="group">
              <Plus className="h-4 w-4 mr-2" />
              Create Agent
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Agents</p>
                  {isLoading ? (
                    <Spinner className="h-6 w-6 mt-2" />
                  ) : (
                    <p className="text-2xl font-bold text-white">
                      {agents?.length || 0}
                    </p>
                  )}
                </div>
                <RobotIcon className="h-8 w-8 text-cyan-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Active</p>
                  {isLoading ? (
                    <Spinner className="h-6 w-6 mt-2" />
                  ) : (
                    <p className="text-2xl font-bold text-green-400">
                      {agents?.filter((a) => a.status === "active").length || 0}
                    </p>
                  )}
                </div>
                <Activity className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Draft</p>
                  {isLoading ? (
                    <Spinner className="h-6 w-6 mt-2" />
                  ) : (
                    <p className="text-2xl font-bold text-blue-400">
                      {agents?.filter((a) => a.status === "draft").length || 0}
                    </p>
                  )}
                </div>
                <Zap className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Paused</p>
                  {isLoading ? (
                    <Spinner className="h-6 w-6 mt-2" />
                  ) : (
                    <p className="text-2xl font-bold text-purple-400">
                      {agents?.filter((a) => a.status === "paused").length || 0}
                    </p>
                  )}
                </div>
                <Calendar className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search agents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10"
                    variant="ai"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agents Grid */}
        {isLoading ? (
          <LoadingGrid count={6} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredAgents.map((agent) => (
              <Card
                key={agent.id}
                className="bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                        <AIBrainIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-white text-lg">
                          {agent.name}
                        </CardTitle>
                        {getStatusBadge(agent.status)}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-gray-400 hover:text-white"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardDescription className="text-gray-300 mt-2">
                    {agent.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-400">Created</p>
                      <p className="text-sm font-semibold text-white">
                        {agent.createdAt
                          ? new Date(agent.createdAt).toLocaleDateString()
                          : "Recently"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Updated</p>
                      <p className="text-sm font-semibold text-gray-300">
                        {agent.updatedAt
                          ? new Date(agent.updatedAt).toLocaleDateString()
                          : "Recently"}
                      </p>
                    </div>
                  </div>

                  {/* Flow Info */}
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Flow</p>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {agent.flow?.nodes?.length || 0} nodes
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {agent.flow?.edges?.length || 0} connections
                      </Badge>
                    </div>
                  </div>

                  {/* Description */}
                  {agent.description && (
                    <div className="text-xs text-gray-400">
                      {agent.description}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-green-400"
                        onClick={() => handleExecuteAgent(agent.id)}
                        disabled={isExecuting}
                        title="Execute Agent"
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-yellow-400"
                        onClick={() =>
                          handleToggleAgent(agent.id, agent.status)
                        }
                        disabled={isUpdating}
                        title={
                          agent.status === "active"
                            ? "Pause Agent"
                            : "Activate Agent"
                        }
                      >
                        {agent.status === "active" ? (
                          <Pause className="h-3 w-3" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                      </Button>
                      <Link href={`/dashboard/agents/${agent.id}/edit`}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-blue-400"
                          title="Edit Agent"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-cyan-400"
                        onClick={() => handleCopyAgent(agent.id)}
                        title="Copy Agent"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-400 hover:text-red-400"
                      onClick={() => handleDeleteAgent(agent.id)}
                      disabled={isDeleting}
                      title="Delete Agent"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && filteredAgents.length === 0 && (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-12 text-center">
              <RobotIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                No agents found
              </h3>
              <p className="text-gray-400 mb-4">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Create your first AI agent to get started"}
              </p>
              {!searchQuery && statusFilter === "all" && (
                <Link href="/dashboard/agents/new">
                  <Button variant="ai">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Agent
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
