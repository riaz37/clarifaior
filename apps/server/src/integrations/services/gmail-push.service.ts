import { Injectable, BadRequestException } from '@nestjs/common';
import { PubSub } from '@google-cloud/pubsub';
import { google } from 'googleapis';
import { eq, and } from 'drizzle-orm';
import { gmailWatches, agents } from 'database/src/db/schema';
import { DatabaseService } from '../../common/services/database.service';
import { LoggerService } from '../../common/services/logger.service';
import { OAuthService } from '../../auth/oauth.service';
import { ExecutionService } from '../../execution/execution.service';

export interface GmailWatchRequest {
  userId: number;
  workspaceId: number;
  agentId?: number;
  labelIds?: string[];
  query?: string;
}

export interface GmailPushNotification {
  message: {
    data: string;
    messageId: string;
    publishTime: string;
  };
  subscription: string;
}

@Injectable()
export class GmailPushService {
  private pubsub: PubSub;
  private topicName: string;
  private subscriptionName: string;

  constructor(
    private databaseService: DatabaseService,
    private logger: LoggerService,
    private oauthService: OAuthService,
    private executionService: ExecutionService,
  ) {
    this.logger.setContext('GmailPushService');
    
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    this.topicName = process.env.GMAIL_PUBSUB_TOPIC || 'gmail-notifications';
    this.subscriptionName = process.env.GMAIL_PUBSUB_SUBSCRIPTION || 'gmail-notifications-sub';

    if (projectId) {
      this.pubsub = new PubSub({ projectId });
      this.initializePubSub();
    } else {
      this.logger.warn('Google Cloud Project ID not configured - Gmail push notifications disabled');
    }
  }

  async setupGmailWatch(request: GmailWatchRequest): Promise<any> {
    const { userId, workspaceId, agentId, labelIds = ['INBOX'], query } = request;

    this.logger.log(`Setting up Gmail watch for user: ${userId}`, {
      userId,
      workspaceId,
      agentId,
      labelIds,
      query,
    });

    try {
      // Get valid OAuth token
      const token = await this.oauthService.getValidGoogleToken(userId, workspaceId);
      
      // Create Gmail client
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: token.accessToken });
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Get user profile to get email address
      const profile = await gmail.users.getProfile({ userId: 'me' });
      const emailAddress = profile.data.emailAddress;

      if (!emailAddress) {
        throw new Error('Could not get email address from Gmail profile');
      }

      // Set up Gmail watch
      const watchResponse = await gmail.users.watch({
        userId: 'me',
        requestBody: {
          labelIds,
          topicName: `projects/${process.env.GOOGLE_CLOUD_PROJECT}/topics/${this.topicName}`,
          labelFilterAction: 'include',
        },
      });

      const { historyId, expiration } = watchResponse.data;

      if (!historyId || !expiration) {
        throw new Error('Invalid watch response from Gmail API');
      }

      // Store watch configuration
      const [watch] = await this.databaseService.db
        .insert(gmailWatches)
        .values({
          userId,
          workspaceId,
          agentId,
          emailAddress,
          historyId,
          expiration: new Date(parseInt(expiration)),
          topicName: `projects/${process.env.GOOGLE_CLOUD_PROJECT}/topics/${this.topicName}`,
          labelIds,
          query,
          lastProcessedHistoryId: historyId,
        })
        .onConflictDoUpdate({
          target: [gmailWatches.userId, gmailWatches.workspaceId],
          set: {
            agentId,
            historyId,
            expiration: new Date(parseInt(expiration)),
            labelIds,
            query,
            isActive: true,
            updatedAt: new Date(),
          },
        })
        .returning();

      this.logger.log(`Gmail watch setup successful`, {
        watchId: watch.id,
        emailAddress,
        historyId,
        expiration: new Date(parseInt(expiration)).toISOString(),
      });

