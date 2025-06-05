import {
  pgTable,
  varchar,
  text,
  timestamp,
  pgEnum,
  uuid,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./user";

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
  ownerId: uuid("owner_id")
    .references(() => users.id)
    .notNull(),
  plan: varchar("plan", { length: 50 }).default("free"), // free, pro, enterprise
  settings: jsonb("settings").$type<{
    allowInvites: boolean;
    defaultRole: string;
    maxWorkflows: number;
    maxExecutions: number;
  }>(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .references(() => workspaces.id)
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    role: workspaceRoleEnum("role").default("viewer"),
    permissions: jsonb("permissions").$type<string[]>(),
    invitedAt: timestamp("invited_at"),
    joinedAt: timestamp("joined_at"),
    invitedBy: uuid("invited_by").references(() => users.id),
    isActive: boolean("is_active").default(true),
  },
  (table) => ({
    workspaceUserUnique: unique("workspace_user_unique").on(
      table.workspaceId,
      table.userId
    ),
  })
);

// Helper function to create unique constraint
export function unique(name: string) {
  return {
    name,
    on: (...columns: any[]) => ({
      name,
      columns,
    }),
  };
}
