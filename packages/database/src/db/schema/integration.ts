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
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),

  provider: varchar("provider", { length: 100 }).notNull(), // slack, gmail, notion, etc.
  name: varchar("name", { length: 255 }).notNull(),

  // OAuth/API credentials (encrypted)
  credentials: jsonb("credentials").$type<{
    type: "oauth" | "api_key" | "webhook";
    accessToken?: string;
    refreshToken?: string;
    apiKey?: string;
    webhookUrl?: string;
    expiresAt?: string;
    scopes?: string[];
  }>(),

  // Integration configuration
  config: jsonb("config").$type<{
    baseUrl?: string;
    version?: string;
    rateLimits?: {
      requests: number;
      window: number;
    };
    webhookSecret?: string;
  }>(),

  status: varchar("status", { length: 50 }).default("active"), // active, error, expired, revoked
  lastSync: timestamp("last_sync"),
  lastError: text("last_error"),

  // Usage tracking
  usageStats: jsonb("usage_stats").$type<{
    totalRequests: number;
    successfulRequests: number;
    lastUsed: string;
    monthlyUsage: number;
  }>(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
