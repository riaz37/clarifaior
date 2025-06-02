"use client";

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { DashboardLayout } from '../../../components/dashboard/dashboard-layout';
import { ExecutionCard } from '../../../components/execution/ExecutionCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/card';
import { Button } from '@repo/ui/button';
import { Badge } from '@repo/ui/badge';
import { Input } from '@repo/ui/input';
import { Spinner } from '@repo/ui/spinner';
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
import {
  useExecutions,
  useExecutionMetrics,
  useCancelExecution,
  useRetryExecution
} from '../../../lib/react-query';
import { useErrorHandler } from '../../../lib/error-handler';

export default function ExecutionsPage() {
  const { handleError } = useErrorHandler();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch real data
  const {
    data: executionsData,
    isLoading: executionsLoading,
    refetch: refetchExecutions
  } = useExecutions({ limit: 50 });

  const {
    data: metrics,
    isLoading: metricsLoading
  } = useExecutionMetrics();

  const { mutate: cancelExecution, isPending: isCancelling } = useCancelExecution();
  const { mutate: retryExecution, isPending: isRetrying } = useRetryExecution();

  const executions = executionsData?.executions || [];
  const isLoading = executionsLoading || metricsLoading;

  const filteredExecutions = executions.filter(execution => {
    const matchesSearch = execution.agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         execution.id.toString().includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || execution.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleRefresh = async () => {
    try {
      await refetchExecutions();
      toast.success('Executions refreshed');
    } catch (error) {
      const appError = handleError(error, { context: 'refresh-executions' });
      toast.error(appError.message);
    }
  };

  const handleRetry = async (executionId: number) => {
    try {
      retryExecution(executionId.toString());
      toast.success('Execution retry started');
    } catch (error) {
      const appError = handleError(error, { context: 'retry-execution' });
      toast.error(appError.message);
    }
  };

  const handleCancel = async (executionId: number) => {
    try {
      cancelExecution(executionId.toString());
      toast.success('Execution cancelled');
    } catch (error) {
      const appError = handleError(error, { context: 'cancel-execution' });
      toast.error(appError.message);
    }
  };

  const handleViewDetails = (executionId: number) => {
    // TODO: Navigate to execution details page
    window.open(`/dashboard/executions/${executionId}`, '_blank');
  };

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
            disabled={isLoading}
            className="border-white/20 text-white hover:bg-white/10"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
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
                  {isLoading ? (
                    <Spinner className="h-6 w-6 mt-2" />
                  ) : (
                    <p className="text-2xl font-bold text-white">{metrics?.totalExecutions?.toLocaleString() || 0}</p>
                  )}
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
                  {isLoading ? (
                    <Spinner className="h-6 w-6 mt-2" />
                  ) : (
                    <p className="text-2xl font-bold text-green-400">{metrics?.successRate?.toFixed(1) || 0}%</p>
                  )}
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
                  {isLoading ? (
                    <Spinner className="h-6 w-6 mt-2" />
                  ) : (
                    <p className="text-2xl font-bold text-purple-400">
                      {metrics?.averageDuration ? (metrics.averageDuration / 1000).toFixed(1) : 0}s
                    </p>
                  )}
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
                  {isLoading ? (
                    <Spinner className="h-6 w-6 mt-2" />
                  ) : (
                    <p className="text-2xl font-bold text-cyan-400">${metrics?.totalCost?.toFixed(2) || '0.00'}</p>
                  )}
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
        {!isLoading && executions.some(e => e.status === 'running') && (
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

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : (
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
          )}

          {!isLoading && filteredExecutions.length === 0 && (
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
