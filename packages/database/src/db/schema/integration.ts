import {
  pgTable,
  varchar,
  text,
  timestamp,
  json,
  boolean,
  pgEnum,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
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
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  type: integrationTypeEnum("type").notNull(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id, { onDelete: 'cascade' })
    .notNull(),
  createdBy: uuid("created_by")
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  config: json("config").notNull(), // Encrypted configuration
  metadata: json("metadata"), // Additional settings
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const integrationCredentials = pgTable("integration_credentials", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  integrationId: uuid("integration_id")
    .references(() => integrations.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  encryptedTokens: text("encrypted_tokens").notNull(), // OAuth tokens, API keys
  expiresAt: timestamp("expires_at"),
  refreshToken: text("refresh_token"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
