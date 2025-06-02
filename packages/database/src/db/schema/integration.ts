import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  json,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";
import { users } from "./user";

export const integrationTypeEnum = pgEnum("integration_type", [
  "deepseek",
  "gemini",
  "openai",
  "anthropic",
  "gmail",
  "slack",
  "notion",
  "webhook",
  "pinecone",
  "langfuse",
]);

export const integrations = pgTable("integrations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: integrationTypeEnum("type").notNull(),
  workspaceId: integer("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  createdBy: integer("created_by")
    .references(() => users.id)
    .notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  config: json("config").notNull(), // Encrypted configuration
  metadata: json("metadata"), // Additional settings
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const integrationCredentials = pgTable("integration_credentials", {
  id: serial("id").primaryKey(),
  integrationId: integer("integration_id")
    .references(() => integrations.id)
    .notNull(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  encryptedTokens: text("encrypted_tokens").notNull(), // OAuth tokens, API keys
  expiresAt: timestamp("expires_at"),
  refreshToken: text("refresh_token"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
