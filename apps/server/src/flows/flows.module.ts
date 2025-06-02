import { Module } from '@nestjs/common';
import { FlowsService } from './flows.service';
import { FlowsController } from './flows.controller';
import { NodeTemplatesService } from './services/node-templates.service';
import { NodeTemplatesController } from './controllers/node-templates.controller';
import { FlowValidationService } from '../agents/services/flow-validation.service';

@Module({
  controllers: [FlowsController, NodeTemplatesController],
  providers: [FlowsService, NodeTemplatesService, FlowValidationService],
  exports: [FlowsService, NodeTemplatesService],
})
export class FlowsModule {}
