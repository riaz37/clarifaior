import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ExecutionService } from './execution.service';
import { ExecutionController } from './execution.controller';
import { ExecutionProcessor } from './processors/execution.processor';
import { NodeExecutorService } from './services/node-executor.service';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'agent-execution',
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 5,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),
    IntegrationsModule,
  ],
  controllers: [ExecutionController],
  providers: [ExecutionService, ExecutionProcessor, NodeExecutorService],
  exports: [ExecutionService],
})
export class ExecutionModule {}
