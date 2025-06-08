import { BaseTool, type ToolResult } from '../base/base-tool';
import { CallbackManagerForToolRun } from '@langchain/core/callbacks/manager';
import { z } from 'zod';
// Note: @slack/web-api needs to be installed
// Run: npm install @slack/web-api
import { WebClient } from '@slack/web-api';

export interface SlackToolParams {
  /** OAuth token for Slack API */
  token: string;
  /** Default channel to send messages to */
  defaultChannel?: string;
  /** Whether to enable verbose logging */
  verbose?: boolean;
}

export interface SlackMessageParams {
  /** Channel to send the message to */
  channel: string;
  /** Message text */
  text: string;
  /** Optional blocks for rich formatting */
  blocks?: any[];
  /** Optional attachments */
  attachments?: any[];
  /** Optional thread timestamp to reply to a thread */
  thread_ts?: string;
  /** Whether to send as a reply in thread */
  reply_broadcast?: boolean;
}

export interface SlackFileUploadParams {
  /** Channel to upload file to */
  channel: string;
  /** File content as string or Buffer */
  content: string | Buffer;
  /** File name */
  filename: string;
  /** File title */
  title?: string;
  /** Initial comment */
  initial_comment?: string;
  /** File type */
  filetype?: string;
}

export class SlackTool extends BaseTool {
  private client: WebClient;
  private defaultChannel?: string;
  protected verbose: boolean;

  constructor(params: SlackToolParams) {
    super({
      name: 'slack',
      description: 'Tool for interacting with Slack API',
      ...params
    });
    
    this.client = new WebClient(params.token);
    this.defaultChannel = params.defaultChannel;
    this.verbose = params.verbose ?? false;
  }

  protected getSchema() {
    return z.object({
      action: z.enum(['sendMessage', 'uploadFile', 'listChannels', 'getChannelInfo']),
      params: z.any(),
    });
  }

  async _call(
    input: { action: string; params: any },
    _runManager?: CallbackManagerForToolRun
  ): Promise<ToolResult> {
    try {
      const { action, params } = input;
      
      if (this.verbose) {
        console.log(`Executing Slack action: ${action}`, params);
      }

      let result;
      switch (action) {
        case 'sendMessage':
          result = await this.sendMessage(params);
          break;
        case 'uploadFile':
          result = await this.uploadFile(params);
          break;
        case 'listChannels':
          result = await this.listChannels(params);
          break;
        case 'getChannelInfo':
          result = await this.getChannelInfo(params);
          break;
        default:
          throw new Error(`Unsupported action: ${action}`);
      }

      return { output: result, success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { output: { error: errorMessage }, success: false };
    }
  }

  /**
   * Send a message to a Slack channel
   */
  async sendMessage(params: Omit<SlackMessageParams, 'channel'> & { channel?: string }) {
    const channel = params.channel || this.defaultChannel;
    if (!channel) {
      throw new Error('No channel specified and no default channel set');
    }

    const messageParams: SlackMessageParams = {
      channel,
      ...params,
    };

    const response = await this.client.chat.postMessage(messageParams);
    return {
      ts: response.ts,
      channel: response.channel,
      message: response.message,
    };
  }

  /**
   * Upload a file to Slack
   */
  async uploadFile(params: Omit<SlackFileUploadParams, 'channel'> & { channel?: string }) {
    const channel = params.channel || this.defaultChannel;
    if (!channel) {
      throw new Error('No channel specified and no default channel set');
    }

    const fileParams: SlackFileUploadParams = {
      channel,
      ...params,
    };

    const response = await this.client.files.upload(fileParams);
    return {
      file: response.file,
    };
  }

  /**
   * List all public channels in the workspace
   */
  async listChannels(params: { types?: string; limit?: number } = {}) {
    const response = await this.client.conversations.list({
      types: params.types || 'public_channel',
      limit: params.limit || 100,
    });

    if (!response.ok) {
      throw new Error(`Failed to list channels: ${response.error}`);
    }

    return {
      channels: response.channels?.map((channel: any) => ({
        id: channel.id,
        name: channel.name,
        is_channel: channel.is_channel,
        is_private: channel.is_private,
        created: channel.created,
        creator: channel.creator,
        num_members: channel.num_members,
      })),
    };
  }

  /**
   * Get information about a specific channel
   */
  async getChannelInfo(params: { channel: string; include_num_members?: boolean }) {
    const response = await this.client.conversations.info({
      channel: params.channel,
      include_num_members: params.include_num_members,
    });

    if (!response.ok) {
      throw new Error(`Failed to get channel info: ${response.error}`);
    }

    const channel = response.channel as any;
    return {
      id: channel.id,
      name: channel.name,
      is_channel: channel.is_channel,
      is_private: channel.is_private,
      created: channel.created,
      creator: channel.creator,
      num_members: channel.num_members,
      purpose: channel.purpose,
      topic: channel.topic,
      members: channel.members,
    };
  }

  /**
   * Get message history for a channel
   */
  async getChannelHistory(params: {
    channel: string;
    latest?: string;
    oldest?: string;
    inclusive?: boolean;
    limit?: number;
  }) {
    const response = await this.client.conversations.history({
      channel: params.channel,
      latest: params.latest,
      oldest: params.oldest,
      inclusive: params.inclusive,
      limit: params.limit || 100,
    });

    if (!response.ok) {
      throw new Error(`Failed to get channel history: ${response.error}`);
    }

    return {
      messages: response.messages,
      has_more: response.has_more,
      pin_count: response.pin_count,
      response_metadata: response.response_metadata,
    };
  }
}
