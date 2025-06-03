import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  json,
  pgEnum,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { workspaces } from "./workspace";
import { users } from "./user";

export const agentStatusEnum = pgEnum("agent_status", [
  "draft",
  "active",
  "paused",
  "archived",
]);

export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id, { onDelete: 'cascade' })
    .notNull(),
  createdBy: uuid("created_by")
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  status: agentStatusEnum("status").default("draft").notNull(),
  isPublic: boolean("is_public").default(false).notNull(),
  flowDefinition: json("flow_definition"), // React Flow JSON
  metadata: json("metadata"), // Additional configuration
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const agentVersions = pgTable("agent_versions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: 'cascade' })
    .notNull(),
  version: varchar("version", { length: 50 }).notNull(),
  flowDefinition: json("flow_definition").notNull(),
  changelog: text("changelog"),
  createdBy: uuid("created_by")
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Add unique constraint on agentId and version
  agentVersionUnique: unique('agent_version_unique').on(
    table.agentId,
    table.version
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
