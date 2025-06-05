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
  passwordHash: varchar("password_hash", { length: 255 }),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  avatar: text("avatar"),
  emailVerified: boolean("email_verified").default(false),
  emailVerificationToken: varchar("email_verification_token", { length: 255 }),
  resetPasswordToken: varchar("reset_password_token", { length: 255 }),
  resetPasswordExpires: timestamp("reset_password_expires"),
  role: userRoleEnum("role").default("user"),
  lastLoginAt: timestamp("last_login_at"),
  isActive: boolean("is_active").default(true),
  preferences: jsonb("preferences").$type<{
    notifications: boolean;
    theme: "light" | "dark" | "system";
    timezone: string;
    language: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
