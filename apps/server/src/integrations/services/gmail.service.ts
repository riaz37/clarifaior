import { Injectable, BadRequestException } from '@nestjs/common';
import { google } from 'googleapis';
import { LoggerService } from '@common/services/logger.service';
import { OAuthService } from '@auth/oauth.service';

// First, let's define the missing interfaces
export interface EmailMessage {
  id?: string;
  threadId?: string;
  from: string;
  to: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  subject: string;
  body: string;
  html?: boolean;
  date?: string;
  snippet?: string;
  labelIds?: string[];
  internalDate?: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;
  data?: string; // base64 encoded
}

export interface EmailRequest {
  to: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  subject: string;
  body: string;
  html?: boolean;
  attachments?: EmailAttachment[];
}

export interface GmailSearchOptions {
  query?: string;
  maxResults?: number;
  labelIds?: string[];
  before?: string; // date in format YYYY/MM/DD
  after?: string; // date in format YYYY/MM/DD
  from?: string;
  to?: string;
  subject?: string;
  hasAttachment?: boolean;
  isUnread?: boolean;
}

export interface GmailLabel {
  id: string;
  name: string;
  type: string;
  messagesTotal?: number;
  messagesUnread?: number;
  threadsTotal?: number;
  threadsUnread?: number;
}

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
    const redirectUrl = process.env.GMAIL_REDIRECT_URL;

    if (!clientId || !clientSecret || !refreshToken) {
      this.logger.warn('Gmail credentials not fully configured');
      return;
    }

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUrl,
    );

    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  async sendEmail(
    request: EmailMessage,
    userId?: string,
    workspaceId?: string,
  ): Promise<{
    messageId: string;
    to: string;
    subject: string;
    threadId?: string;
  }> {
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
        if (!gmail) {
          throw new BadRequestException('Gmail integration not configured');
        }
      }
    } else if (!gmail) {
      throw new BadRequestException('Gmail integration not configured');
    }

    const {
      to,
      subject,
      body,
      html = false,
      cc = [],
      bcc = [],
      replyTo,
      attachments = [],
    } = request;

    this.logger.log(`Sending Gmail email`, {
      to,
      subject,
      bodyLength: body.length,
      html,
      hasAttachments: attachments.length > 0,
    });

    try {
      // Create email content
      const emailContent = this.createEmailContent(
        to,
        subject,
        body,
        html,
        cc,
        bcc,
        replyTo,
        attachments,
      );

      const result = await gmail.users.messages.send({
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

  async getEmails(options: GmailSearchOptions = {}): Promise<EmailMessage[]> {
    const gmail = this.gmail;
    if (!gmail) {
      throw new BadRequestException('Gmail integration not configured');
    }

    const {
      query = '',
      maxResults = 10,
      labelIds,
      before,
      after,
      from,
      to,
      subject,
      hasAttachment,
      isUnread,
    } = options;

    // Build search query
    let searchQuery = query;
    if (from) searchQuery += ` from:${from}`;
    if (to) searchQuery += ` to:${to}`;
    if (subject) searchQuery += ` subject:${subject}`;
    if (before) searchQuery += ` before:${before}`;
    if (after) searchQuery += ` after:${after}`;
    if (hasAttachment) searchQuery += ` has:attachment`;
    if (isUnread) searchQuery += ` is:unread`;

    try {
      // Search for messages
      const searchResult = await gmail.users.messages.list({
        userId: 'me',
        q: searchQuery.trim(),
        maxResults,
        labelIds,
      });

      const messages = searchResult.data.messages || [];

      // Get full message details
      const emailPromises = messages.map(async (message: any) => {
        const fullMessage = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full',
        });

        return this.parseEmailMessage(fullMessage.data);
      });

      const emails = await Promise.all(emailPromises);

      this.logger.log(`Retrieved ${emails.length} Gmail emails`, {
        query: searchQuery,
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

  async getEmailById(
    messageId: string,
    userId?: string,
    workspaceId?: string,
  ): Promise<EmailMessage> {
    let gmail = this.gmail;
    if (userId && workspaceId) {
      gmail = await this.getGmailClientWithOAuth(userId, workspaceId);
    }

    if (!gmail) {
      throw new BadRequestException('Gmail integration not configured');
    }

    try {
      const message = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      return this.parseEmailMessage(message.data);
    } catch (error) {
      this.logger.error('Failed to get Gmail email by ID', error.stack);
      throw new BadRequestException(
        `Failed to get Gmail email: ${error.message}`,
      );
    }
  }

  async replyToEmail(
    messageId: string,
    replyBody: string,
    html: boolean = false,
    userId?: string,
    workspaceId?: string,
  ): Promise<{ messageId: string; threadId: string }> {
    let gmail = this.gmail;
    if (userId && workspaceId) {
      gmail = await this.getGmailClientWithOAuth(userId, workspaceId);
    }

    if (!gmail) {
      throw new BadRequestException('Gmail integration not configured');
    }

    try {
      // Get original message to extract thread info
      const originalMessage = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
      });

      const headers = originalMessage.data.payload.headers;
      const getHeader = (name: string) =>
        headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())
          ?.value;

      const originalFrom = getHeader('From');
      const originalSubject = getHeader('Subject');
      const threadId = originalMessage.data.threadId;

      // Create reply subject
      const replySubject = originalSubject?.startsWith('Re:')
        ? originalSubject
        : `Re: ${originalSubject}`;

      // Create reply email content
      const emailContent = this.createEmailContent(
        originalFrom,
        replySubject,
        replyBody,
        html,
      );

      const result = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: Buffer.from(emailContent).toString('base64url'),
          threadId: threadId,
        },
      });

      this.logger.log(`Gmail reply sent successfully`, {
        originalMessageId: messageId,
        replyMessageId: result.data.id,
        threadId: result.data.threadId,
      });

      return {
        messageId: result.data.id,
        threadId: result.data.threadId,
      };
    } catch (error) {
      this.logger.error('Failed to reply to Gmail email', error.stack);
      throw new BadRequestException(
        `Failed to reply to Gmail email: ${error.message}`,
      );
    }
  }

  async markAsRead(
    messageId: string,
    userId?: string,
    workspaceId?: string,
  ): Promise<void> {
    let gmail = this.gmail;
    if (userId && workspaceId) {
      gmail = await this.getGmailClientWithOAuth(userId, workspaceId);
    }

    if (!gmail) {
      throw new BadRequestException('Gmail integration not configured');
    }

    try {
      await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD'],
        },
      });

      this.logger.log(`Marked Gmail message as read`, { messageId });
    } catch (error) {
      this.logger.error('Failed to mark Gmail message as read', error.stack);
      throw new BadRequestException(
        `Failed to mark message as read: ${error.message}`,
      );
    }
  }

  async markAsUnread(
    messageId: string,
    userId?: string,
    workspaceId?: string,
  ): Promise<void> {
    let gmail = this.gmail;
    if (userId && workspaceId) {
      gmail = await this.getGmailClientWithOAuth(userId, workspaceId);
    }

    if (!gmail) {
      throw new BadRequestException('Gmail integration not configured');
    }

    try {
      await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: ['UNREAD'],
        },
      });

      this.logger.log(`Marked Gmail message as unread`, { messageId });
    } catch (error) {
      this.logger.error('Failed to mark Gmail message as unread', error.stack);
      throw new BadRequestException(
        `Failed to mark message as unread: ${error.message}`,
      );
    }
  }

  async addLabel(
    messageId: string,
    labelId: string,
    userId?: string,
    workspaceId?: string,
  ): Promise<void> {
    let gmail = this.gmail;
    if (userId && workspaceId) {
      gmail = await this.getGmailClientWithOAuth(userId, workspaceId);
    }

    if (!gmail) {
      throw new BadRequestException('Gmail integration not configured');
    }

    try {
      await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: [labelId],
        },
      });

      this.logger.log(`Added label to Gmail message`, { messageId, labelId });
    } catch (error) {
      this.logger.error('Failed to add label to Gmail message', error.stack);
      throw new BadRequestException(
        `Failed to add label to message: ${error.message}`,
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

  async getLabels(
    userId?: string,
    workspaceId?: string,
  ): Promise<GmailLabel[]> {
    let gmail = this.gmail;
    if (userId && workspaceId) {
      gmail = await this.getGmailClientWithOAuth(userId, workspaceId);
    }

    if (!gmail) {
      throw new BadRequestException('Gmail integration not configured');
    }

    try {
      const result = await gmail.users.labels.list({
        userId: 'me',
      });

      return (
        result.data.labels?.map((label: any) => ({
          id: label.id,
          name: label.name,
          type: label.type,
          messagesTotal: label.messagesTotal,
          messagesUnread: label.messagesUnread,
          threadsTotal: label.threadsTotal,
          threadsUnread: label.threadsUnread,
        })) || []
      );
    } catch (error) {
      this.logger.error('Failed to get Gmail labels', error.stack);
      throw new BadRequestException(
        `Failed to get Gmail labels: ${error.message}`,
      );
    }
  }

  async testConnection(
    userId?: string,
    workspaceId?: string,
  ): Promise<boolean> {
    let gmail = this.gmail;
    if (userId && workspaceId) {
      try {
        gmail = await this.getGmailClientWithOAuth(userId, workspaceId);
      } catch (error) {
        this.logger.warn('OAuth connection test failed', {
          error: error.message,
        });
        return false;
      }
    }

    if (!gmail) {
      return false;
    }

    try {
      const result = await gmail.users.getProfile({
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
    html: boolean = false,
    cc: string[] = [],
    bcc: string[] = [],
    replyTo?: string,
    attachments: EmailAttachment[] = [],
  ): string {
    const boundary = 'boundary_' + Math.random().toString(36).substr(2, 9);

    const emailLines = [
      `To: ${to}`,
      ...(cc.length ? [`Cc: ${cc.join(', ')}`] : []),
      ...(bcc.length ? [`Bcc: ${bcc.join(', ')}`] : []),
      ...(replyTo ? [`Reply-To: ${replyTo}`] : []),
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
    ];

    if (attachments.length > 0) {
      // Multipart email with attachments
      emailLines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
      emailLines.push('');
      emailLines.push(`--${boundary}`);
      emailLines.push(
        `Content-Type: ${html ? 'text/html' : 'text/plain'}; charset=utf-8`,
      );
      emailLines.push('');
      emailLines.push(body);

      // Add attachments
      attachments.forEach((attachment) => {
        emailLines.push(`--${boundary}`);
        emailLines.push(
          `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`,
        );
        emailLines.push('Content-Transfer-Encoding: base64');
        emailLines.push(
          `Content-Disposition: attachment; filename="${attachment.filename}"`,
        );
        emailLines.push('');
        emailLines.push(attachment.data || '');
      });

      emailLines.push(`--${boundary}--`);
    } else {
      // Simple email without attachments
      emailLines.push(
        `Content-Type: ${html ? 'text/html' : 'text/plain'}; charset=utf-8`,
      );
      emailLines.push('');
      emailLines.push(body);
    }

    return emailLines.join('\r\n');
  }

  private parseEmailMessage(message: any): EmailMessage {
    const headers = message.payload.headers;
    const getHeader = (name: string) =>
      headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())
        ?.value;

    let body = '';
    let isHtml = false;
    const attachments: EmailAttachment[] = [];

    // Extract body and attachments
    const extractContent = (payload: any) => {
      if (payload.body?.data) {
        const content = Buffer.from(payload.body.data, 'base64url').toString();
        if (payload.mimeType === 'text/html') {
          body = content;
          isHtml = true;
        } else if (payload.mimeType === 'text/plain' && !body) {
          body = content;
        }
      }

      if (payload.parts) {
        payload.parts.forEach((part: any) => {
          if (part.filename && part.body?.attachmentId) {
            attachments.push({
              filename: part.filename,
              mimeType: part.mimeType,
              size: part.body.size,
              attachmentId: part.body.attachmentId,
            });
          } else {
            extractContent(part);
          }
        });
      }
    };

    extractContent(message.payload);

    // If HTML body exists, also provide plain text version
    if (isHtml && body) {
      body = this.stripHtml(body);
    }

    return {
      id: message.id,
      threadId: message.threadId,
      from: getHeader('From') || '',
      to: getHeader('To') || '',
      cc:
        getHeader('Cc')
          ?.split(',')
          .map((email) => email.trim()) || [],
      bcc:
        getHeader('Bcc')
          ?.split(',')
          .map((email) => email.trim()) || [],
      replyTo: getHeader('Reply-To'),
      subject: getHeader('Subject') || '',
      date: getHeader('Date'),
      body: body,
      html: isHtml,
      snippet: message.snippet,
      labelIds: message.labelIds,
      internalDate: message.internalDate,
      attachments: attachments,
    };
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async getGmailClientWithOAuth(
    userId: string,
    workspaceId: string,
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

  // Utility method to download attachment
  async downloadAttachment(
    messageId: string,
    attachmentId: string,
    userId?: string,
    workspaceId?: string,
  ): Promise<string> {
    let gmail = this.gmail;
    if (userId && workspaceId) {
      gmail = await this.getGmailClientWithOAuth(userId, workspaceId);
    }

    if (!gmail) {
      throw new BadRequestException('Gmail integration not configured');
    }

    try {
      const attachment = await gmail.users.messages.attachments.get({
        userId: 'me',
        messageId: messageId,
        id: attachmentId,
      });

      return attachment.data.data; // base64 encoded data
    } catch (error) {
      this.logger.error('Failed to download Gmail attachment', error.stack);
      throw new BadRequestException(
        `Failed to download attachment: ${error.message}`,
      );
    }
  }
}
