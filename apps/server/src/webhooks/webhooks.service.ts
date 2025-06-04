import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import * as crypto from 'crypto';
import { webhooks, webhookLogs, agents } from '@repo/database';
import { DatabaseService } from '@common/services/database.service';
import { LoggerService } from '@common/services/logger.service';
import { ExecutionService } from '@execution/execution.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { WebhookTriggerData } from './interface/webhook';

@Injectable()
export class WebhooksService {
  constructor(
    private databaseService: DatabaseService,
    private logger: LoggerService,
    private executionService: ExecutionService,
  ) {
    this.logger.setContext('WebhooksService');
  }

  async createWebhook(
    createWebhookDto: CreateWebhookDto,
    userId: string,
  ): Promise<any> {
    const { agentId, config } = createWebhookDto;

    this.logger.log(`Creating webhook for agent: ${agentId}`, {
      userId,
      agentId,
      name,
    });

    // Verify agent exists
    const [agent] = await this.databaseService.db
      .select()
      .from(agents)
      .where(eq(agents.id, agentId))
      .limit(1);

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    // Generate unique endpoint and secret
    const endpoint = this.generateEndpoint();
    const secret = this.generateSecret();

    const [webhook] = await this.databaseService.db
      .insert(webhooks)
      .values({
        agentId,
        createdBy: userId,
        name: createWebhookDto.name || '',
        endpoint,
        secret,
        config,
      })
      .returning();

    this.logger.log(`Webhook created: ${webhook.id}`, {
      webhookId: webhook.id,
      endpoint,
      agentId,
    });

    return {
      id: webhook.id,
      name: webhook.name,
      endpoint: webhook.endpoint,
      url: `${process.env.WEBHOOK_BASE_URL || 'http://localhost:3001'}/webhooks/${webhook.endpoint}`,
      secret: webhook.secret,
      status: webhook.status,
      agentId: webhook.agentId,
      createdAt: webhook.createdAt?.toISOString(),
    };
  }

  async getWebhooks(agentId: string): Promise<any[]> {
    const webhookList = await this.databaseService.db
      .select()
      .from(webhooks)
      .where(eq(webhooks.agentId, agentId))
      .orderBy(desc(webhooks.createdAt));

    return webhookList.map((webhook) => ({
      id: webhook.id,
      name: webhook.name,
      endpoint: webhook.endpoint,
      url: `${process.env.WEBHOOK_BASE_URL || 'http://localhost:3001'}/webhooks/${webhook.endpoint}`,
      status: webhook.status,
      lastTriggered: webhook.lastTriggered?.toISOString(),
      triggerCount: webhook.triggerCount,
      createdAt: webhook.createdAt?.toISOString(),
    }));
  }

  async getWebhook(webhookId: string): Promise<any> {
    const [webhook] = await this.databaseService.db
      .select()
      .from(webhooks)
      .where(eq(webhooks.id, webhookId))
      .limit(1);

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    return {
      id: webhook.id,
      name: webhook.name,
      endpoint: webhook.endpoint,
      url: `${process.env.WEBHOOK_BASE_URL || 'http://localhost:3001'}/webhooks/${webhook.endpoint}`,
      secret: webhook.secret,
      status: webhook.status,
      agentId: webhook.agentId,
      lastTriggered: webhook.lastTriggered?.toISOString(),
      triggerCount: webhook.triggerCount,
      config: webhook.config,
      createdAt: webhook.createdAt?.toISOString(),
    };
  }

  async deleteWebhook(webhookId: string, userId: string): Promise<void> {
    this.logger.log(`Deleting webhook: ${webhookId}`, { userId, webhookId });

    const result = await this.databaseService.db
      .delete(webhooks)
      .where(and(eq(webhooks.id, webhookId), eq(webhooks.createdBy, userId)))
      .returning();

    if (result.length === 0) {
      throw new NotFoundException('Webhook not found or access denied');
    }
  }

