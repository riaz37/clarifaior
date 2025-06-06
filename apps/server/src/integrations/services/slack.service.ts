import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { WebClient, ChatPostMessageArguments } from '@slack/web-api';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import {
  SlackMessageRequest,
  SlackMessageResponse,
  SlackChannel,
  SlackUser,
  SlackWebhookEvent,
  SlackIntegrationConfig,
  SlackWorkflowContext,
} from '@repo/shared/types';
import { BaseIntegrationService } from '../base/base-integration.service';
import {
  IntegrationError,
  IntegrationErrorCode,
} from '../base/integration-error';
import { RateLimiter } from '@common/utils/rate-limiter';
import { MetricsService } from '@common/services/metrics.service';
import { EncryptionService } from '@common/services/encryption.service';

@Injectable()
export class SlackService extends BaseIntegrationService {
  private readonly logger = new Logger(SlackService.name);
  private readonly clients = new Map<string, WebClient>();
  private readonly rateLimiter: RateLimiter;

  constructor(
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
    private readonly metricsService: MetricsService,
    private readonly encryptionService: EncryptionService,
  ) {
    super();
    this.rateLimiter = new RateLimiter({
      maxRequests: 100,
      windowMs: 60000, // 1 minute
      keyGenerator: (workspaceId: string) => `slack:${workspaceId}`,
    });
  }

  /**
   * Initialize Slack client for a workspace
   */
  async initializeClient(
    workspaceId: string,
    config: SlackIntegrationConfig,
  ): Promise<void> {
    try {
      const decryptedToken = await this.encryptionService.decrypt(
        config.botToken,
      );

      const client = new WebClient(decryptedToken, {
        retryConfig: {
          retries: 3,
          factor: 2,
        },
        logLevel:
          this.configService.get('NODE_ENV') === 'development'
            ? 'DEBUG'
            : 'ERROR',
      });

      // Test the connection
      const authTest = await client.auth.test();
      if (!authTest.ok) {
        throw new IntegrationError(
          'Slack authentication failed',
          IntegrationErrorCode.AUTHENTICATION_FAILED,
          { workspaceId, error: authTest.error },
        );
      }

      this.clients.set(workspaceId, client);

      // Cache workspace info
      await this.cacheWorkspaceInfo(workspaceId, authTest);

      this.logger.log(`Slack client initialized for workspace ${workspaceId}`);
    } catch (error) {
      this.logger.error(
        `Failed to initialize Slack client for workspace ${workspaceId}`,
        error,
      );
      throw new IntegrationError(
        'Failed to initialize Slack integration',
        IntegrationErrorCode.INITIALIZATION_FAILED,
        { workspaceId, originalError: error.message },
      );
    }
  }

