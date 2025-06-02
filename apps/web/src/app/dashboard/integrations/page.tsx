"use client";

import { useState } from 'react';
import { DashboardLayout } from '../../../components/dashboard/dashboard-layout';
import { IntegrationCard, Integration } from '../../../components/integrations/IntegrationCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/card';
import { Button } from '@repo/ui/button';
import { Badge } from '@repo/ui/badge';
import { Input } from '@repo/ui/input';
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

// Mock data - replace with real API calls
const mockIntegrations: Integration[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'Primary LLM provider for AI-powered text generation and reasoning',
    type: 'deepseek',
    status: 'connected',
    isConfigured: true,
    lastUsed: '2024-01-15T10:30:00Z',
    usageCount: 1247,
    requiresOAuth: false,
    hasApiKey: true,
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Fallback LLM provider with advanced multimodal capabilities',
    type: 'gemini',
    status: 'connected',
    isConfigured: true,
    lastUsed: '2024-01-14T15:20:00Z',
    usageCount: 156,
    requiresOAuth: false,
    hasApiKey: true,
  },
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Email automation and real-time email triggers',
    type: 'gmail',
    status: 'connected',
    isConfigured: true,
    lastUsed: '2024-01-15T09:45:00Z',
    usageCount: 892,
    requiresOAuth: true,
    hasApiKey: false,
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Team communication and automated messaging',
    type: 'slack',
    status: 'connected',
    isConfigured: true,
    lastUsed: '2024-01-15T11:15:00Z',
    usageCount: 445,
    requiresOAuth: true,
    hasApiKey: false,
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Knowledge management and automated page creation',
    type: 'notion',
    status: 'error',
    isConfigured: true,
    error: 'API token expired. Please reconnect.',
    lastUsed: '2024-01-12T14:30:00Z',
    usageCount: 234,
    requiresOAuth: false,
    hasApiKey: true,
  },
  {
    id: 'pinecone',
    name: 'Pinecone',
    description: 'Vector database for semantic memory and search',
    type: 'pinecone',
    status: 'connected',
    isConfigured: true,
    lastUsed: '2024-01-15T08:20:00Z',
    usageCount: 1567,
    requiresOAuth: false,
    hasApiKey: true,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Alternative LLM provider and embeddings generation',
    type: 'openai',
    status: 'disconnected',
    isConfigured: false,
    requiresOAuth: false,
    hasApiKey: false,
  },
];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>(mockIntegrations);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filteredIntegrations = integrations.filter(integration => {
    const matchesSearch = integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         integration.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || integration.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || 
      (categoryFilter === 'llm' && ['deepseek', 'gemini', 'openai'].includes(integration.type)) ||
      (categoryFilter === 'communication' && ['gmail', 'slack'].includes(integration.type)) ||
      (categoryFilter === 'productivity' && ['notion'].includes(integration.type)) ||
      (categoryFilter === 'data' && ['pinecone'].includes(integration.type));
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const connectedCount = integrations.filter(i => i.status === 'connected').length;
  const errorCount = integrations.filter(i => i.status === 'error').length;
  const totalUsage = integrations.reduce((sum, i) => sum + (i.usageCount || 0), 0);

  const handleConnect = async (integrationId: string) => {
    console.log('Connecting integration:', integrationId);
    // TODO: Implement OAuth flow or API key setup
  };

  const handleDisconnect = async (integrationId: string) => {
    console.log('Disconnecting integration:', integrationId);
    // TODO: Implement disconnect logic
  };

  const handleConfigure = async (integrationId: string) => {
    console.log('Configuring integration:', integrationId);
    // TODO: Open configuration modal
  };

  const handleTest = async (integrationId: string) => {
    console.log('Testing integration:', integrationId);
    // TODO: Test integration connection
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
                  <p className="text-2xl font-bold text-green-400">{connectedCount}</p>
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
                  <p className="text-2xl font-bold text-red-400">{errorCount}</p>
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
                  <p className="text-2xl font-bold text-blue-400">{totalUsage.toLocaleString()}</p>
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
                  <p className="text-2xl font-bold text-purple-400">{integrations.length}</p>
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
        </div>

        {filteredIntegrations.length === 0 && (
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
