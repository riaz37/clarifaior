"use client";

import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { 
  AgentService, 
  ExecutionService, 
  IntegrationService, 
  TriggerService, 
  UserService 
} from './api-services';
import { ErrorHandler } from './error-handler';

// Create a client
const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on auth errors
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: false, // Don't retry mutations by default
      onError: (error: any) => {
        ErrorHandler.log(ErrorHandler.fromApiError(error));
      },
    },
  },
});

// Query client provider component
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}

// Query keys for consistent caching
export const queryKeys = {
  // Agents
  agents: ['agents'] as const,
  agent: (id: string) => ['agents', id] as const,
  agentStats: (id: string) => ['agents', id, 'stats'] as const,
  
  // Executions
  executions: ['executions'] as const,
  execution: (id: string) => ['executions', id] as const,
  executionLogs: (id: string) => ['executions', id, 'logs'] as const,
  executionMetrics: ['executions', 'metrics'] as const,
  
  // Integrations
  integrations: ['integrations'] as const,
  integration: (id: string) => ['integrations', id] as const,
  
  // Triggers
  triggers: ['triggers'] as const,
  trigger: (id: string) => ['triggers', id] as const,
  
  // User
  user: ['user'] as const,
  userProfile: ['user', 'profile'] as const,
  userWorkspaces: ['user', 'workspaces'] as const,
};

// Agent hooks
export const useAgents = (workspaceId?: string) => {
  return useQuery({
    queryKey: [...queryKeys.agents, workspaceId],
    queryFn: () => AgentService.getAgents(workspaceId),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useAgent = (id: string) => {
  return useQuery({
    queryKey: queryKeys.agent(id),
    queryFn: () => AgentService.getAgent(id),
    enabled: !!id,
  });
};

export const useAgentStats = (id: string) => {
  return useQuery({
    queryKey: queryKeys.agentStats(id),
    queryFn: () => AgentService.getAgentStats(id),
    enabled: !!id,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

export const useCreateAgent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: AgentService.createAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents });
    },
  });
};

export const useUpdateAgent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      AgentService.updateAgent(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agent(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.agents });
    },
  });
};

export const useDeleteAgent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: AgentService.deleteAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents });
    },
  });
};

export const useExecuteAgent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, triggerData }: { id: string; triggerData?: any }) => 
      AgentService.executeAgent(id, triggerData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.executions });
    },
  });
};

// Execution hooks
export const useExecutions = (params?: any) => {
  return useQuery({
    queryKey: [...queryKeys.executions, params],
    queryFn: () => ExecutionService.getExecutions(params),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: (data) => {
      // Auto-refresh if there are running executions
      const hasRunning = data?.executions?.some((e: any) => e.status === 'running');
      return hasRunning ? 5000 : false; // 5 seconds
    },
  });
};

export const useExecution = (id: string) => {
  return useQuery({
    queryKey: queryKeys.execution(id),
    queryFn: () => ExecutionService.getExecution(id),
    enabled: !!id,
    refetchInterval: (data) => {
      // Auto-refresh if execution is running
      return data?.status === 'running' ? 2000 : false; // 2 seconds
    },
  });
};

export const useExecutionLogs = (id: string) => {
  return useQuery({
    queryKey: queryKeys.executionLogs(id),
    queryFn: () => ExecutionService.getExecutionLogs(id),
    enabled: !!id,
  });
};

export const useExecutionMetrics = (params?: any) => {
  return useQuery({
    queryKey: [...queryKeys.executionMetrics, params],
    queryFn: () => ExecutionService.getExecutionMetrics(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCancelExecution = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ExecutionService.cancelExecution,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.execution(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.executions });
    },
  });
};

export const useRetryExecution = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ExecutionService.retryExecution,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.executions });
    },
  });
};

// Integration hooks
export const useIntegrations = () => {
  return useQuery({
    queryKey: queryKeys.integrations,
    queryFn: IntegrationService.getIntegrations,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useIntegration = (id: string) => {
  return useQuery({
    queryKey: queryKeys.integration(id),
    queryFn: () => IntegrationService.getIntegration(id),
    enabled: !!id,
  });
};

export const useConnectIntegration = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ type, config }: { type: string; config: any }) => 
      IntegrationService.connectIntegration(type, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.integrations });
    },
  });
};

export const useDisconnectIntegration = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: IntegrationService.disconnectIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.integrations });
    },
  });
};

export const useTestIntegration = () => {
  return useMutation({
    mutationFn: IntegrationService.testIntegration,
  });
};

// Trigger hooks
export const useTriggers = (agentId?: string) => {
  return useQuery({
    queryKey: [...queryKeys.triggers, agentId],
    queryFn: () => TriggerService.getTriggers(agentId),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useTrigger = (id: string) => {
  return useQuery({
    queryKey: queryKeys.trigger(id),
    queryFn: () => TriggerService.getTrigger(id),
    enabled: !!id,
  });
};

export const useCreateTrigger = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: TriggerService.createTrigger,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.triggers });
    },
  });
};

export const useUpdateTrigger = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      TriggerService.updateTrigger(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trigger(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.triggers });
    },
  });
};

export const useDeleteTrigger = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: TriggerService.deleteTrigger,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.triggers });
    },
  });
};

export const useToggleTrigger = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => 
      TriggerService.toggleTrigger(id, isActive),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trigger(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.triggers });
    },
  });
};

// User hooks
export const useUserProfile = () => {
  return useQuery({
    queryKey: queryKeys.userProfile,
    queryFn: UserService.getProfile,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useUserWorkspaces = () => {
  return useQuery({
    queryKey: queryKeys.userWorkspaces,
    queryFn: UserService.getWorkspaces,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: UserService.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userProfile });
    },
  });
};

export const useCreateWorkspace = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: UserService.createWorkspace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userWorkspaces });
    },
  });
};