  /**
   * Send message with enhanced error handling and context
   */
  async sendMessage(
    workspaceId: string,
    request: SlackMessageRequest,
    context?: SlackWorkflowContext,
  ): Promise<SlackMessageResponse> {
    const client = this.getClient(workspaceId);

    // Apply rate limiting
    await this.rateLimiter.checkLimit(workspaceId);

    const startTime = Date.now();

    try {
      const { channel, message, blocks, attachments, threadReply, metadata } =
        request;

      this.logger.debug('Sending Slack message', {
        workspaceId,
        channel,
        messageLength: message?.length || 0,
        hasBlocks: !!blocks,
        hasAttachments: !!attachments,
        isThreadReply: !!threadReply,
        workflowId: context?.workflowId,
        executionId: context?.executionId,
      });

      // Validate channel
      await this.validateChannel(client, channel);

      // Clean and prepare channel
      const cleanChannel = this.cleanChannelName(channel);

      // Build message payload
      const messagePayload: ChatPostMessageArguments = {
        channel: cleanChannel,
        ...(message && { text: message }),
        ...(blocks && { blocks }),
        ...(attachments && { attachments }),
        ...(threadReply && { thread_ts: threadReply }),
        ...(metadata && { metadata }),
        unfurl_links: true,
        unfurl_media: true,
      };

      const result = await client.chat.postMessage(messagePayload);

      if (!result.ok) {
        throw new IntegrationError(
          `Slack API error: ${result.error}`,
          this.mapSlackErrorToCode(result.error),
          { channel, error: result.error },
        );
      }

      const response: SlackMessageResponse = {
        messageId: result.ts || '',
        timestamp: result.ts ? parseFloat(result.ts) : 0,
        channel: cleanChannel,
        permalink: await this.getPermalink(
          client,
          cleanChannel,
          result.ts || '',
        ),
        threadTs: result.thread_ts,
      };

      // Track metrics
      this.metricsService.recordIntegrationMetric('slack.message.sent', {
        workspaceId,
        channel: cleanChannel,
        duration: Date.now() - startTime,
        success: true,
      });

      // Store in context for workflow tracking
      if (context) {
        await this.storeWorkflowContext(context, response);
      }

      this.logger.log('Slack message sent successfully', {
        workspaceId,
        channel: cleanChannel,
        messageId: result.ts,
        duration: Date.now() - startTime,
      });

      return response;
    } catch (error) {
      this.metricsService.recordIntegrationMetric('slack.message.failed', {
        workspaceId,
        error: error.message,
        duration: Date.now() - startTime,
      });

      if (error instanceof IntegrationError) {
        throw error;
      }

      throw new IntegrationError(
        'Failed to send Slack message',
        IntegrationErrorCode.EXECUTION_FAILED,
        {
          workspaceId,
          channel: request.channel,
          originalError: error.message,
        },
      );
    }
  }

