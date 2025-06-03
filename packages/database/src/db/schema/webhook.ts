import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  json,
  pgEnum,
  integer,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { agents } from "./agent";
import { users } from "./user";

export const webhookStatusEnum = pgEnum("webhook_status", [
  "active",
  "inactive",
  "failed",
]);

export const webhooks = pgTable("webhooks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: 'cascade' })
    .notNull(),
  createdBy: uuid("created_by")
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  endpoint: varchar("endpoint", { length: 255 }).notNull().unique(),
  secret: text("secret").notNull(),
  status: webhookStatusEnum("status").default("active").notNull(),
  lastTriggered: timestamp("last_triggered"),
  triggerCount: integer("trigger_count").default(0).notNull(),
  config: json("config"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Add index on agentId for faster lookups
  agentIdIdx: {
    name: "webhooks_agent_id_idx",
    columns: [table.agentId],
  },
}));

export const webhookLogs = pgTable("webhook_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  webhookId: uuid("webhook_id")
    .references(() => webhooks.id, { onDelete: 'cascade' })
    .notNull(),
  method: varchar("method", { length: 10 }).notNull(),
  headers: json("headers"),
  body: json("body"),
  query: json("query"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  success: boolean("success").notNull(),
  executionId: integer("execution_id"), // Reference to execution if triggered
  error: text("error"),
  responseTime: integer("response_time"), // milliseconds
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const schedules = pgTable("schedules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: 'cascade' })
    .notNull(),
  createdBy: uuid("created_by")
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  cronExpression: varchar("cron_expression", { length: 100 }).notNull(),
  timezone: varchar("timezone", { length: 50 }).default("UTC").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  lastRun: timestamp("last_run"),
  nextRun: timestamp("next_run"),
  runCount: integer("run_count").default(0).notNull(),
  config: json("config"), // Additional schedule configuration
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
