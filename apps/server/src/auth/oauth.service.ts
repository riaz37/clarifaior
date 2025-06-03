import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { google } from 'googleapis';
import { oauthTokens, integrationConnections } from 'database/src/db/schema';
import { DatabaseService } from '../common/services/database.service';
import { LoggerService } from '../common/services/logger.service';
import { EncryptionService } from '../common/services/encryption.service';

export interface OAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
  tokenType?: string;
}

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

@Injectable()
export class OAuthService {
  constructor(
    private databaseService: DatabaseService,
    private logger: LoggerService,
    private encryptionService: EncryptionService,
  ) {
    this.logger.setContext('OAuthService');
  }

  async getGoogleAuthUrl(
    userId: number,
    workspaceId: number,
    state?: string,
  ): Promise<string> {
    const oauth2Client = this.createGoogleOAuthClient();

    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force consent to get refresh token
      state: JSON.stringify({
        userId,
        workspaceId,
        provider: 'google',
        ...(state && { state }),
      }),
    });

    this.logger.log(`Generated Google OAuth URL for user: ${userId}`);
    return authUrl;
  }

  async handleGoogleCallback(code: string, state: string): Promise<any> {
    try {
      const stateData = JSON.parse(state);
      const { userId, workspaceId } = stateData;

      const oauth2Client = this.createGoogleOAuthClient();
      const { tokens } = await oauth2Client.getToken(code);

      if (!tokens.access_token) {
        throw new BadRequestException('No access token received from Google');
      }

      // Get user info
      oauth2Client.setCredentials(tokens);
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();

      // Store encrypted tokens
      const encryptedAccessToken = this.encryptionService.encrypt(
        tokens.access_token,
      );
      const encryptedRefreshToken = tokens.refresh_token
        ? this.encryptionService.encrypt(tokens.refresh_token)
        : null;

      // Upsert OAuth token
      await this.databaseService.db
        .insert(oauthTokens)
        .values({
          userId,
          workspaceId,
          provider: 'google',
          providerAccountId: userInfo.data.id,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          scope: tokens.scope,
          expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          metadata: {
            email: userInfo.data.email,
            name: userInfo.data.name,
            picture: userInfo.data.picture,
          },
        })
        .onConflictDoUpdate({
          target: [
            oauthTokens.userId,
            oauthTokens.workspaceId,
            oauthTokens.provider,
          ],
          set: {
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            scope: tokens.scope,
            expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
            isActive: true,
            updatedAt: new Date(),
          },
        });

      // Create integration connection
      await this.databaseService.db
        .insert(integrationConnections)
        .values({
          userId,
          workspaceId,
          provider: 'google',
          connectionName: `Gmail - ${userInfo.data.email}`,
          config: {
            email: userInfo.data.email,
            name: userInfo.data.name,
          },
        })
        .onConflictDoUpdate({
          target: [
            integrationConnections.userId,
            integrationConnections.workspaceId,
            integrationConnections.provider,
          ],
          set: {
            connectionName: `Gmail - ${userInfo.data.email}`,
            isActive: true,
            lastUsed: new Date(),
            updatedAt: new Date(),
          },
        });

      this.logger.log(`Google OAuth completed for user: ${userId}`, {
        email: userInfo.data.email,
        hasRefreshToken: !!tokens.refresh_token,
      });

      return {
        success: true,
        email: userInfo.data.email,
        name: userInfo.data.name,
        hasRefreshToken: !!tokens.refresh_token,
      };
    } catch (error) {
      this.logger.error('Google OAuth callback failed', error.stack);
      throw new BadRequestException(`OAuth callback failed: ${error.message}`);
    }
  }

  async getValidGoogleToken(
    userId: number,
    workspaceId: number,
  ): Promise<OAuthToken> {
    const [tokenRecord] = await this.databaseService.db
      .select()
      .from(oauthTokens)
      .where(
        and(
          eq(oauthTokens.userId, userId),
          eq(oauthTokens.workspaceId, workspaceId),
          eq(oauthTokens.provider, 'google'),
          eq(oauthTokens.isActive, true),
        ),
      )
      .limit(1);

    if (!tokenRecord) {
      throw new NotFoundException(
        'No Google OAuth token found. Please reconnect your Google account.',
      );
    }

    const accessToken = this.encryptionService.decrypt(tokenRecord.accessToken);
    const refreshToken = tokenRecord.refreshToken
      ? this.encryptionService.decrypt(tokenRecord.refreshToken)
      : null;

    // Check if token is expired
    const now = new Date();
    const isExpired = tokenRecord.expiresAt && tokenRecord.expiresAt <= now;

    if (isExpired && refreshToken) {
      // Refresh the token
      return this.refreshGoogleToken(userId, workspaceId, refreshToken);
    } else if (isExpired && !refreshToken) {
      throw new BadRequestException(
        'Google token expired and no refresh token available. Please reconnect your Google account.',
      );
    }

    return {
      accessToken,
      refreshToken,
      expiresAt: tokenRecord.expiresAt,
      scope: tokenRecord.scope,
      tokenType: tokenRecord.tokenType,
    };
  }

  async refreshGoogleToken(
    userId: number,
    workspaceId: number,
    refreshToken: string,
  ): Promise<OAuthToken> {
    try {
      const oauth2Client = this.createGoogleOAuthClient();
      oauth2Client.setCredentials({ refresh_token: refreshToken });

      const { credentials } = await oauth2Client.refreshAccessToken();

      if (!credentials.access_token) {
        throw new Error('No access token received from refresh');
      }

      // Update stored token
      const encryptedAccessToken = this.encryptionService.encrypt(
        credentials.access_token,
      );
      const encryptedRefreshToken = credentials.refresh_token
        ? this.encryptionService.encrypt(credentials.refresh_token)
        : null;

      await this.databaseService.db
        .update(oauthTokens)
        .set({
          accessToken: encryptedAccessToken,
          ...(encryptedRefreshToken && { refreshToken: encryptedRefreshToken }),
          expiresAt: credentials.expiry_date
            ? new Date(credentials.expiry_date)
            : null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(oauthTokens.userId, userId),
            eq(oauthTokens.workspaceId, workspaceId),
            eq(oauthTokens.provider, 'google'),
          ),
        );

      this.logger.log(`Google token refreshed for user: ${userId}`);

      return {
        accessToken: credentials.access_token,
        refreshToken: credentials.refresh_token || refreshToken,
        expiresAt: credentials.expiry_date
          ? new Date(credentials.expiry_date)
          : null,
        scope: credentials.scope,
        tokenType: 'Bearer',
      };
    } catch (error) {
      this.logger.error('Failed to refresh Google token', error.stack);
      throw new BadRequestException(
        `Failed to refresh token: ${error.message}`,
      );
    }
  }

  async revokeGoogleToken(userId: number, workspaceId: number): Promise<void> {
    try {
      const tokenRecord = await this.getValidGoogleToken(userId, workspaceId);

      // Revoke token with Google
      const oauth2Client = this.createGoogleOAuthClient();
      await oauth2Client.revokeToken(tokenRecord.accessToken);

      // Deactivate stored token
      await this.databaseService.db
        .update(oauthTokens)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(oauthTokens.userId, userId),
            eq(oauthTokens.workspaceId, workspaceId),
            eq(oauthTokens.provider, 'google'),
          ),
        );

      // Deactivate integration connection
      await this.databaseService.db
        .update(integrationConnections)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(integrationConnections.userId, userId),
            eq(integrationConnections.workspaceId, workspaceId),
            eq(integrationConnections.provider, 'google'),
          ),
        );

      this.logger.log(`Google token revoked for user: ${userId}`);
    } catch (error) {
      this.logger.error('Failed to revoke Google token', error.stack);
      throw new BadRequestException(`Failed to revoke token: ${error.message}`);
    }
  }

  async getUserConnections(
    userId: number,
    workspaceId: number,
  ): Promise<any[]> {
    const connections = await this.databaseService.db
      .select()
      .from(integrationConnections)
      .where(
        and(
          eq(integrationConnections.userId, userId),
          eq(integrationConnections.workspaceId, workspaceId),
          eq(integrationConnections.isActive, true),
        ),
      );

    return connections.map((conn) => ({
      id: conn.id,
      provider: conn.provider,
      connectionName: conn.connectionName,
      config: conn.config,
      lastUsed: conn.lastUsed?.toISOString(),
      createdAt: conn.createdAt?.toISOString(),
    }));
  }

  private createGoogleOAuthClient() {
    const clientId = process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;
    const redirectUri =
      process.env.GMAIL_REDIRECT_URI ||
      `${process.env.WEBHOOK_BASE_URL}/auth/google/callback`;

    if (!clientId || !clientSecret) {
      throw new BadRequestException('Google OAuth not configured');
    }

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }
}
