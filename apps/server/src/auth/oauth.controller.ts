import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Param,
  Body,
  UseGuards,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { OAuthService } from './oauth.service';
import { GmailPushService } from '../integrations/services/gmail-push.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RbacGuard } from './guards/rbac.guard';
import { RequirePermissions } from './decorators/permissions.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { Permission } from './rbac/permissions';
import { ResponseUtil } from '../common/utils/response.util';
import { LoggerService } from '../common/services/logger.service';

@Controller('auth')
export class OAuthController {
  constructor(
    private readonly oauthService: OAuthService,
    private readonly gmailPushService: GmailPushService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('OAuthController');
  }

  @Get('google')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermissions(Permission.INTEGRATION_CREATE)
  async initiateGoogleOAuth(
    @Query('workspaceId') workspaceId: string,
    @Query('state') state: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    this.logger.log(`Initiating Google OAuth for user: ${user.id}`, {
      userId: user.id,
      workspaceId: +workspaceId,
    });

    const authUrl = await this.oauthService.getGoogleAuthUrl(
      user.id,
      +workspaceId,
      state,
    );

    res.redirect(authUrl);
  }

  @Get('google/callback')
  @Public()
  async handleGoogleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    if (error) {
      this.logger.error(`Google OAuth error: ${error}`);
      return res.redirect(`${process.env.CORS_ORIGIN}/integrations?error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      this.logger.error('Missing code or state in Google OAuth callback');
      return res.redirect(`${process.env.CORS_ORIGIN}/integrations?error=missing_parameters`);
    }

    try {
      const result = await this.oauthService.handleGoogleCallback(code, state);
      
      this.logger.log('Google OAuth callback successful', {
        email: result.email,
        hasRefreshToken: result.hasRefreshToken,
      });

      // Redirect to frontend with success
      const params = new URLSearchParams({
        success: 'true',
        provider: 'google',
        email: result.email,
        name: result.name,
      });

      res.redirect(`${process.env.CORS_ORIGIN}/integrations?${params.toString()}`);

    } catch (error) {
      this.logger.error('Google OAuth callback failed', error.stack);
      res.redirect(`${process.env.CORS_ORIGIN}/integrations?error=${encodeURIComponent(error.message)}`);
    }
  }

  @Get('connections')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermissions(Permission.INTEGRATION_READ)
  async getUserConnections(
    @Query('workspaceId') workspaceId: string,
    @CurrentUser() user: any,
  ) {
    const connections = await this.oauthService.getUserConnections(user.id, +workspaceId);
    return ResponseUtil.success(connections);
  }

  @Delete('google/revoke')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermissions(Permission.INTEGRATION_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeGoogleToken(
    @Query('workspaceId') workspaceId: string,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Revoking Google token for user: ${user.id}`, {
      userId: user.id,
      workspaceId: +workspaceId,
    });

    await this.oauthService.revokeGoogleToken(user.id, +workspaceId);
    return ResponseUtil.deleted('Google connection revoked successfully');
  }

  @Post('gmail/watch')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermissions(Permission.INTEGRATION_CREATE)
  async setupGmailWatch(
    @Body() body: {
      workspaceId: number;
      agentId?: number;
      labelIds?: string[];
      query?: string;
    },
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Setting up Gmail watch for user: ${user.id}`, {
      userId: user.id,
      workspaceId: body.workspaceId,
      agentId: body.agentId,
    });

    const watch = await this.gmailPushService.setupGmailWatch({
      userId: user.id,
      workspaceId: body.workspaceId,
      agentId: body.agentId,
      labelIds: body.labelIds,
      query: body.query,
    });

    return ResponseUtil.created(watch, 'Gmail watch setup successfully');
  }

  @Delete('gmail/watch')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermissions(Permission.INTEGRATION_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async stopGmailWatch(
    @Query('workspaceId') workspaceId: string,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Stopping Gmail watch for user: ${user.id}`, {
      userId: user.id,
      workspaceId: +workspaceId,
    });

    await this.gmailPushService.stopGmailWatch(user.id, +workspaceId);
    return ResponseUtil.deleted('Gmail watch stopped successfully');
  }

  @Post('gmail/webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  async handleGmailWebhook(@Body() notification: any) {
    this.logger.log('Received Gmail webhook notification', {
      messageId: notification.message?.messageId,
      subscription: notification.subscription,
    });

    try {
      await this.gmailPushService.handlePushNotification(notification);
      return { success: true };
    } catch (error) {
      this.logger.error('Failed to handle Gmail webhook', error.stack);
      return { success: false, error: error.message };
    }
  }

  @Get('test/gmail-token')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermissions(Permission.INTEGRATION_READ)
  async testGmailToken(
    @Query('workspaceId') workspaceId: string,
    @CurrentUser() user: any,
  ) {
    try {
      const token = await this.oauthService.getValidGoogleToken(user.id, +workspaceId);
      
      return ResponseUtil.success({
        hasToken: true,
        expiresAt: token.expiresAt?.toISOString(),
        scope: token.scope,
        hasRefreshToken: !!token.refreshToken,
      });
    } catch (error) {
      return ResponseUtil.success({
        hasToken: false,
        error: error.message,
      });
    }
  }
}
