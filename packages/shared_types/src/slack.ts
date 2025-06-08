// packages/shared/src/types/slack.ts

import { BaseIntegrationConfig, BaseWebhookEvent } from "@repo/integrations";

export interface SlackIntegrationConfig extends BaseIntegrationConfig {
  provider: "slack";
  botToken: string; // Encrypted
  signingSecret: string; // Encrypted
  appId?: string;
  clientId?: string;
  clientSecret?: string; // Encrypted
  scopes: string[];
  webhookUrl?: string;
}

export interface SlackMessageRequest {
  channel: string;
  message?: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
  threadReply?: string; // thread_ts
  metadata?: SlackMessageMetadata;
  options?: {
    unfurlLinks?: boolean;
    unfurlMedia?: boolean;
    asUser?: boolean;
    iconEmoji?: string;
    iconUrl?: string;
    username?: string;
  };
}

export interface SlackMessageResponse {
  messageId: string; // message timestamp
  timestamp: number;
  channel: string;
  permalink: string;
  threadTs?: string;
}

export interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
  isMember: boolean;
  topic: string;
  purpose: string;
  memberCount: number;
  created: number;
  isArchived?: boolean;
  isGeneral?: boolean;
}

export interface SlackUser {
  id: string;
  name: string;
  realName: string;
  displayName: string;
  email: string;
  avatar: string;
  timezone: string;
  isBot: boolean;
  isDeleted: boolean;
  status?: {
    text: string;
    emoji: string;
    expiration: number;
  };
}

export interface SlackWorkflowContext {
  workflowId: string;
  executionId: string;
  stepId: string;
  userId: string;
  workspaceId: string;
  metadata?: Record<string, any>;
}

export interface SlackWebhookEvent extends BaseWebhookEvent {
  team_id: string;
  api_app_id: string;
  event: SlackEventData;
  type: SlackEventType;
  event_id: string;
  event_time: number;
  authorizations?: SlackAuthorization[];
  is_ext_shared_channel?: boolean;
  event_context?: string;
}

export type SlackEventType =
  | "app_mention"
  | "message"
  | "reaction_added"
  | "reaction_removed"
  | "channel_created"
  | "channel_deleted"
  | "channel_rename"
  | "member_joined_channel"
  | "member_left_channel"
  | "user_change"
  | "team_join"
  | "file_shared"
  | "file_public"
  | "file_unshared"
  | "workflow_step_execute";

export interface SlackEventData {
  type: string;
  user?: string;
  ts?: string;
  channel?: string;
  text?: string;
  thread_ts?: string;
  bot_id?: string;
  app_id?: string;
  blocks?: SlackBlock[];
  files?: SlackFile[];
  reaction?: string;
  item?: {
    type: string;
    channel: string;
    ts: string;
  };
  [key: string]: any;
}

export interface SlackAuthorization {
  enterprise_id?: string;
  team_id: string;
  user_id: string;
  is_bot: boolean;
  is_enterprise_install?: boolean;
}

// Slack Block Kit types
export interface SlackBlock {
  type: SlackBlockType;
  block_id?: string;
  [key: string]: any;
}

export type SlackBlockType =
  | "section"
  | "divider"
  | "image"
  | "actions"
  | "context"
  | "input"
  | "file"
  | "header"
  | "rich_text";

export interface SlackSectionBlock extends SlackBlock {
  type: "section";
  text?: SlackTextObject;
  fields?: SlackTextObject[];
  accessory?: SlackBlockElement;
}

export interface SlackActionsBlock extends SlackBlock {
  type: "actions";
  elements: SlackBlockElement[];
}

export interface SlackContextBlock extends SlackBlock {
  type: "context";
  elements: (SlackTextObject | SlackImageElement)[];
}

export interface SlackHeaderBlock extends SlackBlock {
  type: "header";
  text: SlackTextObject;
}

export interface SlackDividerBlock extends SlackBlock {
  type: "divider";
}

export interface SlackImageBlock extends SlackBlock {
  type: "image";
  image_url: string;
  alt_text: string;
  title?: SlackTextObject;
}

// Block elements
export interface SlackBlockElement {
  type: SlackElementType;
  [key: string]: any;
}

