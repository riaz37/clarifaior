CREATE TYPE "public"."agent_status" AS ENUM('draft', 'active', 'paused', 'archived');--> statement-breakpoint
CREATE TYPE "public"."execution_status" AS ENUM('pending', 'running', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."node_type" AS ENUM('trigger_gmail', 'trigger_slack', 'trigger_webhook', 'trigger_scheduler', 'prompt_llm', 'prompt_memory', 'action_slack', 'action_notion', 'action_email', 'action_webhook', 'condition', 'transformer');--> statement-breakpoint
CREATE TYPE "public"."workspace_role" AS ENUM('owner', 'admin', 'editor', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."integration_type" AS ENUM('deepseek', 'gemini', 'openai', 'anthropic', 'gmail', 'slack', 'notion', 'webhook', 'pinecone', 'langfuse');--> statement-breakpoint
CREATE TYPE "public"."webhook_status" AS ENUM('active', 'inactive', 'failed');--> statement-breakpoint
CREATE TABLE "agent_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"version" varchar(50) NOT NULL,
	"flow_definition" json NOT NULL,
	"changelog" text,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"workspace_id" integer NOT NULL,
	"created_by" integer NOT NULL,
	"status" "agent_status" DEFAULT 'draft' NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"flow_definition" json,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"execution_id" integer NOT NULL,
	"node_id" varchar(100) NOT NULL,
	"step_number" integer NOT NULL,
	"status" "execution_status" NOT NULL,
	"input" json,
	"output" json,
	"error" text,
	"duration" integer,
	"tokens_used" integer,
	"cost" numeric(10, 6),
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "executions" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"trigger_type" varchar(100) NOT NULL,
	"trigger_data" json,
	"status" "execution_status" DEFAULT 'pending' NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"error" text,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flow_edges" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"edge_id" varchar(100) NOT NULL,
	"source" varchar(100) NOT NULL,
	"target" varchar(100) NOT NULL,
	"source_handle" varchar(100),
	"target_handle" varchar(100),
	"data" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flow_nodes" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"node_id" varchar(100) NOT NULL,
	"type" "node_type" NOT NULL,
	"label" varchar(255) NOT NULL,
	"position" json NOT NULL,
	"data" json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"avatar" text,
	"is_email_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" "workspace_role" NOT NULL,
	"invited_at" timestamp DEFAULT now() NOT NULL,
	"joined_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"owner_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "integration_credentials" (
	"id" serial PRIMARY KEY NOT NULL,
	"integration_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"encrypted_tokens" text NOT NULL,
	"expires_at" timestamp,
	"refresh_token" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "integration_type" NOT NULL,
	"workspace_id" integer NOT NULL,
	"created_by" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"config" json NOT NULL,
	"metadata" json,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"created_by" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"cron_expression" varchar(100) NOT NULL,
	"timezone" varchar(50) DEFAULT 'UTC' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_run" timestamp,
	"next_run" timestamp,
	"run_count" integer DEFAULT 0 NOT NULL,
	"config" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"webhook_id" integer NOT NULL,
	"method" varchar(10) NOT NULL,
	"headers" json,
	"body" json,
	"query" json,
	"ip_address" varchar(45),
	"user_agent" text,
	"success" boolean NOT NULL,
	"execution_id" integer,
	"error" text,
	"response_time" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"created_by" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"endpoint" varchar(255) NOT NULL,
	"secret" text NOT NULL,
	"status" "webhook_status" DEFAULT 'active' NOT NULL,
	"last_triggered" timestamp,
	"trigger_count" integer DEFAULT 0 NOT NULL,
	"config" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "webhooks_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "gmail_watches" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"workspace_id" integer NOT NULL,
	"agent_id" integer,
	"email_address" varchar(255) NOT NULL,
	"history_id" varchar(255) NOT NULL,
	"expiration" timestamp NOT NULL,
	"topic_name" varchar(255) NOT NULL,
	"label_ids" json,
	"query" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_processed_history_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"workspace_id" integer NOT NULL,
	"provider" varchar(50) NOT NULL,
	"connection_name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"config" json,
	"last_used" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"workspace_id" integer NOT NULL,
	"provider" varchar(50) NOT NULL,
	"provider_account_id" varchar(255),
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_type" varchar(50) DEFAULT 'Bearer',
	"scope" text,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "agent_versions" ADD CONSTRAINT "agent_versions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_versions" ADD CONSTRAINT "agent_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_logs" ADD CONSTRAINT "execution_logs_execution_id_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."executions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "executions" ADD CONSTRAINT "executions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_edges" ADD CONSTRAINT "flow_edges_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_nodes" ADD CONSTRAINT "flow_nodes_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_credentials" ADD CONSTRAINT "integration_credentials_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_credentials" ADD CONSTRAINT "integration_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_webhook_id_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gmail_watches" ADD CONSTRAINT "gmail_watches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gmail_watches" ADD CONSTRAINT "gmail_watches_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_tokens" ADD CONSTRAINT "oauth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_tokens" ADD CONSTRAINT "oauth_tokens_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;