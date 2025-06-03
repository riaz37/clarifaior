import { Injectable, BadRequestException } from '@nestjs/common';
import { google } from 'googleapis';
import { LoggerService } from '@common/services/logger.service';
import { OAuthService } from '@auth/oauth.service';
import { EmailRequest } from '../integration.service';

@Injectable()
export class GmailService {
  private gmail: any;
  private oauth2Client: any;

  constructor(
    private logger: LoggerService,
    private oauthService: OAuthService,
  ) {
    this.logger.setContext('GmailService');
    this.initializeGmail();
  }

  private initializeGmail() {
    const clientId = process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;
    const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      this.logger.warn('Gmail credentials not fully configured');
      return;
    }

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      'http://localhost:3001/auth/gmail/callback', // Redirect URI
    );

    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  async sendEmail(
    request: EmailRequest,
    userId?: number,
    workspaceId?: number,
  ): Promise<any> {
    // Try OAuth first if user context provided
    let gmail = this.gmail;
    if (userId && workspaceId) {
      try {
        gmail = await this.getGmailClientWithOAuth(userId, workspaceId);
      } catch (error) {
        this.logger.warn(
          'OAuth Gmail failed, falling back to service account',
          { error: error.message },
        );
        if (!this.gmail) {
          throw new BadRequestException('Gmail integration not configured');
        }
      }
    } else if (!this.gmail) {
      throw new BadRequestException('Gmail integration not configured');
    }

    const { to, subject, body, html = false } = request;

    this.logger.log(`Sending Gmail email`, {
      to,
      subject,
      bodyLength: body.length,
      html,
    });

    try {
      // Create email content
      const emailContent = this.createEmailContent(to, subject, body, html);

      const result = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: Buffer.from(emailContent).toString('base64url'),
        },
      });

      this.logger.log(`Gmail email sent successfully`, {
        messageId: result.data.id,
        to,
        subject,
      });

      return {
        messageId: result.data.id,
        to,
        subject,
        threadId: result.data.threadId,
      };
    } catch (error) {
      this.logger.error(`Gmail email failed`, error.stack, {
        to,
        subject,
        error: error.message,
      });

      if (error.code === 401) {
        throw new BadRequestException(
          'Gmail authentication failed - refresh token may be expired',
        );
      } else if (error.code === 403) {
        throw new BadRequestException(
          'Gmail API access denied - check permissions',
        );
      }

      throw new BadRequestException(`Gmail email failed: ${error.message}`);
    }
  }

  async getEmails(query: string = '', maxResults: number = 10): Promise<any[]> {
    if (!this.gmail) {
      throw new BadRequestException('Gmail integration not configured');
    }

    try {
      // Search for messages
      const searchResult = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults,
      });

      const messages = searchResult.data.messages || [];

      // Get full message details
      const emailPromises = messages.map(async (message: any) => {
        const fullMessage = await this.gmail.users.messages.get({
          userId: 'me',
          id: message.id,
        });

        return this.parseEmailMessage(fullMessage.data);
      });

      const emails = await Promise.all(emailPromises);

      this.logger.log(`Retrieved ${emails.length} Gmail emails`, {
        query,
        maxResults,
        actualResults: emails.length,
      });

      return emails;
    } catch (error) {
      this.logger.error('Failed to get Gmail emails', error.stack);
      throw new BadRequestException(
        `Failed to get Gmail emails: ${error.message}`,
      );
    }
  }

  async watchEmails(
    callbackUrl: string,
    labelIds: string[] = ['INBOX'],
  ): Promise<any> {
    if (!this.gmail) {
      throw new BadRequestException('Gmail integration not configured');
    }

    try {
      const result = await this.gmail.users.watch({
        userId: 'me',
        requestBody: {
          labelIds,
          topicName: `projects/${process.env.GOOGLE_CLOUD_PROJECT}/topics/gmail-notifications`,
          labelFilterAction: 'include',
        },
      });

      this.logger.log('Gmail watch setup successful', {
        historyId: result.data.historyId,
        expiration: result.data.expiration,
      });

      return {
        historyId: result.data.historyId,
        expiration: result.data.expiration,
        webhookUrl: callbackUrl,
      };
    } catch (error) {
      this.logger.error('Failed to setup Gmail watch', error.stack);
      throw new BadRequestException(
        `Failed to setup Gmail watch: ${error.message}`,
      );
    }
  }

  async getLabels(): Promise<any[]> {
    if (!this.gmail) {
      throw new BadRequestException('Gmail integration not configured');
    }

    try {
      const result = await this.gmail.users.labels.list({
        userId: 'me',
      });

      return (
        result.data.labels?.map((label: any) => ({
          id: label.id,
          name: label.name,
          type: label.type,
          messagesTotal: label.messagesTotal,
          messagesUnread: label.messagesUnread,
        })) || []
      );
    } catch (error) {
      this.logger.error('Failed to get Gmail labels', error.stack);
      throw new BadRequestException(
        `Failed to get Gmail labels: ${error.message}`,
      );
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.gmail) {
      return false;
    }

    try {
      const result = await this.gmail.users.getProfile({
        userId: 'me',
      });

      if (result.data.emailAddress) {
        this.logger.log('Gmail connection test successful', {
          emailAddress: result.data.emailAddress,
          messagesTotal: result.data.messagesTotal,
        });
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('Gmail connection test failed', error.stack);
      return false;
    }
  }

  private createEmailContent(
    to: string,
    subject: string,
    body: string,
    html: boolean,
  ): string {
    const boundary = 'boundary_' + Math.random().toString(36).substr(2, 9);

    let emailContent = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      '',
      html ? this.stripHtml(body) : body,
      '',
    ];

    if (html) {
      emailContent = emailContent.concat([
        `--${boundary}`,
        'Content-Type: text/html; charset=UTF-8',
        '',
        body,
        '',
      ]);
    }

    emailContent.push(`--${boundary}--`);

    return emailContent.join('\r\n');
  }

  private parseEmailMessage(message: any): any {
    const headers = message.payload.headers;
    const getHeader = (name: string) =>
      headers.find((h: any) => h.name === name)?.value;

    let body = '';
    if (message.payload.body?.data) {
      body = Buffer.from(message.payload.body.data, 'base64url').toString();
    } else if (message.payload.parts) {
      // Handle multipart messages
      const textPart = message.payload.parts.find(
        (part: any) =>
          part.mimeType === 'text/plain' || part.mimeType === 'text/html',
      );
      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, 'base64url').toString();
      }
    }

    return {
      id: message.id,
      threadId: message.threadId,
      from: getHeader('From'),
      to: getHeader('To'),
      subject: getHeader('Subject'),
      date: getHeader('Date'),
      body: body,
      snippet: message.snippet,
      labelIds: message.labelIds,
      internalDate: message.internalDate,
    };
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();
  }

  private async getGmailClientWithOAuth(
    userId: number,
    workspaceId: number,
  ): Promise<any> {
    const token = await this.oauthService.getValidGoogleToken(
      userId,
      workspaceId,
    );

    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI,
    );

    oauth2Client.setCredentials({
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
    });

    return google.gmail({ version: 'v1', auth: oauth2Client });
  }
}
