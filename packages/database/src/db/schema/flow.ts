import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  json,
  pgEnum,
} from "drizzle-orm/pg-core";
import { agents } from "./agent";

export const nodeTypeEnum = pgEnum("node_type", [
  "trigger_gmail",
  "trigger_slack",
  "trigger_webhook",
  "trigger_scheduler",
  "prompt_llm",
  "prompt_memory",
  "action_slack",
  "action_notion",
  "action_email",
  "action_webhook",
  "condition",
  "transformer",
]);

export const flowNodes = pgTable("flow_nodes", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id")
    .references(() => agents.id)
    .notNull(),
  nodeId: varchar("node_id", { length: 100 }).notNull(), // React Flow node ID
  type: nodeTypeEnum("type").notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  position: json("position").notNull(), // {x, y} coordinates
  data: json("data").notNull(), // Node-specific configuration
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const flowEdges = pgTable("flow_edges", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id")
    .references(() => agents.id)
    .notNull(),
  edgeId: varchar("edge_id", { length: 100 }).notNull(), // React Flow edge ID
  source: varchar("source", { length: 100 }).notNull(),
  target: varchar("target", { length: 100 }).notNull(),
  sourceHandle: varchar("source_handle", { length: 100 }),
  targetHandle: varchar("target_handle", { length: 100 }),
  data: json("data"), // Edge-specific configuration
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
