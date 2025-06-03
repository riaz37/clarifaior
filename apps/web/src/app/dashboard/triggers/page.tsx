"use client";

import { useState } from "react";
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
import {
  Plus,
  Search,
  Filter,
  Copy,
  ExternalLink,
  Trash2,
  Edit,
  Webhook,
  Clock,
  Mail,
  MessageSquare,
  Hand,
  MoreVertical,
  Activity,
  AlertCircle,
  CheckCircle,
  Pause,
  Play,
} from "lucide-react";

interface Trigger {
  id: string;
  name: string;
  type: "webhook" | "schedule" | "gmail" | "slack" | "manual";
  agentId: string;
  agentName: string;
  status: "active" | "paused" | "error";
  url?: string;
  schedule?: string;
  timezone?: string;
  lastTriggered?: string;
  triggerCount: number;
  config?: Record<string, any>;
  error?: string;
}

// Mock data
const mockTriggers: Trigger[] = [
  {
    id: "webhook-1",
    name: "Customer Support Webhook",
    type: "webhook",
    agentId: "agent-1",
    agentName: "Customer Support Bot",
    status: "active",
    url: "https://api.clarifaior.com/webhook/abc123",
    lastTriggered: "2024-01-15T10:30:00Z",
    triggerCount: 247,
  },
  {
    id: "schedule-1",
    name: "Daily Report Generator",
    type: "schedule",
    agentId: "agent-2",
    agentName: "Report Bot",
    status: "active",
    schedule: "0 9 * * *",
    timezone: "America/New_York",
    lastTriggered: "2024-01-15T09:00:00Z",
    triggerCount: 45,
  },
  {
    id: "gmail-1",
    name: "Support Email Monitor",
    type: "gmail",
    agentId: "agent-1",
    agentName: "Customer Support Bot",
    status: "active",
    lastTriggered: "2024-01-15T11:15:00Z",
    triggerCount: 156,
    config: { query: "is:unread label:support" },
  },
  {
    id: "slack-1",
    name: "Team Channel Monitor",
    type: "slack",
    agentId: "agent-3",
    agentName: "Slack Bot",
    status: "error",
    error: "Channel not found",
    lastTriggered: "2024-01-14T16:20:00Z",
    triggerCount: 89,
    config: { channel: "#support" },
  },
];

const triggerIcons = {
  webhook: Webhook,
  schedule: Clock,
  gmail: Mail,
  slack: MessageSquare,
  manual: Hand,
};

const triggerColors = {
  webhook: "from-blue-500 to-cyan-500",
  schedule: "from-purple-500 to-pink-500",
  gmail: "from-red-500 to-orange-500",
  slack: "from-green-500 to-teal-500",
  manual: "from-gray-500 to-gray-600",
};

