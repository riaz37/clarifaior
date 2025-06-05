import { relations } from "drizzle-orm";
import { users } from "./user";
import { workspaces, workspace_members } from "./workspace";
import { workflows, workflow_versions } from "./workflow";
import { workflow_executions } from "./workflow-execution";
import { execution_steps } from "./execution-step";
import { agents } from "./agent";
import { integrations } from "./integration";
import { subscriptions, usage_tracking } from "./billing";
import { auditLogs } from "./audit-logs";
import { notifications } from "./notification";

// User Relations
export const users_relations = relations(users, ({ many }) => ({
  owned_workspaces: many(workspaces, { relationName: 'user_owned_workspaces' }),
  workspace_members: many(workspace_members, { relationName: 'user_workspace_members' }),
  created_workflows: many(workflows, { relationName: 'user_created_workflows' }),
  created_agents: many(agents, { relationName: 'user_created_agents' }),
  integrations: many(integrations, { relationName: 'user_integrations' }),
  notifications: many(notifications, { relationName: 'user_notifications' }),
  audit_logs: many(auditLogs, { relationName: 'user_audit_logs' }),
}));

// Workspace Relations
export const workspaces_relations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, {
    fields: [workspaces.owner_id],
    references: [users.id],
    relationName: 'workspace_owner',
  }),
  members: many(workspace_members, { relationName: 'workspace_members' }),
  workflows: many(workflows, { relationName: 'workspace_workflows' }),
  agents: many(agents, { relationName: 'workspace_agents' }),
  integrations: many(integrations, { relationName: 'workspace_integrations' }),
  executions: many(workflow_executions, { relationName: 'workspace_executions' }),
  subscription: one(subscriptions, {
    fields: [workspaces.id],
    references: [subscriptions.workspace_id],
    relationName: 'workspace_subscription',
  }),
  usage_tracking: many(usage_tracking, { 
    relationName: 'workspace_usage_tracking',
  }),
  audit_logs: many(auditLogs, { relationName: 'workspace_audit_logs' }),
}));

// Workspace Members Relations
export const workspace_members_relations = relations(
  workspace_members,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspace_members.workspace_id],
      references: [workspaces.id],
      relationName: 'workspace_member_workspace',
    }),
    user: one(users, {
      fields: [workspace_members.user_id],
      references: [users.id],
      relationName: 'workspace_member_user',
    }),
    invited_by_user: one(users, {
      fields: [workspace_members.invited_by],
      references: [users.id],
      relationName: 'workspace_member_invited_by',
    }),
  })
);

// Workflow Relations
export const workflows_relations = relations(workflows, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [workflows.workspace_id],
    references: [workspaces.id],
    relationName: 'workflow_workspace',
  }),
  created_by_user: one(users, {
    fields: [workflows.created_by],
    references: [users.id],
    relationName: 'workflow_created_by',
  }),
  versions: many(workflow_versions, { relationName: 'workflow_versions' }),
  executions: many(workflow_executions, { relationName: 'workflow_executions' }),
}));

// Workflow Versions Relations
export const workflow_versions_relations = relations(workflow_versions, ({ one }) => ({
  workflow: one(workflows, {
    fields: [workflow_versions.workflow_id],
    references: [workflows.id],
    relationName: 'workflow_version_workflow',
  }),
  created_by_user: one(users, {
    fields: [workflow_versions.created_by],
    references: [users.id],
    relationName: 'workflow_version_created_by',
  }),
}));

// Workflow Execution Relations
export const workflow_executions_relations = relations(workflow_executions, ({ one, many }) => ({
  workflow: one(workflows, {
    fields: [workflow_executions.workflow_id],
    references: [workflows.id],
    relationName: 'workflow_execution_workflow',
  }),
  workflow_version: one(workflow_versions, {
    fields: [workflow_executions.workflow_version_id],
    references: [workflow_versions.id],
    relationName: 'workflow_execution_workflow_version',
  }),
  workspace: one(workspaces, {
    fields: [workflow_executions.workspace_id],
    references: [workspaces.id],
    relationName: 'workflow_execution_workspace',
  }),
  triggered_by_user: one(users, {
    fields: [workflow_executions.triggered_by],
    references: [users.id],
    relationName: 'workflow_execution_triggered_by_user',
  }),
  steps: many(execution_steps, { relationName: 'workflow_execution_steps' }),
}));

// Execution Step Relations
export const execution_steps_relations = relations(execution_steps, ({ one }) => ({
  execution: one(workflow_executions, {
    fields: [execution_steps.execution_id],
    references: [workflow_executions.id],
    relationName: 'execution_step_execution',
  }),
  parent_step: one(execution_steps, {
    fields: [execution_steps.parent_step_id],
    references: [execution_steps.id],
    relationName: 'execution_step_parent',
  }),
  child_steps: one(execution_steps, {
    fields: [execution_steps.id],
    references: [execution_steps.parent_step_id],
    relationName: 'execution_step_child',
  }),
}));

// Agent Relations
export const agents_relations = relations(agents, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [agents.workspace_id],
    references: [workspaces.id],
    relationName: 'agent_workspace',
  }),
  creator: one(users, {
    fields: [agents.created_by],
    references: [users.id],
    relationName: 'agent_creator',
  }),
}));

// Integration Relations
export const integrations_relations = relations(integrations, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [integrations.workspace_id],
    references: [workspaces.id],
    relationName: 'integration_workspace',
  }),
  user: one(users, {
    fields: [integrations.user_id],
    references: [users.id],
    relationName: 'integration_user',
  }),
}));

// Subscription Relations
export const subscriptions_relations = relations(
  subscriptions,
  ({ one, many }) => ({
    workspace: one(workspaces, {
      fields: [subscriptions.workspace_id],
      references: [workspaces.id],
      relationName: 'subscription_workspace',
    }),
    usage_tracking: many(usage_tracking, { 
      relationName: 'subscription_usage_tracking',
    }),
  })
);

// Usage Tracking Relations
export const usage_tracking_relations = relations(usage_tracking, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [usage_tracking.workspace_id],
    references: [workspaces.id],
    relationName: 'usage_tracking_workspace',
  }),
  subscription: one(subscriptions, {
    fields: [usage_tracking.subscription_id],
    references: [subscriptions.id],
    relationName: 'usage_tracking_subscription',
  }),
}));

// Audit Logs Relations
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [auditLogs.workspace_id],
    references: [workspaces.id],
    relationName: 'audit_log_workspace',
  }),
  user: one(users, {
    fields: [auditLogs.user_id],
    references: [users.id],
    relationName: 'audit_log_user',
  }),
}));

// Notifications Relations
export const notifications_relations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.user_id],
    references: [users.id],
  }),
  workspace: one(workspaces, {
    fields: [notifications.workspace_id],
    references: [workspaces.id],
  }),
}));
