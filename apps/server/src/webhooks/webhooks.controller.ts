import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  All,
} from '@nestjs/common';
import { Request } from 'express';
import { WebhooksService, CreateWebhookDto } from './webhooks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Permission } from '../auth/rbac/permissions';
import { ResponseUtil } from '../common/utils/response.util';
import { LoggerService } from '../common/services/logger.service';

@Controller()
export class WebhooksController {
  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('WebhooksController');
  }

  // Protected webhook management endpoints
  @Post('agents/:agentId/webhooks')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermissions(Permission.AGENT_UPDATE)
  @HttpCode(HttpStatus.CREATED)
  async createWebhook(
    @Param('agentId') agentId: string,
    @Body() createWebhookDto: Omit<CreateWebhookDto, 'agentId'>,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Creating webhook for agent: ${agentId}`, {
      userId: user.id,
      agentId: +agentId,
    });

    const webhook = await this.webhooksService.createWebhook(
      { ...createWebhookDto, agentId: +agentId },
      user.id,
    );

    return ResponseUtil.created(webhook, 'Webhook created successfully');
  }

  @Get('agents/:agentId/webhooks')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermissions(Permission.AGENT_READ)
  async getWebhooks(@Param('agentId') agentId: string) {
    const webhooks = await this.webhooksService.getWebhooks(+agentId);
    return ResponseUtil.success(webhooks);
  }

  @Get('webhooks/:webhookId')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermissions(Permission.AGENT_READ)
  async getWebhook(@Param('webhookId') webhookId: string) {
    const webhook = await this.webhooksService.getWebhook(+webhookId);
    return ResponseUtil.success(webhook);
  }

  @Delete('webhooks/:webhookId')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermissions(Permission.AGENT_UPDATE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteWebhook(
    @Param('webhookId') webhookId: string,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Deleting webhook: ${webhookId}`, {
      userId: user.id,
      webhookId: +webhookId,
    });

    await this.webhooksService.deleteWebhook(+webhookId, user.id);
    return ResponseUtil.deleted('Webhook deleted successfully');
  }

  @Get('webhooks/:webhookId/logs')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermissions(Permission.AGENT_READ)
  async getWebhookLogs(
    @Param('webhookId') webhookId: string,
    @Query('limit') limit?: string,
  ) {
    const logs = await this.webhooksService.getWebhookLogs(
      +webhookId,
      limit ? +limit : 50,
    );
    return ResponseUtil.success(logs);
  }

  // Public webhook trigger endpoint
  @All('webhooks/:endpoint')
  @Public()
  @HttpCode(HttpStatus.OK)
  async triggerWebhook(
    @Param('endpoint') endpoint: string,
    @Req() req: Request,
  ) {
    const triggerData = {
      method: req.method,
      headers: req.headers as Record<string, string>,
      body: req.body,
      query: req.query as Record<string, any>,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
    };

    this.logger.log(`Webhook triggered: ${endpoint}`, {
      method: req.method,
      endpoint,
      ipAddress: triggerData.ipAddress,
    });

    const result = await this.webhooksService.triggerWebhook(endpoint, triggerData);
    return result;
  }

  // Webhook testing endpoint
  @Post('webhooks/:webhookId/test')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermissions(Permission.AGENT_EXECUTE)
  async testWebhook(
    @Param('webhookId') webhookId: string,
    @Body() testData: any,
    @Req() req: Request,
  ) {
    const webhook = await this.webhooksService.getWebhook(+webhookId);
    
    const triggerData = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: testData,
      query: {},
      ipAddress: req.ip,
      userAgent: 'Clarifaior-Test',
    };

    this.logger.log(`Testing webhook: ${webhookId}`, {
      webhookId: +webhookId,
      endpoint: webhook.endpoint,
    });

    const result = await this.webhooksService.triggerWebhook(webhook.endpoint, triggerData);
    return ResponseUtil.success(result, 'Webhook test completed');
  }
}
