import {
  pgTable,
  varchar,
  text,
  timestamp,
  pgEnum,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./user";

export const workspaceRoleEnum = pgEnum("workspace_role", [
  "owner",
  "admin",
  "editor",
  "viewer",
]);

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  ownerId: uuid("owner_id")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const workspaceMembers = pgTable("workspace_members", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  role: workspaceRoleEnum("role").notNull(),
  invitedAt: timestamp("invited_at").defaultNow().notNull(),
  joinedAt: timestamp("joined_at"),
}, (table) => ({
  // Add unique constraint on workspaceId and userId
  workspaceUserUnique: unique('workspace_user_unique').on(
    table.workspaceId,
    table.userId
  ),
}));

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
