"use client";

import React from "react";
import { DashboardLayout } from "../../components/dashboard/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import { Button } from "@repo/ui/button";
import { Badge } from "@repo/ui/badge";
import { Spinner } from "@repo/ui/spinner";
import { AIBrainIcon, RobotIcon, FlowIcon, TriggerIcon } from "@repo/ui/icons";
import {
  Plus,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Activity,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import {
  useAgents,
  useExecutions,
  useExecutionMetrics,
  useTriggers,
} from "../../lib/react-query";
import { useAuth } from "../../lib/auth-guard";
import {
  LoadingGrid,
  LoadingCard,
  LoadingSkeleton,
} from "../../components/loading/LoadingOverlay";
import { usePageLoading } from "../../lib/loading-hooks";

export default function DashboardPage() {
  const { user } = useAuth();
  const { startPageLoad, stopPageLoad, isPageLoading } =
    usePageLoading("dashboard");

  // Fetch real data
  const { data: agents, isLoading: agentsLoading } = useAgents();
  const { data: executionsData, isLoading: executionsLoading } = useExecutions({
    limit: 4,
  });
  const { data: metrics, isLoading: metricsLoading } = useExecutionMetrics();
  const { data: triggers, isLoading: triggersLoading } = useTriggers();

  const isLoading =
    agentsLoading || executionsLoading || metricsLoading || triggersLoading;

  // Manage page loading state
  React.useEffect(() => {
    if (isLoading) {
      startPageLoad("Loading dashboard...");
    } else {
      stopPageLoad();
    }
  }, [isLoading, startPageLoad, stopPageLoad]);
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Welcome back{user?.name ? `, ${user.name}` : ""}!
            </h1>
            <p className="text-gray-400 mt-1">
              Here's what's happening with your AI agents.
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">
                Total Agents
              </CardTitle>
              <RobotIcon className="h-4 w-4 text-cyan-400" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Spinner className="h-6 w-6" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-white">
                    {agents?.length || 0}
                  </div>
                  <p className="text-xs text-gray-400 flex items-center mt-1">
                    <Activity className="h-3 w-3 mr-1" />
                    {agents?.filter((a) => a.status === "active").length ||
                      0}{" "}
                    active
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">
                Total Executions
              </CardTitle>
              <Activity className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Spinner className="h-6 w-6" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-white">
                    {metrics?.totalExecutions?.toLocaleString() || 0}
                  </div>
                  <p className="text-xs text-gray-400 flex items-center mt-1">
                    <Activity className="h-3 w-3 mr-1" />
                    {executionsData?.executions?.filter(
                      (e) => e.status === "running",
                    ).length || 0}{" "}
                    running
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">
                Success Rate
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Spinner className="h-6 w-6" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-white">
                    {metrics?.successRate?.toFixed(1) || 0}%
                  </div>
                  <p className="text-xs text-green-400 flex items-center mt-1">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {metrics?.successfulExecutions || 0} successful
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">
                Active Triggers
              </CardTitle>
              <Zap className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Spinner className="h-6 w-6" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-white">
                    {triggers?.filter((t) => t.isActive).length || 0}
                  </div>
                  <p className="text-xs text-gray-400 flex items-center mt-1">
                    <Clock className="h-3 w-3 mr-1" />
                    {triggers?.length || 0} total triggers
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Agents */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <RobotIcon className="h-5 w-5 mr-2 text-cyan-400" />
                Recent Agents
              </CardTitle>
              <CardDescription className="text-gray-400">
                Your latest AI agents and their status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <LoadingSkeleton lines={4} showAvatar />
              ) : agents && agents.length > 0 ? (
                <>
                  {agents.slice(0, 4).map((agent) => (
                    <div
                      key={agent.id}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                          <AIBrainIcon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {agent.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {agent.description}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={
                            agent.status === "active"
                              ? "success"
                              : agent.status === "paused"
                                ? "warning"
                                : "secondary"
                          }
                        >
                          {agent.status}
                        </Badge>
                        <p className="text-xs text-gray-400 mt-1">
                          {agent.updatedAt
                            ? new Date(agent.updatedAt).toLocaleDateString()
                            : "Recently"}
                        </p>
                      </div>
                    </div>
                  ))}
                  <Link href="/dashboard/agents">
                    <Button
                      variant="outline"
                      className="w-full border-white/20 text-white hover:bg-white/10"
                    >
                      View All Agents
                    </Button>
                  </Link>
                </>
              ) : (
                <div className="text-center py-8">
                  <RobotIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">No agents created yet</p>
                  <Link href="/dashboard/agents/new">
                    <Button variant="ai" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Agent
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Executions */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Activity className="h-5 w-5 mr-2 text-blue-400" />
                Recent Executions
              </CardTitle>
              <CardDescription className="text-gray-400">
                Latest agent execution results
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <LoadingSkeleton lines={4} showAvatar />
              ) : executionsData?.executions &&
                executionsData.executions.length > 0 ? (
                <>
                  {executionsData.executions.slice(0, 4).map((execution) => (
                    <div
                      key={execution.id}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            execution.status === "completed"
                              ? "bg-green-400"
                              : execution.status === "running"
                                ? "bg-blue-400 animate-pulse"
                                : execution.status === "failed"
                                  ? "bg-red-400"
                                  : "bg-gray-400"
                          }`}
                        ></div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {execution.agentName}
                          </p>
                          <p className="text-xs text-gray-400">
                            Triggered by {execution.triggerType}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={
                            execution.status === "completed"
                              ? "completed"
                              : execution.status === "running"
                                ? "running"
                                : execution.status === "failed"
                                  ? "failed"
                                  : "pending"
                          }
                        >
                          {execution.status}
                        </Badge>
                        <p className="text-xs text-gray-400 mt-1">
                          {execution.duration
                            ? `${(execution.duration / 1000).toFixed(1)}s`
                            : "Running..."}
                        </p>
                      </div>
                    </div>
                  ))}
                  <Link href="/dashboard/executions">
                    <Button
                      variant="outline"
                      className="w-full border-white/20 text-white hover:bg-white/10"
                    >
                      View All Executions
                    </Button>
                  </Link>
                </>
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">No executions yet</p>
                  <p className="text-xs text-gray-500">
                    Create an agent to see executions here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
            <CardDescription className="text-gray-400">
              Get started with these common tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/dashboard/agents/new">
                <Button
                  variant="outline"
                  className="h-20 flex-col border-white/20 text-white hover:bg-white/10 w-full"
                >
                  <Plus className="h-6 w-6 mb-2" />
                  Create Agent
                </Button>
              </Link>
              <Link href="/dashboard/agents/new">
                <Button
                  variant="outline"
                  className="h-20 flex-col border-white/20 text-white hover:bg-white/10 w-full"
                >
                  <FlowIcon className="h-6 w-6 mb-2" />
                  Build Flow
                </Button>
              </Link>
              <Link href="/dashboard/triggers">
                <Button
                  variant="outline"
                  className="h-20 flex-col border-white/20 text-white hover:bg-white/10 w-full"
                >
                  <TriggerIcon className="h-6 w-6 mb-2" />
                  Setup Trigger
                </Button>
              </Link>
              <Link href="/dashboard/team">
                <Button
                  variant="outline"
                  className="h-20 flex-col border-white/20 text-white hover:bg-white/10 w-full"
                >
                  <Users className="h-6 w-6 mb-2" />
                  Invite Team
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
