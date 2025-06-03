import { Injectable, BadRequestException } from '@nestjs/common';
import { WebClient } from '@slack/web-api';
import { LoggerService } from '@common/services/logger.service';
import { SlackMessageRequest, SlackMessageResponse } from '@repo/types';

@Injectable()
export class SlackService {
  private client: WebClient;

  constructor(private logger: LoggerService) {
    this.logger.setContext('SlackService');

    const botToken = process.env.SLACK_BOT_TOKEN;
    if (!botToken) {
      this.logger.warn('Slack bot token not configured');
      return;
    }

    this.client = new WebClient(botToken);
  }

  async sendMessage(
    request: SlackMessageRequest,
  ): Promise<SlackMessageResponse> {
    if (!this.client) {
      throw new BadRequestException('Slack integration not configured');
    }

    const { channel, message, threadReply } = request;

    this.logger.log(`Sending Slack message`, {
      channel,
      messageLength: message.length,
      threadReply,
    });

    try {
      // Clean channel name (remove # if present)
      const cleanChannel = channel.startsWith('#') ? channel.slice(1) : channel;

      // Prepare message options
      const messageOptions: any = {
        channel: cleanChannel,
        text: message,
        attachments: [],
        as_user: true,
      };

      // Add thread_ts if this is a thread reply
      if (threadReply) {
        messageOptions.thread_ts = threadReply;
      }

      const result = await this.client.chat.postMessage(messageOptions);

      if (!result.ok) {
        throw new Error(`Slack API error: ${result.error}`);
      }

      this.logger.log('Slack message sent successfully', {
        channel: cleanChannel,
        messageId: result.ts,
        messageLength: message.length,
      });

      // Convert timestamp string to number (e.g., '1234567890.123456' -> 1234567890.123456)
      const timestamp = result.ts ? parseFloat(result.ts) : 0;
      return {
        messageId: result.ts || '',
        timestamp,
        channel: cleanChannel,
        permalink: '', // We can't get permalink directly from the response
      };
    } catch (error) {
      this.logger.error(`Slack message failed`, error.stack, {
        channel,
        messageLength: message.length,
        error: error.message,
      });

      if (error.data?.error === 'channel_not_found') {
        throw new BadRequestException(`Slack channel '${channel}' not found`);
      } else if (error.data?.error === 'not_in_channel') {
        throw new BadRequestException(
          `Bot is not a member of channel '${channel}'`,
        );
      } else if (error.data?.error === 'invalid_auth') {
        throw new BadRequestException('Invalid Slack bot token');
      }

      throw new BadRequestException(`Slack message failed: ${error.message}`);
    }
  }

  async getChannels(): Promise<any[]> {
    if (!this.client) {
      throw new BadRequestException('Slack integration not configured');
    }

    try {
      const result = await this.client.conversations.list({
        types: 'public_channel,private_channel',
        limit: 100,
      });

      if (!result.ok) {
        throw new Error(`Slack API error: ${result.error}`);
      }

      return (
        result.channels?.map((channel) => ({
          id: channel.id,
          name: channel.name,
          isPrivate: channel.is_private,
          isMember: channel.is_member,
        })) || []
      );
    } catch (error) {
      this.logger.error('Failed to get Slack channels', error.stack);
      throw new BadRequestException(
        `Failed to get Slack channels: ${error.message}`,
      );
    }
  }

  async getUserInfo(userId: string): Promise<any> {
    if (!this.client) {
      throw new BadRequestException('Slack integration not configured');
    }

    try {
      const result = await this.client.users.info({
        user: userId,
      });

      if (!result.ok) {
        throw new Error(`Slack API error: ${result.error}`);
      }

      const user = result.user;
      return {
        id: user?.id,
        name: user?.name,
        realName: user?.real_name,
        email: user?.profile?.email,
        avatar: user?.profile?.image_72,
      };
    } catch (error) {
      this.logger.error('Failed to get Slack user info', error.stack);
      throw new BadRequestException(
        `Failed to get Slack user info: ${error.message}`,
      );
    }
  }

  async sendDirectMessage(userId: string, message: string): Promise<any> {
    if (!this.client) {
      throw new BadRequestException('Slack integration not configured');
    }

    try {
      // Open a direct message channel
      const dmResult = await this.client.conversations.open({
        users: userId,
      });

      if (!dmResult.ok) {
        throw new Error(`Failed to open DM: ${dmResult.error}`);
      }

      const channelId = dmResult.channel?.id;
      if (!channelId) {
        throw new Error('Failed to get DM channel ID');
      }

      // Send message to the DM channel
      return await this.sendMessage({
        channel: channelId,
        message,
      });
    } catch (error) {
      this.logger.error('Failed to send Slack DM', error.stack);
      throw new BadRequestException(
        `Failed to send Slack DM: ${error.message}`,
      );
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      const result = await this.client.auth.test();

      if (result.ok) {
        this.logger.log('Slack connection test successful', {
          teamId: result.team_id,
          userId: result.user_id,
          botId: result.bot_id,
        });
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('Slack connection test failed', error.stack);
      return false;
    }
  }

  async createWebhook(channel: string, callbackUrl: string): Promise<any> {
    // Note: Slack webhooks are typically set up through the Slack app configuration
    // This is a placeholder for webhook management
    this.logger.log('Slack webhook creation requested', {
      channel,
      callbackUrl,
    });

    return {
      webhookUrl: `${callbackUrl}/webhooks/slack`,
      instructions: 'Configure this URL in your Slack app Event Subscriptions',
    };
  }
}
