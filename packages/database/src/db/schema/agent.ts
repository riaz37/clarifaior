import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  json,
  pgEnum,
  uuid,
  jsonb,
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
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  createdBy: uuid("created_by")
    .references(() => users.id)
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 50 }).notNull(), // workflow-designer, intent-parser, integration-mapper, etc.

  // Agent Configuration
  config: jsonb("config").$type<{
    model: string; // gpt-4, claude-3, etc.
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
    tools: string[];
    memory: {
      type: "conversation" | "workflow" | "user";
      maxMessages: number;
    };
  }>(),

  // LangGraph specific
  graphDefinition: jsonb("graph_definition").$type<{
    nodes: Array<{
      id: string;
      type: string;
      config: any;
    }>;
    edges: Array<{
      source: string;
      target: string;
      condition?: string;
    }>;
    state: any;
  }>(),

  status: varchar("status", { length: 50 }).default("active"), // active, inactive, training
  version: varchar("version", { length: 20 }).default("1.0.0"),

  // Performance metrics
  metrics: jsonb("metrics").$type<{
    totalInteractions: number;
    successRate: number;
    avgResponseTime: number;
    lastTrainedAt: string;
  }>(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
