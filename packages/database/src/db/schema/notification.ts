import {
  pgTable,
  varchar,
  text,
  timestamp,
  json,
  boolean,
  pgEnum,
  uuid,
  jsonb,
} from "drizzle-orm/pg-core";
import { users } from "./user";
import { workspaces } from "./workspace";

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id),

  type: varchar("type", { length: 50 }).notNull(), // workflow_failed, integration_error, etc.
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),

  // Notification context
  context: jsonb("context").$type<{
    workflowId?: string;
    executionId?: string;
    integrationId?: string;
    actionUrl?: string;
  }>(),

  priority: varchar("priority", { length: 20 }).default("normal"), // low, normal, high, urgent

  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),

  // Delivery channels
  channels: jsonb("channels").$type<{
    inApp: boolean;
    email: boolean;
    slack: boolean;
    webhook: boolean;
  }>(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});
