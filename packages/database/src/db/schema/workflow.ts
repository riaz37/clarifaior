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
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  createdBy: uuid("created_by")
    .references(() => users.id)
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  naturalLanguageQuery: text("natural_language_query"), // Original user input
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
  isTemplate: boolean("is_template").default(false),
  isPublic: boolean("is_public").default(false),
  executionCount: varchar("execution_count", { length: 20 }).default("0"),
  successRate: varchar("success_rate", { length: 10 }).default("0"),
  avgExecutionTime: varchar("avg_execution_time", { length: 20 }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  publishedAt: timestamp("published_at"),
  archivedAt: timestamp("archived_at"),
});

export const workflowVersions = pgTable("workflow_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  workflowId: uuid("workflow_id")
    .references(() => workflows.id)
    .notNull(),
  version: varchar("version", { length: 20 }).notNull(),
  definition: jsonb("definition"),
  changelog: text("changelog"),
  createdBy: uuid("created_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
