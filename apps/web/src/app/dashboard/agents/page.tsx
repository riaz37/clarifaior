"use client";

import { useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '../../../components/dashboard/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/card';
import { Button } from '@repo/ui/button';
import { Badge } from '@repo/ui/badge';
import { Input } from '@repo/ui/input';
import { AIBrainIcon, RobotIcon } from '@repo/ui/icons';
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
  Zap
} from 'lucide-react';

// Mock data - replace with real API calls
const mockAgents = [
  {
    id: 1,
    name: 'Customer Support Bot',
    description: 'Automatically responds to customer inquiries via email and Slack',
    status: 'active',
    lastRun: '2 minutes ago',
    executions: 1247,
    successRate: 98.5,
    triggers: ['Gmail', 'Slack'],
    createdAt: '2024-01-10',
  },
  {
    id: 2,
    name: 'Email Classifier',
    description: 'Categorizes incoming emails and routes them to appropriate teams',
    status: 'active',
    lastRun: '5 minutes ago',
    executions: 856,
    successRate: 99.2,
    triggers: ['Gmail'],
    createdAt: '2024-01-08',
  },
  {
    id: 3,
    name: 'Slack Notifier',
    description: 'Sends daily reports and notifications to team channels',
    status: 'paused',
    lastRun: '1 hour ago',
    executions: 234,
    successRate: 97.8,
    triggers: ['Schedule'],
    createdAt: '2024-01-05',
  },
  {
    id: 4,
    name: 'Data Processor',
    description: 'Processes and analyzes incoming data from various sources',
    status: 'draft',
    lastRun: 'Never',
    executions: 0,
    successRate: 0,
    triggers: ['Webhook'],
    createdAt: '2024-01-15',
  },
];

export default function AgentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredAgents = mockAgents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'paused':
        return <Badge variant="warning">Paused</Badge>;
      case 'draft':
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
                  <p className="text-2xl font-bold text-white">{mockAgents.length}</p>
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
                  <p className="text-2xl font-bold text-green-400">
                    {mockAgents.filter(a => a.status === 'active').length}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Executions</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {mockAgents.reduce((sum, agent) => sum + agent.executions, 0).toLocaleString()}
                  </p>
                </div>
                <Zap className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Avg Success Rate</p>
                  <p className="text-2xl font-bold text-purple-400">
                    {(mockAgents.reduce((sum, agent) => sum + agent.successRate, 0) / mockAgents.length).toFixed(1)}%
                  </p>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredAgents.map((agent) => (
            <Card key={agent.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                      <AIBrainIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-white text-lg">{agent.name}</CardTitle>
                      {getStatusBadge(agent.status)}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
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
                    <p className="text-xs text-gray-400">Executions</p>
                    <p className="text-lg font-semibold text-white">{agent.executions.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Success Rate</p>
                    <p className="text-lg font-semibold text-green-400">{agent.successRate}%</p>
                  </div>
                </div>

                {/* Triggers */}
                <div>
                  <p className="text-xs text-gray-400 mb-2">Triggers</p>
                  <div className="flex flex-wrap gap-1">
                    {agent.triggers.map((trigger) => (
                      <Badge key={trigger} variant="outline" className="text-xs">
                        {trigger}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Last Run */}
                <div className="text-xs text-gray-400">
                  Last run: {agent.lastRun}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-green-400">
                      <Play className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-yellow-400">
                      <Pause className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-blue-400">
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-cyan-400">
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-400">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredAgents.length === 0 && (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-12 text-center">
              <RobotIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No agents found</h3>
              <p className="text-gray-400 mb-4">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Create your first AI agent to get started'
                }
              </p>
              {!searchQuery && statusFilter === 'all' && (
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
