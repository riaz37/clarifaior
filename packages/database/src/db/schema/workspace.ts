import {
  pgTable,
  pgEnum,
  varchar,
  text,
  uuid,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./user";
import { unique as createUnique } from "./utils";

export const workspaceRoleEnum = pgEnum("workspace_role", [
  "owner",
  "editor",
  "viewer",
]);

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  logo: text("logo"),
  owner_id: uuid("owner_id")
    .references(() => users.id, { onDelete: 'set null' })
    .notNull(),
  plan: varchar("plan", { length: 50 }).default("free"), // free, pro, enterprise
  settings: jsonb("settings").$type<{
    allow_invites: boolean;
    default_role: string;
    max_workflows: number;
    max_executions: number;
  }>(),
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const workspace_members = pgTable(
  "workspace_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspace_id: uuid("workspace_id")
      .references(() => workspaces.id, { onDelete: 'cascade' })
      .notNull(),
    user_id: uuid("user_id")
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    role: workspaceRoleEnum("role").notNull().default("viewer"),
    joined_at: timestamp("joined_at").defaultNow().notNull(),
    invited_by: uuid("invited_by").references(() => users.id, { onDelete: 'set null' }),
    is_active: boolean("is_active").default(true),
  },
  (table) => ({
    unique_workspace_member: createUnique("unique_workspace_member").on(
      table.workspace_id,
      table.user_id
    ),
  })
);
