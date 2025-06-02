"use client";

import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../../components/dashboard/dashboard-layout';
import { ExecutionCard } from '../../../components/execution/ExecutionCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/card';
import { Button } from '@repo/ui/button';
import { Badge } from '@repo/ui/badge';
import { Input } from '@repo/ui/input';
import { ExecutionDetails, ExecutionMetrics } from '../../../components/execution/execution-types';
import { 
  Search, 
  Filter, 
  RefreshCw, 
  Play, 
  TrendingUp, 
  Clock, 
  DollarSign,
  Zap,
  Activity,
  AlertCircle
} from 'lucide-react';

// Mock data - replace with real API calls
const mockExecutions: ExecutionDetails[] = [
  {
    id: 1001,
    agentId: 1,
    agentName: 'Customer Support Bot',
    status: 'running',
    triggerType: 'gmail',
    triggerData: { from: 'customer@example.com', subject: 'Help needed' },
    startedAt: new Date(Date.now() - 120000).toISOString(),
    steps: [
      { id: '1', nodeId: 'trigger-1', nodeType: 'trigger_gmail', status: 'completed', startedAt: new Date().toISOString(), duration: 500, input: {}, output: {} },
      { id: '2', nodeId: 'llm-1', nodeType: 'prompt_llm', status: 'running', startedAt: new Date().toISOString(), input: {}, logs: [] },
    ],
    totalSteps: 3,
    completedSteps: 1,
    cost: 0.0023,
    tokensUsed: 1250,
  },
  {
    id: 1000,
    agentId: 2,
    agentName: 'Email Classifier',
    status: 'completed',
    triggerType: 'webhook',
    startedAt: new Date(Date.now() - 300000).toISOString(),
    completedAt: new Date(Date.now() - 295000).toISOString(),
    duration: 5000,
    steps: [
      { id: '1', nodeId: 'trigger-1', nodeType: 'trigger_webhook', status: 'completed', startedAt: new Date().toISOString(), duration: 200, input: {}, output: {} },
      { id: '2', nodeId: 'llm-1', nodeType: 'prompt_llm', status: 'completed', startedAt: new Date().toISOString(), duration: 3500, input: {}, output: {} },
      { id: '3', nodeId: 'action-1', nodeType: 'action_slack', status: 'completed', startedAt: new Date().toISOString(), duration: 1300, input: {}, output: {} },
    ],
    totalSteps: 3,
    completedSteps: 3,
    cost: 0.0045,
    tokensUsed: 2100,
  },
  {
    id: 999,
    agentId: 3,
    agentName: 'Data Processor',
    status: 'failed',
    triggerType: 'schedule',
    startedAt: new Date(Date.now() - 600000).toISOString(),
    completedAt: new Date(Date.now() - 590000).toISOString(),
    duration: 10000,
    error: 'API rate limit exceeded',
    steps: [
      { id: '1', nodeId: 'trigger-1', nodeType: 'trigger_schedule', status: 'completed', startedAt: new Date().toISOString(), duration: 100, input: {}, output: {} },
      { id: '2', nodeId: 'action-1', nodeType: 'action_notion', status: 'failed', startedAt: new Date().toISOString(), duration: 9900, error: 'Rate limit exceeded', input: {}, logs: [] },
    ],
    totalSteps: 2,
    completedSteps: 1,
    cost: 0.0001,
    tokensUsed: 50,
  },
];

const mockMetrics: ExecutionMetrics = {
  totalExecutions: 1247,
  successfulExecutions: 1228,
  failedExecutions: 19,
  averageDuration: 3500,
  totalCost: 12.45,
  totalTokens: 125000,
  successRate: 98.5,
};

export default function ExecutionsPage() {
  const [executions, setExecutions] = useState<ExecutionDetails[]>(mockExecutions);
  const [metrics, setMetrics] = useState<ExecutionMetrics>(mockMetrics);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredExecutions = executions.filter(execution => {
    const matchesSearch = execution.agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         execution.id.toString().includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || execution.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // TODO: Fetch latest executions from API
      await new Promise(resolve => setTimeout(resolve, 1000));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRetry = async (executionId: number) => {
    // TODO: Implement retry logic
    console.log('Retrying execution:', executionId);
  };

  const handleCancel = async (executionId: number) => {
    // TODO: Implement cancel logic
    console.log('Cancelling execution:', executionId);
  };

  const handleViewDetails = (executionId: number) => {
    // TODO: Navigate to execution details page
    console.log('Viewing execution details:', executionId);
  };

  // Auto-refresh running executions
  useEffect(() => {
    const interval = setInterval(() => {
      const hasRunning = executions.some(e => e.status === 'running');
      if (hasRunning) {
        // TODO: Fetch updates for running executions
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [executions]);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Executions</h1>
            <p className="text-gray-400 mt-1">
              Monitor and manage agent execution history
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="border-white/20 text-white hover:bg-white/10"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Executions</p>
                  <p className="text-2xl font-bold text-white">{metrics.totalExecutions.toLocaleString()}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Success Rate</p>
                  <p className="text-2xl font-bold text-green-400">{metrics.successRate}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Avg Duration</p>
                  <p className="text-2xl font-bold text-purple-400">{(metrics.averageDuration / 1000).toFixed(1)}s</p>
                </div>
                <Clock className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Cost</p>
                  <p className="text-2xl font-bold text-cyan-400">${metrics.totalCost.toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-cyan-400" />
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
                    placeholder="Search by agent name or execution ID..."
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
                  <option value="running">Running</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Running Executions */}
        {executions.some(e => e.status === 'running') && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <Play className="h-5 w-5 mr-2 text-blue-400" />
              Currently Running
              <Badge variant="running" className="ml-2">
                {executions.filter(e => e.status === 'running').length}
              </Badge>
            </h2>
            <div className="space-y-4">
              {executions
                .filter(e => e.status === 'running')
                .map(execution => (
                  <ExecutionCard
                    key={execution.id}
                    execution={execution}
                    onViewDetails={handleViewDetails}
                    onCancel={handleCancel}
                  />
                ))}
            </div>
          </div>
        )}

        {/* Recent Executions */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Recent Executions</h2>
          <div className="space-y-4">
            {filteredExecutions.map(execution => (
              <ExecutionCard
                key={execution.id}
                execution={execution}
                onViewDetails={handleViewDetails}
                onRetry={execution.status === 'failed' ? handleRetry : undefined}
                onCancel={execution.status === 'running' ? handleCancel : undefined}
              />
            ))}
          </div>

          {filteredExecutions.length === 0 && (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-12 text-center">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No executions found</h3>
                <p className="text-gray-400 mb-4">
                  {searchQuery || statusFilter !== 'all' 
                    ? 'Try adjusting your search or filters'
                    : 'No executions have been run yet'
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
