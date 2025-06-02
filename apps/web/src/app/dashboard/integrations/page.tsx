"use client";

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { DashboardLayout } from '../../../components/dashboard/dashboard-layout';
import { IntegrationCard, Integration } from '../../../components/integrations/IntegrationCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/card';
import { Button } from '@repo/ui/button';
import { Badge } from '@repo/ui/badge';
import { Input } from '@repo/ui/input';
import { Spinner } from '@repo/ui/spinner';
import {
  Search,
  Filter,
  Plus,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  Brain,
  Mail,
  MessageSquare,
  FileText,
  Database,
  Webhook
} from 'lucide-react';
import {
  useIntegrations,
  useConnectIntegration,
  useDisconnectIntegration,
  useTestIntegration
} from '../../../lib/react-query';
import { useErrorHandler } from '../../../lib/error-handler';

export default function IntegrationsPage() {
  const { handleError } = useErrorHandler();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Fetch real data
  const { data: integrations, isLoading } = useIntegrations();
  const { mutate: connectIntegration, isPending: isConnecting } = useConnectIntegration();
  const { mutate: disconnectIntegration, isPending: isDisconnecting } = useDisconnectIntegration();
  const { mutate: testIntegration, isPending: isTesting } = useTestIntegration();

  const filteredIntegrations = integrations?.filter(integration => {
    const matchesSearch = integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         integration.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || integration.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' ||
      (categoryFilter === 'llm' && ['deepseek', 'gemini', 'openai'].includes(integration.type)) ||
      (categoryFilter === 'communication' && ['gmail', 'slack'].includes(integration.type)) ||
      (categoryFilter === 'productivity' && ['notion'].includes(integration.type)) ||
      (categoryFilter === 'data' && ['pinecone'].includes(integration.type));

    return matchesSearch && matchesStatus && matchesCategory;
  }) || [];

  const connectedCount = integrations?.filter(i => i.status === 'connected').length || 0;
  const errorCount = integrations?.filter(i => i.status === 'error').length || 0;
  const totalUsage = integrations?.reduce((sum, i) => sum + (i.usageCount || 0), 0) || 0;

  const handleConnect = async (integrationId: string) => {
    try {
      // For OAuth integrations, redirect to OAuth flow
      const integration = integrations?.find(i => i.id === integrationId);
      if (integration?.requiresOAuth) {
        // TODO: Get OAuth URL and redirect
        toast.info('Redirecting to OAuth flow...');
        return;
      }

      // For API key integrations, show configuration modal
      // TODO: Open configuration modal
      toast.info('Opening configuration...');
    } catch (error) {
      const appError = handleError(error, { context: 'connect-integration' });
      toast.error(appError.message);
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    if (!confirm('Are you sure you want to disconnect this integration?')) return;

    try {
      disconnectIntegration(integrationId);
      toast.success('Integration disconnected');
    } catch (error) {
      const appError = handleError(error, { context: 'disconnect-integration' });
      toast.error(appError.message);
    }
  };

  const handleConfigure = async (integrationId: string) => {
    // TODO: Open configuration modal
    toast.info('Configuration modal coming soon...');
  };

  const handleTest = async (integrationId: string) => {
    try {
      testIntegration(integrationId);
      toast.success('Integration test completed');
    } catch (error) {
      const appError = handleError(error, { context: 'test-integration' });
      toast.error(appError.message);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Integrations</h1>
            <p className="text-gray-400 mt-1">
              Connect and manage external services for your AI agents
            </p>
          </div>
          <Button variant="ai" className="group">
            <Plus className="h-4 w-4 mr-2" />
            Add Integration
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Connected</p>
                  {isLoading ? (
                    <Spinner className="h-6 w-6 mt-2" />
                  ) : (
                    <p className="text-2xl font-bold text-green-400">{connectedCount}</p>
                  )}
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
                  {isLoading ? (
                    <Spinner className="h-6 w-6 mt-2" />
                  ) : (
                    <p className="text-2xl font-bold text-red-400">{errorCount}</p>
                  )}
                </div>
                <AlertCircle className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Usage</p>
                  {isLoading ? (
                    <Spinner className="h-6 w-6 mt-2" />
                  ) : (
                    <p className="text-2xl font-bold text-blue-400">{totalUsage.toLocaleString()}</p>
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
                  <p className="text-sm text-gray-400">Available</p>
                  {isLoading ? (
                    <Spinner className="h-6 w-6 mt-2" />
                  ) : (
                    <p className="text-2xl font-bold text-purple-400">{integrations?.length || 0}</p>
                  )}
                </div>
                <Database className="h-8 w-8 text-purple-400" />
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
                    placeholder="Search integrations..."
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
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="all">All Categories</option>
                  <option value="llm">LLM Providers</option>
                  <option value="communication">Communication</option>
                  <option value="productivity">Productivity</option>
                  <option value="data">Data & Storage</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="connected">Connected</option>
                  <option value="disconnected">Disconnected</option>
                  <option value="error">Error</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Integration Categories */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="h-8 w-8" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* LLM Providers */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Brain className="h-5 w-5 text-cyan-400" />
                <h2 className="text-xl font-semibold text-white">LLM Providers</h2>
                <Badge variant="outline" className="text-xs">
                  {filteredIntegrations.filter(i => ['deepseek', 'gemini', 'openai'].includes(i.type)).length}
                </Badge>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredIntegrations
                  .filter(i => ['deepseek', 'gemini', 'openai'].includes(i.type))
                  .map(integration => (
                    <IntegrationCard
                      key={integration.id}
                      integration={integration}
                      onConnect={handleConnect}
                      onDisconnect={handleDisconnect}
                      onConfigure={handleConfigure}
                      onTest={handleTest}
                    />
                  ))}
              </div>
            </div>

          {/* Communication */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <MessageSquare className="h-5 w-5 text-green-400" />
              <h2 className="text-xl font-semibold text-white">Communication</h2>
              <Badge variant="outline" className="text-xs">
                {filteredIntegrations.filter(i => ['gmail', 'slack'].includes(i.type)).length}
              </Badge>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredIntegrations
                .filter(i => ['gmail', 'slack'].includes(i.type))
                .map(integration => (
                  <IntegrationCard
                    key={integration.id}
                    integration={integration}
                    onConnect={handleConnect}
                    onDisconnect={handleDisconnect}
                    onConfigure={handleConfigure}
                    onTest={handleTest}
                  />
                ))}
            </div>
          </div>

          {/* Data & Storage */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Database className="h-5 w-5 text-purple-400" />
              <h2 className="text-xl font-semibold text-white">Data & Storage</h2>
              <Badge variant="outline" className="text-xs">
                {filteredIntegrations.filter(i => ['pinecone', 'notion'].includes(i.type)).length}
              </Badge>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredIntegrations
                .filter(i => ['pinecone', 'notion'].includes(i.type))
                .map(integration => (
                  <IntegrationCard
                    key={integration.id}
                    integration={integration}
                    onConnect={handleConnect}
                    onDisconnect={handleDisconnect}
                    onConfigure={handleConfigure}
                    onTest={handleTest}
                  />
                ))}
            </div>
          </div>
        )}

        {!isLoading && filteredIntegrations.length === 0 && (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-12 text-center">
              <Webhook className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No integrations found</h3>
              <p className="text-gray-400 mb-4">
                Try adjusting your search or filters
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
