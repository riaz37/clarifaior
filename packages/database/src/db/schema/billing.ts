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
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id)
    .notNull(),

  // Stripe integration
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  stripePriceId: varchar("stripe_price_id", { length: 255 }),

  plan: varchar("plan", { length: 50 }).notNull(), // free, pro, enterprise
  status: varchar("status", { length: 50 }).notNull(), // active, cancelled, past_due, unpaid

  // Billing cycle
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAt: timestamp("cancel_at"),
  cancelledAt: timestamp("cancelled_at"),

  // Usage limits
  limits: jsonb("limits").$type<{
    workflows: number;
    executions: number;
    integrations: number;
    teamMembers: number;
    apiCalls: number;
  }>(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const usageTracking = pgTable("usage_tracking", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id)
    .notNull(),

  // Tracking period
  period: varchar("period", { length: 20 }).notNull(), // YYYY-MM format

  // Usage counters
  workflowExecutions: varchar("workflow_executions", { length: 20 }).default(
    "0"
  ),
  apiCalls: varchar("api_calls", { length: 20 }).default("0"),
  aiTokensUsed: varchar("ai_tokens_used", { length: 20 }).default("0"),
  storageUsed: varchar("storage_used", { length: 20 }).default("0"), // in bytes

  // Breakdown by service
  usageBreakdown: jsonb("usage_breakdown").$type<{
    workflows: Record<string, number>;
    integrations: Record<string, number>;
    agents: Record<string, number>;
  }>(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
