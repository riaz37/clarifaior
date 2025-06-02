import { Module } from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { IntegrationsController } from './integrations.controller';
import { DeepSeekService } from './services/deepseek.service';
import { SlackService } from './services/slack.service';
import { GmailService } from './services/gmail.service';
import { GmailPushService } from './services/gmail-push.service';
import { NotionService } from './services/notion.service';
import { PineconeService } from './services/pinecone.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [IntegrationsController],
  providers: [
    IntegrationService,
    DeepSeekService,
    SlackService,
    GmailService,
    GmailPushService,
    NotionService,
    PineconeService,
  ],
  exports: [
    IntegrationService,
    DeepSeekService,
    SlackService,
    GmailService,
    GmailPushService,
    NotionService,
    PineconeService,
  ],
})
export class IntegrationsModule {}