  /**
   * Get channels with caching and pagination
   */
  async getChannels(
    workspaceId: string,
    options?: {
      types?: string;
      limit?: number;
      cursor?: string;
      includePrivate?: boolean;
    },
  ): Promise<{ channels: SlackChannel[]; nextCursor?: string }> {
    const client = this.getClient(workspaceId);
    const cacheKey = `slack:channels:${workspaceId}:${JSON.stringify(options)}`;

    // Try cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    try {
      const result = await client.conversations.list({
        types: options?.types || 'public_channel,private_channel',
        limit: options?.limit || 100,
        cursor: options?.cursor,
        exclude_archived: true,
      });

      if (!result.ok) {
        throw new IntegrationError(
          `Failed to fetch channels: ${result.error}`,
          IntegrationErrorCode.API_ERROR,
          { workspaceId, error: result.error },
        );
      }

      const channels: SlackChannel[] = (result.channels || [])
        .filter((channel) => options?.includePrivate || !channel.is_private)
        .map((channel) => ({
          id: channel.id!,
          name: channel.name!,
          isPrivate: channel.is_private || false,
          isMember: channel.is_member || false,
          topic: channel.topic?.value || '',
          purpose: channel.purpose?.value || '',
          memberCount: channel.num_members || 0,
          created: channel.created || 0,
        }));

      const response = {
        channels,
        nextCursor: result.response_metadata?.next_cursor,
      };

      // Cache for 5 minutes
      await this.redis.setex(cacheKey, 300, JSON.stringify(response));

      return response;
    } catch (error) {
      this.logger.error('Failed to get Slack channels', error);
      throw new IntegrationError(
        'Failed to fetch Slack channels',
        IntegrationErrorCode.API_ERROR,
        { workspaceId, originalError: error.message },
      );
    }
  }

  /**
   * Enhanced user info with caching
   */
  async getUserInfo(workspaceId: string, userId: string): Promise<SlackUser> {
    const client = this.getClient(workspaceId);
    const cacheKey = `slack:user:${workspaceId}:${userId}`;

    // Try cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    try {
      const result = await client.users.info({ user: userId });

      if (!result.ok) {
        throw new IntegrationError(
          `Failed to get user info: ${result.error}`,
          IntegrationErrorCode.API_ERROR,
          { workspaceId, userId, error: result.error },
        );
      }

      const user = result.user!;
      const userInfo: SlackUser = {
        id: user.id!,
        name: user.name!,
        realName: user.real_name || '',
        displayName: user.profile?.display_name || '',
        email: user.profile?.email || '',
        avatar: user.profile?.image_192 || '',
        timezone: user.tz || '',
        isBot: user.is_bot || false,
        isDeleted: user.deleted || false,
      };

      // Cache for 1 hour
      await this.redis.setex(cacheKey, 3600, JSON.stringify(userInfo));

      return userInfo;
    } catch (error) {
      this.logger.error('Failed to get Slack user info', error);
      throw new IntegrationError(
        'Failed to get user information',
        IntegrationErrorCode.API_ERROR,
        { workspaceId, userId, originalError: error.message },
      );
    }
  }

  /**
   * Send direct message with user lookup
   */
  async sendDirectMessage(
    workspaceId: string,
    userId: string,
    message: string,
    context?: SlackWorkflowContext,
  ): Promise<SlackMessageResponse> {
    const client = this.getClient(workspaceId);

    try {
      // Open DM channel
      const dmResult = await client.conversations.open({ users: userId });

      if (!dmResult.ok) {
        throw new IntegrationError(
          `Failed to open DM: ${dmResult.error}`,
          IntegrationErrorCode.API_ERROR,
          { workspaceId, userId, error: dmResult.error },
        );
      }

      const channelId = dmResult.channel?.id;
      if (!channelId) {
        throw new IntegrationError(
          'Failed to get DM channel ID',
          IntegrationErrorCode.API_ERROR,
          { workspaceId, userId },
        );
      }

      // Send message
      return await this.sendMessage(
        workspaceId,
        { channel: channelId, message },
        context,
      );
    } catch (error) {
      if (error instanceof IntegrationError) {
        throw error;
      }

      throw new IntegrationError(
        'Failed to send direct message',
        IntegrationErrorCode.EXECUTION_FAILED,
        { workspaceId, userId, originalError: error.message },
      );
    }
  }

  /**
   * Enhanced webhook handling
   */
  async handleWebhook(
    workspaceId: string,
    event: SlackWebhookEvent,
  ): Promise<void> {
    try {
      this.logger.debug('Processing Slack webhook', {
        workspaceId,
        eventType: event.type,
        eventId: event.event_id,
      });

      // Verify event signature
      await this.verifyWebhookSignature(event);

      // Handle different event types
      switch (event.type) {
        case 'message':
          await this.handleMessageEvent(workspaceId, event);
          break;
        case 'app_mention':
          await this.handleMentionEvent(workspaceId, event);
          break;
        case 'reaction_added':
          await this.handleReactionEvent(workspaceId, event);
          break;
        default:
          this.logger.debug(`Unhandled Slack event type: ${event.type}`);
      }

      // Track webhook metrics
      this.metricsService.recordIntegrationMetric('slack.webhook.processed', {
        workspaceId,
        eventType: event.type,
      });
    } catch (error) {
      this.logger.error('Failed to process Slack webhook', error);
      throw new IntegrationError(
        'Failed to process webhook',
        IntegrationErrorCode.WEBHOOK_PROCESSING_FAILED,
        { workspaceId, eventType: event.type, originalError: error.message },
      );
    }
  }

  /**
   * Test connection with detailed diagnostics
   */
  async testConnection(workspaceId: string): Promise<{
    success: boolean;
    details: {
      auth: boolean;
      channels: boolean;
      users: boolean;
      permissions: string[];
    };
    error?: string;
  }> {
    const client = this.getClient(workspaceId);

    const details = {
      auth: false,
      channels: false,
      users: false,
      permissions: [] as string[],
    };

    try {
      // Test authentication
      const authResult = await client.auth.test();
      details.auth = authResult.ok || false;

      if (authResult.ok) {
        // Test channel access
        try {
          await client.conversations.list({ limit: 1 });
          details.channels = true;
        } catch (error) {
          this.logger.warn('Channels access test failed', error);
        }

        // Test user access
        try {
          await client.users.list({ limit: 1 });
          details.users = true;
        } catch (error) {
          this.logger.warn('Users access test failed', error);
        }

        // Get bot permissions
        if (authResult.response_metadata?.scopes) {
          details.permissions = authResult.response_metadata.scopes;
        }
      }

      const success = details.auth && details.channels;

      this.logger.log('Slack connection test completed', {
        workspaceId,
        success,
        details,
      });

      return { success, details };
    } catch (error) {
      this.logger.error('Slack connection test failed', error);
      return {
        success: false,
        details,
        error: error.message,
      };
    }
  }

  // Private helper methods
  private getClient(workspaceId: string): WebClient {
    const client = this.clients.get(workspaceId);
    if (!client) {
      throw new IntegrationError(
        'Slack client not initialized',
        IntegrationErrorCode.NOT_INITIALIZED,
        { workspaceId },
      );
    }
    return client;
  }

  private cleanChannelName(channel: string): string {
    return channel.startsWith('#') ? channel.slice(1) : channel;
  }

  private async validateChannel(
    client: WebClient,
    channel: string,
  ): Promise<void> {
    const cleanChannel = this.cleanChannelName(channel);

    try {
      const result = await client.conversations.info({ channel: cleanChannel });

      if (!result.ok) {
        if (result.error === 'channel_not_found') {
          throw new IntegrationError(
            `Channel '${channel}' not found`,
            IntegrationErrorCode.RESOURCE_NOT_FOUND,
            { channel },
          );
        }
        throw new IntegrationError(
          `Channel validation failed: ${result.error}`,
          IntegrationErrorCode.VALIDATION_FAILED,
          { channel, error: result.error },
        );
      }
    } catch (error) {
      if (error instanceof IntegrationError) {
        throw error;
      }
      // If we can't validate, log but don't fail
      this.logger.warn('Channel validation failed', {
        channel,
        error: error.message,
      });
    }
  }

  private async getPermalink(
    client: WebClient,
    channel: string,
    messageTs: string,
  ): Promise<string> {
    try {
      const result = await client.chat.getPermalink({
        channel,
        message_ts: messageTs,
      });

      return result.ok ? result.permalink || '' : '';
    } catch (error) {
      this.logger.warn('Failed to get permalink', {
        channel,
        messageTs,
        error: error.message,
      });
      return '';
    }
  }

  private mapSlackErrorToCode(slackError?: string): IntegrationErrorCode {
    switch (slackError) {
      case 'channel_not_found':
        return IntegrationErrorCode.RESOURCE_NOT_FOUND;
      case 'not_in_channel':
        return IntegrationErrorCode.PERMISSION_DENIED;
      case 'invalid_auth':
        return IntegrationErrorCode.AUTHENTICATION_FAILED;
      case 'rate_limited':
        return IntegrationErrorCode.RATE_LIMITED;
      default:
        return IntegrationErrorCode.API_ERROR;
    }
  }

  private async cacheWorkspaceInfo(
    workspaceId: string,
    authInfo: any,
  ): Promise<void> {
    const info = {
      teamId: authInfo.team_id,
      teamName: authInfo.team,
      userId: authInfo.user_id,
      botId: authInfo.bot_id,
      scopes: authInfo.response_metadata?.scopes || [],
      cached: Date.now(),
    };

    await this.redis.setex(
      `slack:workspace:${workspaceId}`,
      3600,
      JSON.stringify(info),
    );
  }

  private async storeWorkflowContext(
    context: SlackWorkflowContext,
    response: SlackMessageResponse,
  ): Promise<void> {
    const contextData = {
      ...context,
      slackResponse: response,
      timestamp: Date.now(),
    };

    await this.redis.setex(
      `workflow:slack:${context.workflowId}:${context.executionId}`,
      3600,
      JSON.stringify(contextData),
    );
  }

  private async verifyWebhookSignature(
    event: SlackWebhookEvent,
  ): Promise<void> {
    // Implement Slack webhook signature verification
    // This is crucial for security
  }

  private async handleMessageEvent(
    workspaceId: string,
    event: SlackWebhookEvent,
  ): Promise<void> {
    // Handle message events for workflow triggers
  }

  private async handleMentionEvent(
    workspaceId: string,
    event: SlackWebhookEvent,
  ): Promise<void> {
    // Handle app mentions for workflow triggers
  }

  private async handleReactionEvent(
    workspaceId: string,
    event: SlackWebhookEvent,
  ): Promise<void> {
    // Handle reaction events for workflow triggers
  }
}
