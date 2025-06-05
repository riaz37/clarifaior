// packages/database/src/schema/relations.ts
import { relations } from "drizzle-orm";
import {
  users,
  workspaces,
  workspaceMembers,
  workflows,
  workflowVersions,
  workflowExecutions,
  executionSteps,
  agents,
  integrations,
  subscriptions,
  usageTracking,
  auditLogs,
  notifications,
} from "../../index";

// User Relations
export const usersRelations = relations(users, ({ many }) => ({
  ownedWorkspaces: many(workspaces),
  workspaceMembers: many(workspaceMembers),
  createdWorkflows: many(workflows),
  createdAgents: many(agents),
  integrations: many(integrations),
  notifications: many(notifications),
  auditLogs: many(auditLogs),
}));

// Workspace Relations
export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, {
    fields: [workspaces.ownerId],
    references: [users.id],
  }),
  members: many(workspaceMembers),
  workflows: many(workflows),
  agents: many(agents),
  integrations: many(integrations),
  executions: many(workflowExecutions),
  subscription: one(subscriptions),
  usageTracking: many(usageTracking),
  auditLogs: many(auditLogs),
}));

// Workspace Members Relations
export const workspaceMembersRelations = relations(
  workspaceMembers,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceMembers.workspaceId],
      references: [workspaces.id],
    }),
    user: one(users, {
      fields: [workspaceMembers.userId],
      references: [users.id],
    }),
    invitedByUser: one(users, {
      fields: [workspaceMembers.invitedBy],
      references: [users.id],
    }),
  })
);

// Workflow Relations
export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [workflows.workspaceId],
    references: [workspaces.id],
  }),
  creator: one(users, {
    fields: [workflows.createdBy],
    references: [users.id],
  }),
  versions: many(workflowVersions),
  executions: many(workflowExecutions),
}));

// Workflow Versions Relations
export const workflowVersionsRelations = relations(
  workflowVersions,
  ({ one }) => ({
    workflow: one(workflows, {
      fields: [workflowVersions.workflowId],
      references: [workflows.id],
    }),
    creator: one(users, {
      fields: [workflowVersions.createdBy],
      references: [users.id],
    }),
  })
);

// Workflow Executions Relations
export const workflowExecutionsRelations = relations(
  workflowExecutions,
  ({ one, many }) => ({
    workflow: one(workflows, {
      fields: [workflowExecutions.workflowId],
      references: [workflows.id],
    }),
    workspace: one(workspaces, {
      fields: [workflowExecutions.workspaceId],
      references: [workspaces.id],
    }),
    triggeredByUser: one(users, {
      fields: [workflowExecutions.triggeredBy],
      references: [users.id],
    }),
    steps: many(executionSteps),
  })
);

// Execution Steps Relations
export const executionStepsRelations = relations(executionSteps, ({ one }) => ({
  execution: one(workflowExecutions, {
    fields: [executionSteps.executionId],
    references: [workflowExecutions.id],
  }),
}));

// Agent Relations
export const agentsRelations = relations(agents, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [agents.workspaceId],
    references: [workspaces.id],
  }),
  creator: one(users, {
    fields: [agents.createdBy],
    references: [users.id],
  }),
}));

// Integration Relations
export const integrationsRelations = relations(integrations, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [integrations.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [integrations.userId],
    references: [users.id],
  }),
}));

// Subscription Relations
export const subscriptionsRelations = relations(
  subscriptions,
  ({ one, many }) => ({
    workspace: one(workspaces, {
      fields: [subscriptions.workspaceId],
      references: [workspaces.id],
    }),
    usageTracking: many(usageTracking),
  })
);

// Usage Tracking Relations
export const usageTrackingRelations = relations(usageTracking, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [usageTracking.workspaceId],
    references: [workspaces.id],
  }),
  subscription: one(subscriptions, {
    fields: [usageTracking.workspaceId],
    references: [subscriptions.workspaceId],
  }),
}));

// Audit Logs Relations
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [auditLogs.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// Notifications Relations
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  workspace: one(workspaces, {
    fields: [notifications.workspaceId],
    references: [workspaces.id],
  }),
}));
