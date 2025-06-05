import { Module } from '@nestjs/common';
import { IntegrationService } from '@integrations/integration.service';
import { IntegrationsController } from '@integrations/integrations.controller';
import { DeepSeekService } from '@integrations/services/deepseek.service';
// import { SlackService } from '@integrations/services/slack.service';
// import { GmailService } from '@integrations/services/gmail.service';
// import { GmailPushService } from '@integrations/services/gmail-push.service';
// import { NotionService } from '@integrations/services/notion.service';
// import { PineconeService } from '@integrations/services/pinecone.service';

@Module({
  imports: [],
  controllers: [IntegrationsController],
  providers: [
    IntegrationService,
    DeepSeekService,
    //SlackService,
    //GmailService,
    //GmailPushService,
    //NotionService,
    //PineconeService,
  ],
  exports: [
    IntegrationService,
    DeepSeekService,
    //SlackService,
    //GmailService,
    //GmailPushService,
    //NotionService,
    //PineconeService,
  ],
})
export class IntegrationsModule {}
