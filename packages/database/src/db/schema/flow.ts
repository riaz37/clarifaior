import {
  pgTable,
  varchar,
  text,
  timestamp,
  json,
  pgEnum,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
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
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: 'cascade' })
    .notNull(),
  nodeId: varchar("node_id", { length: 100 }).notNull(), // React Flow node ID
  type: nodeTypeEnum("type").notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  position: json("position").notNull(), // {x, y} coordinates
  data: json("data").notNull(), // Node-specific configuration
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Add unique constraint on agentId and nodeId
  agentNodeUnique: unique('agent_node_unique').on(
    table.agentId,
    table.nodeId
  ),
}));

export const flowEdges = pgTable("flow_edges", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: 'cascade' })
    .notNull(),
  edgeId: varchar("edge_id", { length: 100 }).notNull(), // React Flow edge ID
  source: varchar("source", { length: 100 }).notNull(),
  target: varchar("target", { length: 100 }).notNull(),
  sourceHandle: varchar("source_handle", { length: 100 }),
  targetHandle: varchar("target_handle", { length: 100 }),
  data: json("data"), // Edge-specific configuration
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Add unique constraint on agentId and edgeId
  agentEdgeUnique: unique('agent_edge_unique').on(
    table.agentId,
    table.edgeId
  )
}));

// Helper function to create unique constraint
function unique(name: string) {
  return {
    name,
    on: (...columns: any[]) => ({
      name,
      columns,
    }),
  };
}