export type SlackElementType =
  | "button"
  | "checkboxes"
  | "datepicker"
  | "image"
  | "multi_static_select"
  | "multi_external_select"
  | "multi_users_select"
  | "multi_conversations_select"
  | "multi_channels_select"
  | "overflow"
  | "plain_text_input"
  | "radio_buttons"
  | "static_select"
  | "external_select"
  | "users_select"
  | "conversations_select"
  | "channels_select"
  | "timepicker";

export interface SlackButtonElement extends SlackBlockElement {
  type: "button";
  text: SlackTextObject;
  action_id: string;
  url?: string;
  value?: string;
  style?: "primary" | "danger";
  confirm?: SlackConfirmationDialog;
}

export interface SlackTextObject {
  type: "plain_text" | "mrkdwn";
  text: string;
  emoji?: boolean;
  verbatim?: boolean;
}

export interface SlackImageElement {
  type: "image";
  image_url: string;
  alt_text: string;
}

export interface SlackConfirmationDialog {
  title: SlackTextObject;
  text: SlackTextObject;
  confirm: SlackTextObject;
  deny: SlackTextObject;
  style?: "primary" | "danger";
}

// Legacy attachments (for backward compatibility)
export interface SlackAttachment {
  color?: string;
  pretext?: string;
  author_name?: string;
  author_link?: string;
  author_icon?: string;
  title?: string;
  title_link?: string;
  text?: string;
  fields?: SlackAttachmentField[];
  image_url?: string;
  thumb_url?: string;
  footer?: string;
  footer_icon?: string;
  ts?: number;
  actions?: SlackAttachmentAction[];
  callback_id?: string;
  mrkdwn_in?: string[];
}

export interface SlackAttachmentField {
  title: string;
  value: string;
  short?: boolean;
}

export interface SlackAttachmentAction {
  name: string;
  text: string;
  type: "button" | "select";
  value?: string;
  url?: string;
  style?: "default" | "primary" | "danger";
  confirm?: {
    title: string;
    text: string;
    ok_text?: string;
    dismiss_text?: string;
  };
  options?: {
    text: string;
    value: string;
  }[];
}

export interface SlackFile {
  id: string;
  name: string;
  title: string;
  mimetype: string;
  filetype: string;
  pretty_type: string;
  user: string;
  size: number;
  url_private: string;
  url_private_download: string;
  thumb_64?: string;
  thumb_80?: string;
  thumb_360?: string;
  thumb_480?: string;
  thumb_720?: string;
  thumb_960?: string;
  thumb_1024?: string;
  permalink: string;
  permalink_public?: string;
  is_external: boolean;
  external_type?: string;
  is_public: boolean;
  public_url_shared: boolean;
  display_as_bot: boolean;
  username?: string;
  timestamp: number;
  channels?: string[];
  groups?: string[];
  ims?: string[];
}

export interface SlackMessageMetadata {
  event_type: string;
  event_payload: Record<string, any>;
}

// Workflow trigger types
export interface SlackTriggerConfig {
  type: SlackTriggerType;
  channels?: string[];
  users?: string[];
  keywords?: string[];
  reactions?: string[];
  fileTypes?: string[];
  conditions?: SlackTriggerCondition[];
}

export type SlackTriggerType =
  | "message"
  | "mention"
  | "reaction"
  | "channel_join"
  | "channel_leave"
  | "file_upload"
  | "workflow_button"
  | "scheduled";

export interface SlackTriggerCondition {
  field: string;
  operator: "equals" | "contains" | "starts_with" | "ends_with" | "regex";
  value: string;
  caseSensitive?: boolean;
}

// Action types for workflow steps
export interface SlackActionConfig {
  type: SlackActionType;
  parameters: Record<string, any>;
  retryConfig?: {
    maxRetries: number;
    backoffMultiplier: number;
    maxBackoffTime: number;
  };
}

export type SlackActionType =
  | "send_message"
  | "send_dm"
  | "add_reaction"
  | "create_channel"
  | "invite_to_channel"
  | "archive_channel"
  | "set_topic"
  | "set_purpose"
  | "upload_file"
  | "pin_message"
  | "unpin_message"
  | "update_message"
  | "delete_message";

// Error types specific to Slack
export interface SlackError {
  code: string;
  message: string;
  details?: {
    channel?: string;
    user?: string;
    timestamp?: string;
    [key: string]: any;
  };
}
