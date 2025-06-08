import { google } from 'googleapis';
import { BaseTool, type ToolResult } from '../base/base-tool';
import { CallbackManagerForToolRun } from '@langchain/core/callbacks/manager';
import { z } from 'zod';
import { createTransport } from 'nodemailer';
import { OAuth2Client } from 'google-auth-library';

export interface GmailToolParams {
  /** OAuth2 client for authentication */
  oauth2Client: OAuth2Client;
  /** Email address to send emails from */
  fromEmail: string;
  /** Whether to enable verbose logging */
  verbose?: boolean;
}

export interface SendEmailParams {
  /** Recipient email address */
  to: string | string[];
  /** Email subject */
  subject: string;
  /** Email body in plain text */
  text?: string;
  /** Email body in HTML */
  html?: string;
  /** CC recipients */
  cc?: string | string[];
  /** BCC recipients */
  bcc?: string | string[];
  /** Email attachments */
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
  /** Message ID this is a reply to */
  inReplyTo?: string;
  /** References for threading */
  references?: string | string[];
}

export interface GetEmailsParams {
  /** Maximum number of messages to return */
  maxResults?: number;
  /** Search query string */
  query?: string;
  /** Whether to include the full message content */
  includeSpamTrash?: boolean;
  /** Page token for pagination */
  pageToken?: string;
  /** Format of the message (minimal, full, raw, metadata) */
  format?: 'minimal' | 'full' | 'raw' | 'metadata';
}

export interface GetEmailParams {
  /** ID of the message to retrieve */
  id: string;
  /** Format of the message (minimal, full, raw, metadata) */
  format?: 'minimal' | 'full' | 'raw' | 'metadata';
}

export class GmailTool extends BaseTool {
  private gmail: any;
  private fromEmail: string;
  protected verbose: boolean;
  private transport: any;

