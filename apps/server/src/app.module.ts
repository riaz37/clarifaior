import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bull';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
// import { AgentsModule } from './agents/agents.module';
// import { FlowsModule } from './flows/flows.module';
// import { ExecutionModule } from './execution/execution.module';
//import { IntegrationsModule } from './integrations/integrations.module';
// import { WebhooksModule } from './webhooks/webhooks.module';
// import { SchedulerModule } from './scheduler/scheduler.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
    }),
    CommonModule,
    AuthModule,
    // AgentsModule,
    // FlowsModule,
    // ExecutionModule,
    //IntegrationsModule,
    // WebhooksModule,
    // SchedulerModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
