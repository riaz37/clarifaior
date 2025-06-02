import { pgTable, serial, varchar, text, timestamp, integer, boolean, json } from "drizzle-orm/pg-core";
import { users } from "./user";
import { workspaces } from "./workspace";

export const oauthTokens = pgTable("oauth_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  workspaceId: integer("workspace_id").references(() => workspaces.id).notNull(),
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
});

export const gmailWatches = pgTable("gmail_watches", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  workspaceId: integer("workspace_id").references(() => workspaces.id).notNull(),
  agentId: integer("agent_id"), // Optional: specific agent to trigger
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
});

export const integrationConnections = pgTable("integration_connections", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  workspaceId: integer("workspace_id").references(() => workspaces.id).notNull(),
  provider: varchar("provider", { length: 50 }).notNull(),
  connectionName: varchar("connection_name", { length: 255 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  config: json("config"), // Provider-specific configuration
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
