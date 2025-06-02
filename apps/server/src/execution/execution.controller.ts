import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Delete,
} from '@nestjs/common';
import { ExecutionService } from './execution.service';
import { StartExecutionDto } from './dto/start-execution.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permission } from '../auth/rbac/permissions';
import { PaginationQuery } from '@repo/types';
import { ResponseUtil } from '../common/utils/response.util';
import { LoggerService } from '../common/services/logger.service';

@Controller('executions')
@UseGuards(JwtAuthGuard, RbacGuard)
export class ExecutionController {
  constructor(
    private readonly executionService: ExecutionService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('ExecutionController');
  }

  @Post()
  @RequirePermissions(Permission.AGENT_EXECUTE)
  @HttpCode(HttpStatus.CREATED)
  async startExecution(
    @Body() startExecutionDto: StartExecutionDto,
    @CurrentUser() user: any,
  ) {
    this.logger.log(
      `Starting execution for agent: ${startExecutionDto.agentId}`,
      {
        userId: user.id,
        agentId: startExecutionDto.agentId,
      },
    );

    const execution = await this.executionService.startExecution(
      startExecutionDto,
      user.id,
    );
    return ResponseUtil.created(execution, 'Execution started successfully');
  }

  @Get(':id')
  @RequirePermissions(Permission.EXECUTION_READ)
  async getExecution(@Param('id') id: string) {
    const execution = await this.executionService.getExecution(+id);
    return ResponseUtil.success(execution);
  }

  @Get('agents/:agentId')
  @RequirePermissions(Permission.EXECUTION_READ)
  async getExecutions(
    @Param('agentId') agentId: string,
    @Query() query: PaginationQuery,
  ) {
    const executions = await this.executionService.getExecutions(
      +agentId,
      query,
    );
    return ResponseUtil.paginated(executions);
  }

  @Get(':id/logs')
  @RequirePermissions(Permission.EXECUTION_READ)
  async getExecutionLogs(@Param('id') id: string) {
    const logs = await this.executionService.getExecutionLogs(+id);
    return ResponseUtil.success(logs);
  }

  @Delete(':id')
  @RequirePermissions(Permission.EXECUTION_CANCEL)
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelExecution(@Param('id') id: string, @CurrentUser() user: any) {
    this.logger.log(`Cancelling execution: ${id}`, {
      userId: user.id,
      executionId: +id,
    });

    await this.executionService.cancelExecution(+id, user.id);
    return ResponseUtil.success(null, 'Execution cancelled successfully');
  }

  @Get('queue/stats')
  @RequirePermissions(Permission.ADMIN_FULL_ACCESS)
  async getQueueStats() {
    const stats = await this.executionService.getQueueStats();
    return ResponseUtil.success(stats);
  }
}
