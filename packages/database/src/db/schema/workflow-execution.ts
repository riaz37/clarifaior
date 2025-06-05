import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { users } from "./user";
import { workspaces } from "./workspace";
import { workflows, workflow_versions } from "./workflow";

export const workflow_executions = pgTable("workflow_executions", {
  id: uuid("id").primaryKey().defaultRandom(),
  workflow_id: uuid("workflow_id")
    .references(() => workflows.id, { onDelete: "cascade" })
    .notNull(),
  workflow_version_id: uuid("workflow_version_id")
    .references(() => workflow_versions.id, { onDelete: "set null" }),
  workspace_id: uuid("workspace_id")
    .references(() => workspaces.id, { onDelete: "cascade" })
    .notNull(),
  triggered_by: uuid("triggered_by")
    .references(() => users.id, { onDelete: "set null" }),
  
  // Execution status
  status: varchar("status", { length: 50 })
    .notNull()
    .default("pending"), // pending, running, completed, failed, cancelled
  
  // Input/Output
  input: jsonb("input").$type<Record<string, any>>(),
  output: jsonb("output").$type<Record<string, any>>(),
  context: jsonb("context").$type<Record<string, any>>(),
  
  // Error handling
  error: jsonb("error").$type<{
    message: string;
    stack?: string;
    code?: string;
    details?: any;
  }>(),
  
  // Performance metrics
  started_at: timestamp("started_at"),
  completed_at: timestamp("completed_at"),
  duration_ms: integer("duration_ms"),
  
  // Metadata
  ip_address: varchar("ip_address", { length: 50 }),
  user_agent: text("user_agent"),
  
  // Timestamps
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Indexes for common queries
export const workflowExecutionIndexes = {
  workflowIdIdx: workflow_executions.workflow_id,
  workspaceIdIdx: workflow_executions.workspace_id,
  statusIdx: workflow_executions.status,
  createdAtIndex: workflow_executions.created_at,
};

// Types
export type WorkflowExecution = typeof workflow_executions.$inferSelect;
export type NewWorkflowExecution = typeof workflow_executions.$inferInsert;