  constructor(params: GmailToolParams) {
    super({
      name: 'gmail',
      description: 'Tool for interacting with Gmail API',
      ...params
    });
    
    this.gmail = google.gmail({ version: 'v1', auth: params.oauth2Client });
    this.fromEmail = params.fromEmail;
    this.verbose = params.verbose ?? false;
    
    // Create Nodemailer transport
    this.transport = createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: this.fromEmail,
        clientId: params.oauth2Client._clientId,
        clientSecret: params.oauth2Client._clientSecret,
        refreshToken: params.oauth2Client.credentials.refresh_token,
        accessToken: params.oauth2Client.credentials.access_token,
      },
    });
  }

  protected getSchema() {
    return z.object({
      action: z.enum(['sendEmail', 'getEmails', 'getEmail', 'sendReply', 'createDraft', 'getDrafts']),
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
        console.log(`Executing Gmail action: ${action}`, params);
      }

      let result;
      switch (action) {
        case 'sendEmail':
          result = await this.sendEmail(params);
          break;
        case 'getEmails':
          result = await this.getEmails(params);
          break;
        case 'getEmail':
          result = await this.getEmail(params);
          break;
        case 'sendReply':
          result = await this.sendReply(params);
          break;
        case 'createDraft':
          result = await this.createDraft(params);
          break;
        case 'getDrafts':
          result = await this.getDrafts(params);
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
   * Send an email using Gmail API
   */
  async sendEmail(params: SendEmailParams) {
    const mailOptions = {
      from: this.fromEmail,
      to: Array.isArray(params.to) ? params.to.join(', ') : params.to,
      cc: params.cc ? (Array.isArray(params.cc) ? params.cc.join(', ') : params.cc) : undefined,
      bcc: params.bcc ? (Array.isArray(params.bcc) ? params.bcc.join(', ') : params.bcc) : undefined,
      subject: params.subject,
      text: params.text,
      html: params.html,
      attachments: params.attachments,
      inReplyTo: params.inReplyTo,
      references: params.references 
        ? (Array.isArray(params.references) ? params.references.join(' ') : params.references)
        : undefined,
    };

    const info = await this.transport.sendMail(mailOptions);
    return {
      messageId: info.messageId,
      response: info.response,
      envelope: info.envelope,
    };
  }

  /**
   * Get a list of emails matching the query
   */
  async getEmails(params: GetEmailsParams = {}) {
    const response = await this.gmail.users.messages.list({
      userId: 'me',
      maxResults: params.maxResults || 10,
      q: params.query || '',
      includeSpamTrash: params.includeSpamTrash || false,
      pageToken: params.pageToken,
    });

    const messages = response.data.messages || [];
    const format = params.format || 'metadata';
    
    // Get full message details for each message
    const messagePromises = messages.map((msg: any) => 
      this.getEmail({ id: msg.id, format })
    );
    
    const messageDetails = await Promise.all(messagePromises);
    
    return {
      messages: messageDetails,
      nextPageToken: response.data.nextPageToken,
      resultSizeEstimate: response.data.resultSizeEstimate,
    };
  }

  /**
   * Get a single email by ID
   */
  async getEmail(params: GetEmailParams) {
    const response = await this.gmail.users.messages.get({
      userId: 'me',
      id: params.id,
      format: params.format || 'metadata',
    });

    return this.parseMessage(response.data);
  }

  /**
   * Send a reply to an existing email
   */
  async sendReply(params: SendEmailParams & { threadId: string }) {
    if (!params.inReplyTo) {
      throw new Error('inReplyTo message ID is required for sending a reply');
    }

    // Get the original message to include in references
    const originalMessage = await this.getEmail({ id: params.inReplyTo });
    const references = [
      originalMessage.headers['message-id'],
      ...(originalMessage.headers.references ? originalMessage.headers.references.split(' ') : [])
    ].filter(Boolean).join(' ');

    return this.sendEmail({
      ...params,
      inReplyTo: originalMessage.headers['message-id'],
      references,
    });
  }

  /**
   * Create a draft email
   */
  async createDraft(params: Omit<SendEmailParams, 'inReplyTo' | 'references'>) {
    const message = {
      raw: Buffer.from(
        `From: ${this.fromEmail}\n` +
        `To: ${Array.isArray(params.to) ? params.to.join(', ') : params.to}\n` +
        (params.cc ? `Cc: ${Array.isArray(params.cc) ? params.cc.join(', ') : params.cc}\n` : '') +
        `Subject: ${params.subject}\n\n` +
        (params.text || '')
      ).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    };

    const response = await this.gmail.users.drafts.create({
      userId: 'me',
      requestBody: {
        message,
      },
    });

    return response.data;
  }

  /**
   * Get list of draft emails
   */
  async getDrafts(params: { maxResults?: number; pageToken?: string } = {}) {
    const response = await this.gmail.users.drafts.list({
      userId: 'me',
      maxResults: params.maxResults || 10,
      pageToken: params.pageToken,
    });

    const drafts = response.data.drafts || [];
    const draftPromises = drafts.map((draft: any) => 
      this.gmail.users.drafts.get({
        userId: 'me',
        id: draft.id,
        format: 'full',
      })
    );

    const draftDetails = await Promise.all(draftPromises);
    
    return {
      drafts: draftDetails.map(d => this.parseMessage(d.data.message)),
      nextPageToken: response.data.nextPageToken,
      resultSizeEstimate: response.data.resultSizeEstimate,
    };
  }

  /**
   * Parse Gmail message into a more usable format
   */
  private parseMessage(message: any) {
    const headers: Record<string, string> = {};
    (message.payload?.headers || []).forEach((header: any) => {
      headers[header.name.toLowerCase()] = header.value;
    });

    let body = '';
    let html = '';
    
    // Helper function to process message parts
    const processPart = (part: any) => {
      if (part.mimeType === 'text/plain') {
        body = Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (part.mimeType === 'text/html') {
        html = Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (part.parts) {
        part.parts.forEach(processPart);
      }
    };

    if (message.payload) {
      processPart(message.payload);
    }

    return {
      id: message.id,
      threadId: message.threadId,
      labelIds: message.labelIds || [],
      snippet: message.snippet,
      internalDate: new Date(parseInt(message.internalDate)),
      headers,
      body,
      html,
      attachments: this.extractAttachments(message.payload),
    };
  }

  /**
   * Extract attachments from a message
   */
  private extractAttachments(part: any, attachments: Array<{filename: string; mimeType: string; size: number; data: Buffer}> = []) {
    if (!part) return attachments;

    if (part.body.attachmentId) {
      attachments.push({
        filename: part.filename || 'attachment',
        mimeType: part.mimeType,
        size: part.body.size,
        data: Buffer.from(part.body.data, 'base64'),
      });
    }

    if (part.parts) {
      part.parts.forEach((p: any) => this.extractAttachments(p, attachments));
    }

    return attachments;
  }
}
