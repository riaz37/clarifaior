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
import { workspaces } from "./workspace";
import { users } from "./user";

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspace_id: uuid("workspace_id")
    .references(() => workspaces.id, { onDelete: 'cascade' })
    .notNull(),
  user_id: uuid("user_id")
    .references(() => users.id, { onDelete: 'set null' }),

  action: varchar("action", { length: 100 }).notNull(), // workflow.created, integration.connected, etc.
  resourceType: varchar("resource_type", { length: 50 }).notNull(), // workflow, integration, user, etc.
  resourceId: uuid("resource_id"),

  // Audit details
  details: jsonb("details").$type<{
    changes?: Record<string, { old: any; new: any }>;
    metadata?: Record<string, any>;
  }>(),
  metadata: jsonb("metadata"),
  ip_address: varchar("ip_address", { length: 45 }),
  user_agent: text("user_agent"),

  severity: varchar("severity", { length: 20 }).default("info"), 

  created_at: timestamp("created_at").defaultNow().notNull(),
});
