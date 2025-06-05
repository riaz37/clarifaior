import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  boolean,
  uuid,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "super_admin", // Full platform access
  "admin", // Platform admin with elevated privileges
  "user", // Regular user
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password_hash: varchar("password_hash", { length: 255 }),
  first_name: varchar("first_name", { length: 100 }),
  last_name: varchar("last_name", { length: 100 }),
  avatar: text("avatar"),
  email_verified: boolean("email_verified").default(false),
  email_verification_token: varchar("email_verification_token", { length: 255 }),
  reset_password_token: varchar("reset_password_token", { length: 255 }),
  reset_password_expires: timestamp("reset_password_expires"),
  role: userRoleEnum("role").default("user"),
  last_login_at: timestamp("last_login_at"),
  is_active: boolean("is_active").default(true),
  preferences: jsonb("preferences").$type<{
    notifications: boolean;
    theme: "light" | "dark" | "system";
    timezone: string;
    language: string;
  }>(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});
