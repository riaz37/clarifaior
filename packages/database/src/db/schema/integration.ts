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
import { sql } from "drizzle-orm";
import { workspaces } from "./workspace";
import { users } from "./user";

export const integrations = pgTable("integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspace_id: uuid("workspace_id")
    .references(() => workspaces.id, { onDelete: 'cascade' })
    .notNull(),
  user_id: uuid("user_id")
    .references(() => users.id, { onDelete: 'set null' })
    .notNull(),

  provider: varchar("provider", { length: 100 }).notNull(), // slack, gmail, notion, etc.
  name: varchar("name", { length: 255 }).notNull(),

  // OAuth/API credentials (encrypted)
  credentials: jsonb("credentials").$type<{
    type: "oauth" | "api_key" | "webhook";
    access_token?: string;
    refresh_token?: string;
    api_key?: string;
    webhook_url?: string;
    expires_at?: string;
    scopes?: string[];
  }>(),

  // Integration configuration
  config: jsonb("config").$type<{
    base_url?: string;
    version?: string;
    rate_limits?: {
      requests: number;
      window: number;
    };
    webhook_secret?: string;
  }>(),

  status: varchar("status", { length: 50 }).default("active"), // active, error, expired, revoked
  last_sync: timestamp("last_sync"),
  lastError: text("last_error"),

  // Usage tracking
  usage_stats: jsonb("usage_stats").$type<{
    total_requests: number;
    successful_requests: number;
    last_used: string;
    monthly_usage: number;
  }>(),
  is_active: boolean("is_active").default(true),

  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});
