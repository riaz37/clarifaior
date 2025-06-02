import { Module } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { FlowValidationService } from './services/flow-validation.service';

@Module({
  controllers: [AgentsController],
  providers: [AgentsService, FlowValidationService],
  exports: [AgentsService, FlowValidationService],
})
export class AgentsModule {}
