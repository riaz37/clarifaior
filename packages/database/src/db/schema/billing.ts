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

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspace_id: uuid("workspace_id")
    .references(() => workspaces.id, { onDelete: 'cascade' })
    .notNull(),

  // Stripe integration
  stripe_customer_id: varchar("stripe_customer_id", { length: 255 }),
  stripe_subscription_id: varchar("stripe_subscription_id", { length: 255 }),
  stripe_price_id: varchar("stripe_price_id", { length: 255 }),

  plan: varchar("plan", { length: 50 }).notNull(), // free, pro, enterprise
  status: varchar("status", { length: 50 }).notNull(), // active, cancelled, past_due, unpaid

  // Billing cycle
  current_period_start: timestamp("current_period_start"),
  current_period_end: timestamp("current_period_end"),
  cancel_at: timestamp("cancel_at"),
  canceled_at: timestamp("canceled_at"),

  // Usage limits
  limits: jsonb("limits").$type<{
    executions: number;
    integrations: number;
    team_members: number;
    api_calls: number;
  }>(),

  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const usage_tracking = pgTable("usage_tracking", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspace_id: uuid("workspace_id")
    .references(() => workspaces.id, { onDelete: 'cascade' })
    .notNull(),
  subscription_id: uuid("subscription_id")
    .references(() => subscriptions.id, { onDelete: 'cascade' }),
  action: varchar("action", { length: 100 }).notNull(),
  count: integer("count").default(0),
  date: timestamp("date").defaultNow(),
  workflow_executions: varchar("workflow_executions", { length: 20 }).default(
    "0"
  ),
  api_calls: varchar("api_calls", { length: 20 }).default("0"),
  ai_tokens_used: varchar("ai_tokens_used", { length: 20 }).default("0"),
  storage_used: varchar("storage_used", { length: 20 }).default("0"), // in bytes

  // Breakdown by service
  usageBreakdown: jsonb("usage_breakdown").$type<{
    workflows: Record<string, number>;
    integrations: Record<string, number>;
    agents: Record<string, number>;
  }>(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
