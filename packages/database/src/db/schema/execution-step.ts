import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  integer,
} from "drizzle-orm/pg-core";
import { workflow_executions } from "./workflow-execution";

export const execution_steps = pgTable("execution_steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  execution_id: uuid("execution_id")
    .references(() => workflow_executions.id, { onDelete: "cascade" })
    .notNull(),
  parent_step_id: uuid("parent_step_id"), // For nested steps
  
  // Step identification
  step_id: varchar("step_id", { length: 255 }).notNull(), // Unique ID within the workflow
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 100 }).notNull(), // task, condition, loop, etc.
  
  // Execution data
  status: varchar("status", { length: 50 })
    .notNull()
    .default("pending"), // pending, running, completed, failed, skipped
  
  input: jsonb("input").$type<Record<string, any>>(),
  output: jsonb("output").$type<Record<string, any>>(),
  context: jsonb("context").$type<Record<string, any>>(),
  
  // Error handling
  error: jsonb("error").$type<{
    message: string;
    stack?: string;
    code?: string;
    retryable?: boolean;
    details?: any;
  }>(),
  
  // Retry information
  retry_count: integer("retry_count").default(0),
  max_retries: integer("max_retries").default(3),
  
  // Performance metrics
  started_at: timestamp("started_at"),
  completed_at: timestamp("completed_at"),
  duration_ms: integer("duration_ms"),
  
  // Timestamps
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Indexes for common queries
export const executionStepIndexes = {
  executionIdIdx: execution_steps.execution_id,
  parentStepIdIdx: execution_steps.parent_step_id,
  statusIdx: execution_steps.status,
  createdAtIndex: execution_steps.created_at,
};

// Types
export type ExecutionStep = typeof execution_steps.$inferSelect;
export type NewExecutionStep = typeof execution_steps.$inferInsert;
