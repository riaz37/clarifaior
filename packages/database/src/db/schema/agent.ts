import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  json,
  pgEnum,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";
import { users } from "./user";

export const agentStatusEnum = pgEnum("agent_status", [
  "draft",
  "active",
  "paused",
  "archived",
]);

export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  workspaceId: integer("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  createdBy: integer("created_by")
    .references(() => users.id)
    .notNull(),
  status: agentStatusEnum("status").default("draft").notNull(),
  isPublic: boolean("is_public").default(false).notNull(),
  flowDefinition: json("flow_definition"), // React Flow JSON
  metadata: json("metadata"), // Additional configuration
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const agentVersions = pgTable("agent_versions", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id")
    .references(() => agents.id)
    .notNull(),
  version: varchar("version", { length: 50 }).notNull(),
  flowDefinition: json("flow_definition").notNull(),
  changelog: text("changelog"),
  createdBy: integer("created_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
