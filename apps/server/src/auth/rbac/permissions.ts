export enum Permission {
  // Workspace permissions
  WORKSPACE_READ = 'workspace:read',
  WORKSPACE_UPDATE = 'workspace:update',
  WORKSPACE_DELETE = 'workspace:delete',
  WORKSPACE_MANAGE_MEMBERS = 'workspace:manage_members',

  // Agent permissions
  AGENT_CREATE = 'agent:create',
  AGENT_READ = 'agent:read',
  AGENT_UPDATE = 'agent:update',
  AGENT_DELETE = 'agent:delete',
  AGENT_EXECUTE = 'agent:execute',
  AGENT_PUBLISH = 'agent:publish',

  // Integration permissions
  INTEGRATION_CREATE = 'integration:create',
  INTEGRATION_READ = 'integration:read',
  INTEGRATION_UPDATE = 'integration:update',
  INTEGRATION_DELETE = 'integration:delete',

  // Execution permissions
  EXECUTION_READ = 'execution:read',
  EXECUTION_CANCEL = 'execution:cancel',

  // Admin permissions
  ADMIN_FULL_ACCESS = 'admin:full_access',
}

export const ROLE_PERMISSIONS = {
  owner: [
    Permission.WORKSPACE_READ,
    Permission.WORKSPACE_UPDATE,
    Permission.WORKSPACE_DELETE,
    Permission.WORKSPACE_MANAGE_MEMBERS,
    Permission.AGENT_CREATE,
    Permission.AGENT_READ,
    Permission.AGENT_UPDATE,
    Permission.AGENT_DELETE,
    Permission.AGENT_EXECUTE,
    Permission.AGENT_PUBLISH,
    Permission.INTEGRATION_CREATE,
    Permission.INTEGRATION_READ,
    Permission.INTEGRATION_UPDATE,
    Permission.INTEGRATION_DELETE,
    Permission.EXECUTION_READ,
    Permission.EXECUTION_CANCEL,
    Permission.ADMIN_FULL_ACCESS,
  ],
  admin: [
    Permission.WORKSPACE_READ,
    Permission.WORKSPACE_UPDATE,
    Permission.WORKSPACE_MANAGE_MEMBERS,
    Permission.AGENT_CREATE,
    Permission.AGENT_READ,
    Permission.AGENT_UPDATE,
    Permission.AGENT_DELETE,
    Permission.AGENT_EXECUTE,
    Permission.AGENT_PUBLISH,
    Permission.INTEGRATION_CREATE,
    Permission.INTEGRATION_READ,
    Permission.INTEGRATION_UPDATE,
    Permission.INTEGRATION_DELETE,
    Permission.EXECUTION_READ,
    Permission.EXECUTION_CANCEL,
  ],
  editor: [
    Permission.WORKSPACE_READ,
    Permission.AGENT_CREATE,
    Permission.AGENT_READ,
    Permission.AGENT_UPDATE,
    Permission.AGENT_EXECUTE,
    Permission.INTEGRATION_READ,
    Permission.INTEGRATION_UPDATE,
    Permission.EXECUTION_READ,
  ],
  viewer: [
    Permission.WORKSPACE_READ,
    Permission.AGENT_READ,
    Permission.INTEGRATION_READ,
    Permission.EXECUTION_READ,
  ],
} as const;
