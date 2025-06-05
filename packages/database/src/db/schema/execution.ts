import {
  pgTable,
  varchar,
  text,
  timestamp,
  json,
  pgEnum,
  numeric,
  uuid,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { workflows } from "./workflow";
import { workspaces } from "./workspace";
import { users } from "./user";

export const workflowExecutions = pgTable("workflow_executions", {
  id: uuid("id").primaryKey().defaultRandom(),
  workflowId: uuid("workflow_id")
    .references(() => workflows.id)
    .notNull(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  triggeredBy: uuid("triggered_by").references(() => users.id),

  status: varchar("status", { length: 50 }).notNull(), // running, completed, failed, cancelled, timeout

  // Execution context
  input: jsonb("input"), // Initial trigger data
  output: jsonb("output"), // Final execution result
  context: jsonb("context").$type<{
    variables: Record<string, any>;
    metadata: Record<string, any>;
    parentExecutionId?: string;
  }>(),

  // Timing
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  duration: varchar("duration", { length: 20 }), // in milliseconds

  // Error handling
  error: jsonb("error").$type<{
    message: string;
    code: string;
    stack?: string;
    nodeId?: string;
  }>(),

  // Resource usage
  resourceUsage: jsonb("resource_usage").$type<{
    apiCalls: number;
    tokensUsed: number;
    executionTime: number;
    memoryUsed: number;
  }>(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const executionSteps = pgTable("execution_steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  executionId: uuid("execution_id")
    .references(() => workflowExecutions.id)
    .notNull(),
  nodeId: varchar("node_id", { length: 255 }).notNull(),
  stepNumber: varchar("step_number", { length: 10 }).notNull(),

  status: varchar("status", { length: 50 }).notNull(), // pending, running, completed, failed, skipped

  input: jsonb("input"),
  output: jsonb("output"),

  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  duration: varchar("duration", { length: 20 }),

  error: jsonb("error").$type<{
    message: string;
    code: string;
    retryCount: number;
  }>(),

  metadata: jsonb("metadata").$type<{
    integrationUsed?: string;
    apiEndpoint?: string;
    retryAttempts?: number;
  }>(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});