      return {
        watchId: watch.id,
        emailAddress,
        historyId,
        expiration: new Date(parseInt(expiration)).toISOString(),
        topicName: this.topicName,
      };

    } catch (error) {
      this.logger.error('Failed to setup Gmail watch', error.stack);
      throw new BadRequestException(`Failed to setup Gmail watch: ${error.message}`);
    }
  }

  async handlePushNotification(notification: GmailPushNotification): Promise<void> {
    try {
      const data = JSON.parse(Buffer.from(notification.message.data, 'base64').toString());
      const { emailAddress, historyId } = data;

      this.logger.log(`Received Gmail push notification`, {
        emailAddress,
        historyId,
        messageId: notification.message.messageId,
      });

      // Find active watch for this email
      const [watch] = await this.databaseService.db
        .select()
        .from(gmailWatches)
        .where(
          and(
            eq(gmailWatches.emailAddress, emailAddress),
            eq(gmailWatches.isActive, true)
          )
        )
        .limit(1);

      if (!watch) {
        this.logger.warn(`No active watch found for email: ${emailAddress}`);
        return;
      }

      // Check if we've already processed this history
      if (watch.lastProcessedHistoryId && historyId <= watch.lastProcessedHistoryId) {
        this.logger.debug(`History already processed: ${historyId}`);
        return;
      }

      // Get new messages since last processed history
      const newMessages = await this.getNewMessages(watch, historyId);

      if (newMessages.length === 0) {
        this.logger.debug(`No new messages found for history: ${historyId}`);
        return;
      }

      // Process each new message
      for (const message of newMessages) {
        await this.processNewMessage(watch, message);
      }

      // Update last processed history ID
      await this.databaseService.db
        .update(gmailWatches)
        .set({
          lastProcessedHistoryId: historyId,
          updatedAt: new Date(),
        })
        .where(eq(gmailWatches.id, watch.id));

    } catch (error) {
      this.logger.error('Failed to handle Gmail push notification', error.stack);
    }
  }

  async stopGmailWatch(userId: number, workspaceId: number): Promise<void> {
    try {
      // Get OAuth token
      const token = await this.oauthService.getValidGoogleToken(userId, workspaceId);
      
      // Create Gmail client
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: token.accessToken });
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Stop Gmail watch
      await gmail.users.stop({ userId: 'me' });

      // Deactivate watch record
      await this.databaseService.db
        .update(gmailWatches)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(gmailWatches.userId, userId),
            eq(gmailWatches.workspaceId, workspaceId)
          )
        );

      this.logger.log(`Gmail watch stopped for user: ${userId}`);

    } catch (error) {
      this.logger.error('Failed to stop Gmail watch', error.stack);
      throw new BadRequestException(`Failed to stop Gmail watch: ${error.message}`);
    }
  }

  private async getNewMessages(watch: any, currentHistoryId: string): Promise<any[]> {
    try {
      // Get OAuth token
      const token = await this.oauthService.getValidGoogleToken(watch.userId, watch.workspaceId);
      
      // Create Gmail client
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: token.accessToken });
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Get history since last processed
      const historyResponse = await gmail.users.history.list({
        userId: 'me',
        startHistoryId: watch.lastProcessedHistoryId,
        labelId: watch.labelIds,
        historyTypes: ['messageAdded'],
      });

      const history = historyResponse.data.history || [];
      const newMessages: any[] = [];

      // Extract messages from history
      for (const historyItem of history) {
        if (historyItem.messagesAdded) {
          for (const messageAdded of historyItem.messagesAdded) {
            if (messageAdded.message) {
              // Get full message details
              const messageResponse = await gmail.users.messages.get({
                userId: 'me',
                id: messageAdded.message.id!,
                format: 'full',
              });

              const message = messageResponse.data;
              
              // Apply query filter if specified
              if (watch.query && !this.messageMatchesQuery(message, watch.query)) {
                continue;
              }

              newMessages.push(message);
            }
          }
        }
      }

      return newMessages;

    } catch (error) {
      this.logger.error('Failed to get new messages', error.stack);
      return [];
    }
  }

  private async processNewMessage(watch: any, message: any): Promise<void> {
    try {
      // Parse message data
      const headers = message.payload?.headers || [];
      const getHeader = (name: string) => headers.find((h: any) => h.name === name)?.value;

      const emailData = {
        id: message.id,
        threadId: message.threadId,
        from: getHeader('From'),
        to: getHeader('To'),
        subject: getHeader('Subject'),
        date: getHeader('Date'),
        snippet: message.snippet,
        labelIds: message.labelIds,
      };

      this.logger.log(`Processing new Gmail message`, {
        messageId: message.id,
        from: emailData.from,
        subject: emailData.subject,
        agentId: watch.agentId,
      });

      // If specific agent is configured, trigger it
      if (watch.agentId) {
        await this.executionService.startExecution(
          {
            agentId: watch.agentId,
            triggerType: 'gmail',
            triggerData: {
              email: emailData,
              watch: {
                id: watch.id,
                query: watch.query,
                labelIds: watch.labelIds,
              },
            },
            context: {
              userId: watch.userId,
              workspaceId: watch.workspaceId,
              emailAddress: watch.emailAddress,
            },
          },
          watch.userId,
        );
      } else {
        // Find agents with Gmail triggers for this workspace
        const gmailAgents = await this.databaseService.db
          .select()
          .from(agents)
          .where(
            and(
              eq(agents.workspaceId, watch.workspaceId),
              eq(agents.status, 'active')
            )
          );

        // Trigger agents that have Gmail trigger nodes
        for (const agent of gmailAgents) {
          if (this.agentHasGmailTrigger(agent.flowDefinition)) {
            await this.executionService.startExecution(
              {
                agentId: agent.id,
                triggerType: 'gmail',
                triggerData: {
                  email: emailData,
                  watch: {
                    id: watch.id,
                    query: watch.query,
                    labelIds: watch.labelIds,
                  },
                },
                context: {
                  userId: watch.userId,
                  workspaceId: watch.workspaceId,
                  emailAddress: watch.emailAddress,
                },
              },
              watch.userId,
            );
          }
        }
      }

    } catch (error) {
      this.logger.error('Failed to process new message', error.stack);
    }
  }

  private messageMatchesQuery(message: any, query: string): boolean {
    // Simple query matching - in production, use Gmail's search syntax
    const searchText = `${message.snippet} ${message.payload?.headers?.map((h: any) => h.value).join(' ')}`.toLowerCase();
    return searchText.includes(query.toLowerCase());
  }

  private agentHasGmailTrigger(flowDefinition: any): boolean {
    if (!flowDefinition?.nodes) return false;
    return flowDefinition.nodes.some((node: any) => node.type === 'trigger_gmail');
  }

  private async initializePubSub(): Promise<void> {
    try {
      // Create topic if it doesn't exist
      const [topic] = await this.pubsub.topic(this.topicName).get({ autoCreate: true });
      
      // Create subscription if it doesn't exist
      const [subscription] = await topic.subscription(this.subscriptionName).get({ autoCreate: true });

      // Set up message handler
      subscription.on('message', (message) => {
        try {
          const notification: GmailPushNotification = {
            message: {
              data: message.data.toString(),
              messageId: message.id,
              publishTime: message.publishTime,
            },
            subscription: subscription.name,
          };

          this.handlePushNotification(notification);
          message.ack();
        } catch (error) {
          this.logger.error('Failed to process Pub/Sub message', error.stack);
          message.nack();
        }
      });

      this.logger.log('Gmail Pub/Sub initialized', {
        topic: this.topicName,
        subscription: this.subscriptionName,
      });

    } catch (error) {
      this.logger.error('Failed to initialize Pub/Sub', error.stack);
    }
  }
}
