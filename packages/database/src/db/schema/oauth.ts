import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  json,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./user";
import { workspaces } from "./workspace";
import { agents } from "./agent";

export const oauthTokens = pgTable("oauth_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id, { onDelete: 'cascade' })
    .notNull(),
  provider: varchar("provider", { length: 50 }).notNull(), // 'google', 'slack', 'notion'
  providerAccountId: varchar("provider_account_id", { length: 255 }), // User ID from provider
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenType: varchar("token_type", { length: 50 }).default("Bearer"),
  scope: text("scope"), // Granted permissions
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true).notNull(),
  metadata: json("metadata"), // Provider-specific data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Add unique constraint on provider and providerAccountId
  providerAccountUnique: unique('provider_account_unique').on(
    table.provider,
    table.providerAccountId
  ),
}));

export const gmailWatches = pgTable("gmail_watches", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id, { onDelete: 'cascade' })
    .notNull(),
  agentId: uuid("agent_id") // Optional: specific agent to trigger
    .references(() => agents.id, { onDelete: 'set null' }),
  emailAddress: varchar("email_address", { length: 255 }).notNull(),
  historyId: varchar("history_id", { length: 255 }).notNull(),
  expiration: timestamp("expiration").notNull(),
  topicName: varchar("topic_name", { length: 255 }).notNull(),
  labelIds: json("label_ids"), // Array of Gmail label IDs to watch
  query: text("query"), // Gmail search query filter
  isActive: boolean("is_active").default(true).notNull(),
  lastProcessedHistoryId: varchar("last_processed_history_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Add unique constraint on emailAddress and userId
  emailUserUnique: unique('email_user_unique').on(
    table.emailAddress,
    table.userId
  ),
}));

export const integrationConnections = pgTable("integration_connections", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id, { onDelete: 'cascade' })
    .notNull(),
  provider: varchar("provider", { length: 50 }).notNull(),
  connectionName: varchar("connection_name", { length: 255 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  config: json("config"), // Provider-specific configuration
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Add unique constraint on provider and connectionName per workspace
  providerConnectionUnique: unique('provider_connection_unique').on(
    table.workspaceId,
    table.provider,
    table.connectionName
  ),
}));

// Helper function to create unique constraint
function unique(name: string) {
  return {
    name,
    on: (...columns: any[]) => ({
      name,
      columns,
    }),
  };
}
