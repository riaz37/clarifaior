import { Injectable, BadRequestException } from '@nestjs/common';
import { LoggerService } from '../common/services/logger.service';
import { EncryptionService } from '../common/services/encryption.service';
import { DeepSeekService } from './services/deepseek.service';
import { SlackService } from './services/slack.service';
import { GmailService } from './services/gmail.service';
import { NotionService } from './services/notion.service';
import { PineconeService } from './services/pinecone.service';

// Integration interfaces
export interface LLMRequest {
  prompt: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  response: string;
  model: string;
  tokensUsed: number;
  cost: number;
}

export interface MemorySearchRequest {
  query: string;
  topK: number;
  threshold: number;
}

export interface SlackMessageRequest {
  channel: string;
  message: string;
  threadReply?: boolean;
}

export interface NotionPageRequest {
  database: string;
  title: string;
  properties: Record<string, any>;
}

export interface EmailRequest {
  to: string;
  subject: string;
  body: string;
  html?: boolean;
}

export interface WebhookRequest {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: any;
}

@Injectable()
export class IntegrationService {
  constructor(
    private logger: LoggerService,
    private encryptionService: EncryptionService,
    private deepSeekService: DeepSeekService,
    private slackService: SlackService,
    private gmailService: GmailService,
    private notionService: NotionService,
    private pineconeService: PineconeService,
  ) {
    this.logger.setContext('IntegrationService');
  }

  async callLLM(request: LLMRequest): Promise<LLMResponse> {
    const { prompt, model, temperature = 0.7, maxTokens = 1000 } = request;

    this.logger.log(`Calling LLM: ${model}`, {
      model,
      promptLength: prompt.length,
      temperature,
      maxTokens,
    });

    try {
      // Use DeepSeek for most models, with fallbacks
      if (
        model.startsWith('deepseek-') ||
        model.startsWith('gpt-') ||
        model.startsWith('claude-')
      ) {
        return this.deepSeekService.callLLM(request);
      } else {
        // Fallback to DeepSeek for unknown models
        return this.deepSeekService.callLLM({
          ...request,
          model: 'deepseek-chat',
        });
      }
    } catch (error) {
      this.logger.error(`LLM call failed: ${error.message}`, error.stack);
      throw new BadRequestException(`LLM call failed: ${error.message}`);
    }
  }

  async searchMemory(request: MemorySearchRequest): Promise<any[]> {
    const { query, topK, threshold } = request;

    this.logger.log(`Searching memory`, {
      query: query.substring(0, 100),
      topK,
      threshold,
    });

    try {
      return this.pineconeService.searchMemory(request);
    } catch (error) {
      this.logger.error(`Memory search failed: ${error.message}`, error.stack);
      throw new BadRequestException(`Memory search failed: ${error.message}`);
    }
  }

  async sendSlackMessage(request: SlackMessageRequest): Promise<any> {
    const { channel, message, threadReply } = request;

    this.logger.log(`Sending Slack message`, {
      channel,
      messageLength: message.length,
      threadReply,
    });

    try {
      return this.slackService.sendMessage(request);
    } catch (error) {
      this.logger.error(`Slack message failed: ${error.message}`, error.stack);
      throw new BadRequestException(`Slack message failed: ${error.message}`);
    }
  }

  async createNotionPage(request: NotionPageRequest): Promise<any> {
    const { database, title, properties } = request;

    this.logger.log(`Creating Notion page`, {
      database,
      title,
      propertyCount: Object.keys(properties).length,
    });

    try {
      return this.notionService.createPage(request);
    } catch (error) {
      this.logger.error(
        `Notion page creation failed: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Notion page creation failed: ${error.message}`,
      );
    }
  }

  async sendEmail(request: EmailRequest): Promise<any> {
    const { to, subject, body, html } = request;

    this.logger.log(`Sending email`, {
      to,
      subject,
      bodyLength: body.length,
      html,
    });

    try {
      return this.gmailService.sendEmail(request);
    } catch (error) {
      this.logger.error(`Email sending failed: ${error.message}`, error.stack);
      throw new BadRequestException(`Email sending failed: ${error.message}`);
    }
  }

  async callWebhook(request: WebhookRequest): Promise<any> {
    const { url, method, headers, body } = request;

    this.logger.log(`Calling webhook`, {
      url,
      method,
      hasHeaders: !!headers,
      hasBody: !!body,
    });

    try {
      // Actual HTTP implementation
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const responseData = await response.text();
      let parsedData;

      try {
        parsedData = JSON.parse(responseData);
      } catch {
        parsedData = responseData;
      }

      return {
        status: response.status,
        response: parsedData,
        headers: Object.fromEntries(response.headers.entries()),
      };
    } catch (error) {
      this.logger.error(`Webhook call failed: ${error.message}`, error.stack);
      throw new BadRequestException(`Webhook call failed: ${error.message}`);
    }
  }

  // Mock implementations - replace with actual integrations

  private async callOpenAI(request: LLMRequest): Promise<LLMResponse> {
    // Mock OpenAI response
    await this.delay(1000); // Simulate API call

    const tokensUsed =
      Math.floor(request.prompt.length / 4) + Math.floor(Math.random() * 100);
    const cost = (tokensUsed / 1000) * 0.002; // Mock pricing

    return {
      response: `Mock response for: ${request.prompt.substring(0, 50)}...`,
      model: request.model,
      tokensUsed,
      cost,
    };
  }

  private async callAnthropic(request: LLMRequest): Promise<LLMResponse> {
    // Mock Anthropic response
    await this.delay(1200);

    const tokensUsed =
      Math.floor(request.prompt.length / 4) + Math.floor(Math.random() * 100);
    const cost = (tokensUsed / 1000) * 0.003;

    return {
      response: `Mock Claude response for: ${request.prompt.substring(0, 50)}...`,
      model: request.model,
      tokensUsed,
      cost,
    };
  }

  private async callSlackAPI(request: SlackMessageRequest): Promise<any> {
    // Mock Slack API
    await this.delay(800);

    return {
      messageId: `msg_${Date.now()}`,
      timestamp: new Date().toISOString(),
      channel: request.channel,
    };
  }

  private async callNotionAPI(request: NotionPageRequest): Promise<any> {
    // Mock Notion API
    await this.delay(1500);

    return {
      pageId: `page_${Date.now()}`,
      url: `https://notion.so/page_${Date.now()}`,
      title: request.title,
    };
  }

  private async callEmailService(request: EmailRequest): Promise<any> {
    // Mock email service
    await this.delay(600);

    return {
      messageId: `email_${Date.now()}`,
      to: request.to,
      subject: request.subject,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
