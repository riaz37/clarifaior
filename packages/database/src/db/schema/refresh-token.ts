import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { users } from "./user";

export const refreshTokens = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revoked: boolean("revoked").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
