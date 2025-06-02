import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  json,
  pgEnum,
  numeric,
} from "drizzle-orm/pg-core";
import { agents } from "./agent";

export const executionStatusEnum = pgEnum("execution_status", [
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

export const executions = pgTable("executions", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id")
    .references(() => agents.id)
    .notNull(),
  triggerType: varchar("trigger_type", { length: 100 }).notNull(),
  triggerData: json("trigger_data"), // Data that triggered the execution
  status: executionStatusEnum("status").default("pending").notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  error: text("error"),
  metadata: json("metadata"), // Additional execution context
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const executionLogs = pgTable("execution_logs", {
  id: serial("id").primaryKey(),
  executionId: integer("execution_id")
    .references(() => executions.id)
    .notNull(),
  nodeId: varchar("node_id", { length: 100 }).notNull(),
  stepNumber: integer("step_number").notNull(),
  status: executionStatusEnum("status").notNull(),
  input: json("input"),
  output: json("output"),
  error: text("error"),
  duration: integer("duration"), // milliseconds
  tokensUsed: integer("tokens_used"),
  cost: numeric("cost", { precision: 10, scale: 6 }), // USD cost
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});
