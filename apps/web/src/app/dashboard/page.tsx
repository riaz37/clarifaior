"use client";

import { DashboardLayout } from "../../components/dashboard/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card";
import { Button } from "@repo/ui/button";
import { Badge } from "@repo/ui/badge";
import { AIBrainIcon, RobotIcon, FlowIcon, TriggerIcon } from "@repo/ui/icons";
import { 
  Plus, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Activity,
  Users,
  Zap
} from "lucide-react";

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-400 mt-1">
              Welcome back! Here's what's happening with your AI agents.
            </p>
          </div>
          <Button variant="ai" className="group">
            <Plus className="h-4 w-4 mr-2" />
            Create Agent
          </Button>
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
              <div className="text-2xl font-bold text-white">12</div>
              <p className="text-xs text-green-400 flex items-center mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                +2 from last week
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">
                Executions Today
              </CardTitle>
              <Activity className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">1,247</div>
              <p className="text-xs text-green-400 flex items-center mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                +12% from yesterday
              </p>
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
              <div className="text-2xl font-bold text-white">98.5%</div>
              <p className="text-xs text-green-400 flex items-center mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                +0.3% from last week
              </p>
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
              <div className="text-2xl font-bold text-white">8</div>
              <p className="text-xs text-gray-400 flex items-center mt-1">
                <Clock className="h-3 w-3 mr-1" />
                3 webhooks, 5 schedules
              </p>
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
              {[
                { name: "Customer Support Bot", status: "active", executions: 342, lastRun: "2 min ago" },
                { name: "Email Classifier", status: "active", executions: 156, lastRun: "5 min ago" },
                { name: "Slack Notifier", status: "paused", executions: 89, lastRun: "1 hour ago" },
                { name: "Data Processor", status: "active", executions: 234, lastRun: "10 min ago" },
              ].map((agent, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                      <AIBrainIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{agent.name}</p>
                      <p className="text-xs text-gray-400">{agent.executions} executions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={agent.status === "active" ? "success" : "warning"}>
                      {agent.status}
                    </Badge>
                    <p className="text-xs text-gray-400 mt-1">{agent.lastRun}</p>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                View All Agents
              </Button>
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
              {[
                { agent: "Customer Support Bot", status: "completed", duration: "2.3s", trigger: "Gmail" },
                { agent: "Email Classifier", status: "completed", duration: "1.8s", trigger: "Webhook" },
                { agent: "Slack Notifier", status: "failed", duration: "0.5s", trigger: "Schedule" },
                { agent: "Data Processor", status: "running", duration: "5.2s", trigger: "Manual" },
              ].map((execution, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                    <div>
                      <p className="text-sm font-medium text-white">{execution.agent}</p>
                      <p className="text-xs text-gray-400">Triggered by {execution.trigger}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={
                      execution.status === "completed" ? "completed" :
                      execution.status === "running" ? "running" : "failed"
                    }>
                      {execution.status}
                    </Badge>
                    <p className="text-xs text-gray-400 mt-1">{execution.duration}</p>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                View All Executions
              </Button>
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
              <Button variant="outline" className="h-20 flex-col border-white/20 text-white hover:bg-white/10">
                <Plus className="h-6 w-6 mb-2" />
                Create Agent
              </Button>
              <Button variant="outline" className="h-20 flex-col border-white/20 text-white hover:bg-white/10">
                <FlowIcon className="h-6 w-6 mb-2" />
                Build Flow
              </Button>
              <Button variant="outline" className="h-20 flex-col border-white/20 text-white hover:bg-white/10">
                <TriggerIcon className="h-6 w-6 mb-2" />
                Setup Trigger
              </Button>
              <Button variant="outline" className="h-20 flex-col border-white/20 text-white hover:bg-white/10">
                <Users className="h-6 w-6 mb-2" />
                Invite Team
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