export default function TriggersPage() {
  const [triggers, setTriggers] = useState<Trigger[]>(mockTriggers);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredTriggers = triggers.filter((trigger) => {
    const matchesSearch =
      trigger.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trigger.agentName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || trigger.type === typeFilter;
    const matchesStatus =
      statusFilter === "all" || trigger.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const activeCount = triggers.filter((t) => t.status === "active").length;
  const errorCount = triggers.filter((t) => t.status === "error").length;
  const totalTriggers = triggers.reduce((sum, t) => sum + t.triggerCount, 0);

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    // TODO: Show toast notification
  };

  const handleToggleStatus = (triggerId: string) => {
    setTriggers((prev) =>
      prev.map((trigger) =>
        trigger.id === triggerId
          ? {
              ...trigger,
              status: trigger.status === "active" ? "paused" : "active",
            }
          : trigger,
      ),
    );
  };

  const handleDelete = (triggerId: string) => {
    setTriggers((prev) => prev.filter((trigger) => trigger.id !== triggerId));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="success">Active</Badge>;
      case "paused":
        return <Badge variant="warning">Paused</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
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
            <h1 className="text-3xl font-bold text-white">Triggers</h1>
            <p className="text-gray-400 mt-1">
              Manage webhooks, schedules, and automation triggers
            </p>
          </div>
          <Button variant="ai" className="group">
            <Plus className="h-4 w-4 mr-2" />
            Create Trigger
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Triggers</p>
                  <p className="text-2xl font-bold text-white">
                    {triggers.length}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Active</p>
                  <p className="text-2xl font-bold text-green-400">
                    {activeCount}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Errors</p>
                  <p className="text-2xl font-bold text-red-400">
                    {errorCount}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Executions</p>
                  <p className="text-2xl font-bold text-purple-400">
                    {totalTriggers.toLocaleString()}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-purple-400" />
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
                    placeholder="Search triggers..."
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
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="webhook">Webhooks</option>
                  <option value="schedule">Schedules</option>
                  <option value="gmail">Gmail</option>
                  <option value="slack">Slack</option>
                  <option value="manual">Manual</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="error">Error</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Triggers List */}
        <div className="space-y-4">
          {filteredTriggers.map((trigger) => {
            const IconComponent = triggerIcons[trigger.type];
            return (
              <Card
                key={trigger.id}
                className="bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-10 h-10 bg-gradient-to-r ${triggerColors[trigger.type]} rounded-lg flex items-center justify-center`}
                      >
                        <IconComponent className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-white text-lg">
                          {trigger.name}
                        </CardTitle>
                        <div className="flex items-center space-x-2 mt-1">
                          {getStatusBadge(trigger.status)}
                          <Badge
                            variant="outline"
                            className="text-xs capitalize"
                          >
                            {trigger.type}
                          </Badge>
                        </div>
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
                  <CardDescription className="text-gray-300">
                    Agent: {trigger.agentName}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Error Message */}
                  {trigger.error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="text-red-400 text-sm font-medium">
                            Error
                          </div>
                          <div className="text-red-300 text-xs mt-1">
                            {trigger.error}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Trigger Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-400">Trigger Count</p>
                      <p className="text-lg font-semibold text-white">
                        {trigger.triggerCount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Last Triggered</p>
                      <p className="text-sm text-gray-300">
                        {trigger.lastTriggered
                          ? new Date(trigger.lastTriggered).toLocaleString()
                          : "Never"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Configuration</p>
                      {trigger.type === "webhook" && trigger.url && (
                        <div className="flex items-center space-x-2">
                          <code className="text-xs text-cyan-400 bg-black/20 px-2 py-1 rounded">
                            {trigger.url.split("/").pop()}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-gray-400 hover:text-cyan-400"
                            onClick={() => handleCopyUrl(trigger.url!)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      {trigger.type === "schedule" && (
                        <div className="text-sm text-gray-300">
                          <code className="bg-black/20 px-2 py-1 rounded">
                            {trigger.schedule}
                          </code>
                          {trigger.timezone && (
                            <div className="text-xs text-gray-400 mt-1">
                              {trigger.timezone}
                            </div>
                          )}
                        </div>
                      )}
                      {trigger.config && (
                        <div className="text-sm text-gray-300">
                          {Object.entries(trigger.config).map(
                            ([key, value]) => (
                              <div key={key} className="text-xs">
                                <span className="text-gray-400">{key}:</span>{" "}
                                {String(value)}
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(trigger.id)}
                        className={
                          trigger.status === "active"
                            ? "text-yellow-400 hover:text-yellow-300"
                            : "text-green-400 hover:text-green-300"
                        }
                      >
                        {trigger.status === "active" ? (
                          <>
                            <Pause className="h-3 w-3 mr-2" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3 mr-2" />
                            Activate
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-white"
                      >
                        <Edit className="h-3 w-3 mr-2" />
                        Edit
                      </Button>
                      {trigger.url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-400 hover:text-blue-300"
                          onClick={() => window.open(trigger.url, "_blank")}
                        >
                          <ExternalLink className="h-3 w-3 mr-2" />
                          Test
                        </Button>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(trigger.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredTriggers.length === 0 && (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-12 text-center">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                No triggers found
              </h3>
              <p className="text-gray-400 mb-4">
                {searchQuery || typeFilter !== "all" || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Create your first trigger to automate agent execution"}
              </p>
              {!searchQuery &&
                typeFilter === "all" &&
                statusFilter === "all" && (
                  <Button variant="ai">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Trigger
                  </Button>
                )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
