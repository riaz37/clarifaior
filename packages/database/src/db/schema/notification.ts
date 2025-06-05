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
  user_id: uuid("user_id")
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  workspace_id: uuid("workspace_id").references(
    () => workspaces.id,
    { onDelete: 'cascade' }
  ),

  type: varchar("type", { length: 50 }).notNull(), // workflow_failed, integration_error, etc.
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),

  // Notification context
  context: jsonb("context").$type<{
    workflow_id?: string;
    execution_id?: string;
    integration_id?: string;
    action_url?: string;
  }>(),

  priority: varchar("priority", { length: 20 }).default("normal"), // low, normal, high, urgent

  is_read: boolean("is_read").default(false),
  read_at: timestamp("read_at"),

  // Delivery channels
  channels: jsonb("channels").$type<{
    inApp: boolean;
    email: boolean;
    slack: boolean;
    webhook: boolean;
  }>(),

  created_at: timestamp("created_at").defaultNow().notNull(),
});
