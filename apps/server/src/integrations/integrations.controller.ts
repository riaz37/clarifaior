import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Param,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { IntegrationService } from './integration.service';
import { DeepSeekService } from './services/deepseek.service';
import { SlackService } from './services/slack.service';
import { GmailService } from './services/gmail.service';
import { NotionService } from './services/notion.service';
import { PineconeService } from './services/pinecone.service';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RequirePermissions } from '@auth/decorators/permissions.decorator';
import { Permission } from '@auth/rbac/permissions';
import { ResponseUtil } from '@common/utils/response.util';
import { LoggerService } from '@common/services/logger.service';

@ApiTags('Integrations')
@Controller('integrations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class IntegrationsController {
  constructor(
    private readonly integrationService: IntegrationService,
    private readonly deepSeekService: DeepSeekService,
    // private readonly slackService: SlackService,
    // private readonly gmailService: GmailService,
    // private readonly notionService: NotionService,
    // private readonly pineconeService: PineconeService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('IntegrationsController');
  }

  @Get('test/deepseek')
  @ApiOperation({ summary: 'Test DeepSeek connection' })
  @ApiResponse({ status: 200, description: 'Connection test result' })
  @RequirePermissions(Permission.INTEGRATION_READ)
  async testDeepSeek() {
    const isConnected = await this.deepSeekService.testConnection();
    return ResponseUtil.success({
      service: 'DeepSeek',
      connected: isConnected,
      message: isConnected ? 'Connection successful' : 'Connection failed',
    });
  }

  // @Get('test/slack')
  // @ApiOperation({ summary: 'Test Slack connection' })
  // @ApiResponse({ status: 200, description: 'Connection test result' })
  // @RequirePermissions(Permission.INTEGRATION_READ)
  // async testSlack() {
  //   const isConnected = await this.slackService.testConnection();
  //   return ResponseUtil.success({
  //     service: 'Slack',
  //     connected: isConnected,
  //     message: isConnected ? 'Connection successful' : 'Connection failed',
  //   });
  // }

  // @Get('test/gmail')
  // @ApiOperation({ summary: 'Test Gmail connection' })
  // @ApiResponse({ status: 200, description: 'Connection test result' })
  // @RequirePermissions(Permission.INTEGRATION_READ)
  // async testGmail() {
  //   const isConnected = await this.gmailService.testConnection();
  //   return ResponseUtil.success({
  //     service: 'Gmail',
  //     connected: isConnected,
  //     message: isConnected ? 'Connection successful' : 'Connection failed',
  //   });
  // }

  // @Get('test/notion')
  // @ApiOperation({ summary: 'Test Notion connection' })
  // @ApiResponse({ status: 200, description: 'Connection test result' })
  // @RequirePermissions(Permission.INTEGRATION_READ)
  // async testNotion() {
  //   const isConnected = await this.notionService.testConnection();
  //   return ResponseUtil.success({
  //     service: 'Notion',
  //     connected: isConnected,
  //     message: isConnected ? 'Connection successful' : 'Connection failed',
  //   });
  // }

  // @Get('test/pinecone')
  // @ApiOperation({ summary: 'Test Pinecone connection' })
  // @ApiResponse({ status: 200, description: 'Connection test result' })
  // @RequirePermissions(Permission.INTEGRATION_READ)
  // async testPinecone() {
  //   const isConnected = await this.pineconeService.testConnection();
  //   return ResponseUtil.success({
  //     service: 'Pinecone',
  //     connected: isConnected,
  //     message: isConnected ? 'Connection successful' : 'Connection failed',
  //   });
  // }

  // @Post('test/llm')
  // @ApiOperation({ summary: 'Test LLM integration' })
  // @ApiResponse({ status: 200, description: 'LLM response' })
  // @RequirePermissions(Permission.INTEGRATION_READ)
  // @HttpCode(HttpStatus.OK)
  // async testLLM(
  //   @Body() body: {
  //     prompt: string;
  //     model?: string;
  //   }
  // ) {
  //   const { prompt, model = 'deepseek-chat' } = body;

  //   const result = await this.integrationService.callLLM({
  //     prompt,
  //     model,
  //     temperature: 0.7,
  //     maxTokens: 100,
  //   });

  //   return ResponseUtil.success(result);
  // }

  // @Post('test/slack-message')
  // @RequirePermissions(Permission.INTEGRATION_CREATE)
  // @HttpCode(HttpStatus.OK)
  // async testSlackMessage(@Body() body: { channel: string; message: string }) {
  //   const { channel, message } = body;

  //   const result = await this.integrationService.sendSlackMessage({
  //     channel,
  //     message,
  //   });

  //   return ResponseUtil.success(result);
  // }

  // @Post('test/email')
  // @RequirePermissions(Permission.INTEGRATION_CREATE)
  // @HttpCode(HttpStatus.OK)
  // async testEmail(@Body() body: { to: string; subject: string; body: string }) {
  //   const { to, subject, body: emailBody } = body;

  //   const result = await this.integrationService.sendEmail({
  //     to,
  //     subject,
  //     body: emailBody,
  //   });

  //   return ResponseUtil.success(result);
  // }

  // @Get('slack/channels')
  // @RequirePermissions(Permission.INTEGRATION_READ)
  // async getSlackChannels() {
  //   const channels = await this.slackService.getChannels();
  //   return ResponseUtil.success(channels);
  // }

  // @Get('gmail/labels')
  // @RequirePermissions(Permission.INTEGRATION_READ)
  // async getGmailLabels() {
  //   const labels = await this.gmailService.getLabels();
  //   return ResponseUtil.success(labels);
  // }

  // @Post('gmail/emails')
  // @RequirePermissions(Permission.INTEGRATION_READ)
  // @HttpCode(HttpStatus.OK)
  // async getGmailEmails(@Body() body: { query?: string; maxResults?: number }) {
  //   const { query = '', maxResults = 10 } = body;

  //   const emails = await this.gmailService.getEmails(query, maxResults);
  //   return ResponseUtil.success(emails);
  // }

  // @Get('status')
  // @RequirePermissions(Permission.INTEGRATION_READ)
  // async getIntegrationStatus() {
  //   const [deepSeekStatus, slackStatus, gmailStatus] = await Promise.all([
  //     this.deepSeekService.testConnection().catch(() => false),
  //     this.slackService.testConnection().catch(() => false),
  //     this.gmailService.testConnection().catch(() => false),
  //   ]);

  //   return ResponseUtil.success({
  //     deepseek: {
  //       connected: deepSeekStatus,
  //       configured: !!process.env.DEEPSEEK_API_KEY,
  //     },
  //     slack: {
  //       connected: slackStatus,
  //       configured: !!process.env.SLACK_BOT_TOKEN,
  //     },
  //     gmail: {
  //       connected: gmailStatus,
  //       configured: !!(
  //         process.env.GMAIL_CLIENT_ID &&
  //         process.env.GMAIL_CLIENT_SECRET &&
  //         process.env.GMAIL_REFRESH_TOKEN
  //       ),
  //     },
  //     notion: {
  //       connected: await this.notionService.testConnection().catch(() => false),
  //       configured: !!process.env.NOTION_TOKEN,
  //     },
  //     pinecone: {
  //       connected: await this.pineconeService
  //         .testConnection()
  //         .catch(() => false),
  //       configured: !!process.env.PINECONE_API_KEY,
  //     },
  //   });
  // }

  // @Get('notion/databases')
  // @RequirePermissions(Permission.INTEGRATION_READ)
  // async getNotionDatabases() {
  //   const databases = await this.notionService.getDatabases();
  //   return ResponseUtil.success(databases);
  // }

  // @Get('notion/databases/:databaseId/properties')
  // @RequirePermissions(Permission.INTEGRATION_READ)
  // async getNotionDatabaseProperties(@Param('databaseId') databaseId: string) {
  //   const properties =
  //     await this.notionService.getDatabaseProperties(databaseId);
  //   return ResponseUtil.success(properties);
  // }

  // @Post('test/notion-page')
  // @RequirePermissions(Permission.INTEGRATION_CREATE)
  // @HttpCode(HttpStatus.OK)
  // async testNotionPage(
  //   @Body()
  //   body: {
  //     database: string;
  //     title: string;
  //     properties?: Record<string, any>;
  //   },
  // ) {
  //   const { database, title, properties = {} } = body;

  //   const result = await this.integrationService.createNotionPage({
  //     database,
  //     title,
  //     properties,
  //   });

  //   return ResponseUtil.success(result);
  // }

  // @Post('test/memory-search')
  // @RequirePermissions(Permission.INTEGRATION_READ)
  // @HttpCode(HttpStatus.OK)
  // async testMemorySearch(
  //   @Body() body: { query: string; topK?: number; threshold?: number },
  // ) {
  //   const { query, topK = 5, threshold = 0.7 } = body;

  //   const result = await this.integrationService.searchMemory({
  //     query,
  //     topK,
  //     threshold,
  //   });

  //   return ResponseUtil.success(result);
  // }

  // @Get('pinecone/stats')
  // @RequirePermissions(Permission.INTEGRATION_READ)
  // async getPineconeStats() {
  //   const stats = await this.pineconeService.getIndexStats();
  //   return ResponseUtil.success(stats);
  // }

  // @Post('pinecone/store')
  // @RequirePermissions(Permission.INTEGRATION_CREATE)
  // @HttpCode(HttpStatus.OK)
  // async storeMemory(
  //   @Body()
  //   body: {
  //     id: string;
  //     content: string;
  //     metadata?: Record<string, any>;
  //   },
  // ) {
  //   const { id, content, metadata } = body;

  //   await this.pineconeService.storeMemory({
  //     id,
  //     content,
  //     metadata,
  //   });

  //   return ResponseUtil.success(
  //     { id, stored: true },
  //     'Memory stored successfully',
  //   );
  // }

  // @Delete('pinecone/memory/:id')
  // @RequirePermissions(Permission.INTEGRATION_DELETE)
  // @HttpCode(HttpStatus.NO_CONTENT)
  // async deleteMemory(@Param('id') id: string) {
  //   await this.pineconeService.deleteMemory(id);
  //   return ResponseUtil.deleted('Memory deleted successfully');
  // }
}
