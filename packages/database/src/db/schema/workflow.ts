import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { workspaces } from "./workspace";
import { users } from "./user";

export const workflows = pgTable("workflows", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspace_id: uuid("workspace_id")
    .references(() => workspaces.id, { onDelete: 'cascade' })
    .notNull(),
  created_by: uuid("created_by")
    .references(() => users.id, { onDelete: 'set null' })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  natural_language_query: text("natural_language_query"), // Original user input
  status: varchar("status", { length: 50 }).default("draft"), // draft, active, paused, archived
  version: varchar("version", { length: 20 }).default("1.0.0"),

  // Workflow Definition
  definition: jsonb("definition").$type<{
    nodes: Array<{
      id: string;
      type: "trigger" | "action" | "condition" | "delay" | "loop";
      position: { x: number; y: number };
      data: any;
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      data?: any;
    }>;
    variables: Array<{
      name: string;
      type: string;
      defaultValue?: any;
    }>;
  }>(),

  // AI-generated metadata
  aiMetadata: jsonb("ai_metadata").$type<{
    confidence: number;
    suggestedOptimizations: string[];
    generatedFrom: string;
    lastAiReview: string;
  }>(),

  // Execution settings
  settings: jsonb("settings").$type<{
    timeout: number;
    retryCount: number;
    concurrent: boolean;
    errorHandling: "stop" | "continue" | "retry";
    notifications: {
      onSuccess: boolean;
      onError: boolean;
      channels: string[];
    };
  }>(),

  tags: jsonb("tags").$type<string[]>(),
  is_template: boolean("is_template").default(false),
  is_public: boolean("is_public").default(false),
  execution_count: varchar("execution_count", { length: 20 }).default("0"),
  success_rate: varchar("success_rate", { length: 10 }).default("0"),
  avg_execution_time: varchar("avg_execution_time", { length: 20 }),

  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  published_at: timestamp("published_at"),
  archived_at: timestamp("archived_at"),
});

export const workflow_versions = pgTable("workflow_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  workflow_id: uuid("workflow_id")
    .references(() => workflows.id, { onDelete: "cascade" }) // Delete versions when workflow is deleted
    .notNull(),
  version: varchar("version", { length: 20 }).notNull(),
  definition: jsonb("definition"),
  changelog: text("changelog"),
  created_by: uuid("created_by")
    .references(() => users.id, { onDelete: "set null" })
    .notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});