  async triggerWebhook(
    endpoint: string,
    triggerData: WebhookTriggerData,
  ): Promise<any> {
    const startTime = Date.now();
    let executionId: string | undefined;
    let success = false;
    let error: string | undefined;

    try {
      // Find webhook by endpoint
      const [webhook] = await this.databaseService.db
        .select()
        .from(webhooks)
        .where(eq(webhooks.endpoint, endpoint))
        .limit(1);

      if (!webhook) {
        throw new NotFoundException('Webhook not found');
      }

      if (webhook.status !== 'active') {
        throw new BadRequestException('Webhook is not active');
      }

      // Validate webhook signature if provided
      if (triggerData.headers['x-webhook-signature']) {
        const isValid = this.validateSignature(
          triggerData.body,
          triggerData.headers['x-webhook-signature'],
          webhook.secret,
        );

        if (!isValid) {
          throw new BadRequestException('Invalid webhook signature');
        }
      }

      this.logger.log(`Webhook triggered: ${webhook.id}`, {
        webhookId: webhook.id,
        endpoint,
        method: triggerData.method,
        agentId: webhook.agentId,
      });

      // Start agent execution
      const execution = await this.executionService.startExecution(
        {
          agentId: webhook.agentId,
          triggerType: 'webhook',
          triggerData: {
            webhook: {
              id: webhook.id,
              endpoint,
              method: triggerData.method,
              headers: triggerData.headers,
              body: triggerData.body,
              query: triggerData.query,
            },
            request: {
              ipAddress: triggerData.ipAddress,
              userAgent: triggerData.userAgent,
            },
          },
        },
        webhook.createdBy.toString(),
      );

      executionId = String(execution.id);
      success = true;

      // Update webhook stats
      await this.databaseService.db
        .update(webhooks)
        .set({
          lastTriggered: new Date(),
          triggerCount: (webhook.triggerCount || 0) + 1,
        })
        .where(eq(webhooks.id, webhook.id));

      return {
        success: true,
        executionId: execution.id,
        message: 'Webhook triggered successfully',
      };
    } catch (err) {
      error = err.message;
      this.logger.error(`Webhook trigger failed: ${endpoint}`, err.stack, {
        endpoint,
        error: err.message,
      });

      throw err;
    } finally {
      // Log webhook trigger
      await this.logWebhookTrigger(
        endpoint,
        triggerData,
        success,
        executionId?.toString(),
        error,
        Date.now() - startTime,
      );
    }
  }

  private async logWebhookTrigger(
    endpoint: string,
    triggerData: WebhookTriggerData,
    success: boolean,
    executionId?: string,
    error?: string,
    responseTime?: number,
  ): Promise<void> {
    try {
      const [webhook] = await this.databaseService.db
        .select()
        .from(webhooks)
        .where(eq(webhooks.endpoint, endpoint))
        .limit(1);

      if (webhook) {
        await this.databaseService.db.insert(webhookLogs).values({
          webhookId: webhook.id,
          method: triggerData.method,
          headers: triggerData.headers,
          body: triggerData.body,
          query: triggerData.query,
          ipAddress: triggerData.ipAddress,
          userAgent: triggerData.userAgent,
          success,
          executionId,
          error,
          responseTime,
        });
      }
    } catch (logError) {
      this.logger.error('Failed to log webhook trigger', logError.stack);
    }
  }

  async getWebhookLogs(webhookId: string, limit: number = 50): Promise<any[]> {
    const logs = await this.databaseService.db
      .select()
      .from(webhookLogs)
      .where(eq(webhookLogs.webhookId, webhookId))
      .orderBy(desc(webhookLogs.createdAt))
      .limit(limit);

    return logs.map((log) => ({
      id: log.id,
      method: log.method,
      success: log.success,
      executionId: log.executionId,
      error: log.error,
      responseTime: log.responseTime,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt?.toISOString(),
    }));
  }

  private generateEndpoint(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private validateSignature(
    body: any,
    signature: string,
    secret: string,
  ): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(body))
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(`sha256=${expectedSignature}`),
    );
  }
}
