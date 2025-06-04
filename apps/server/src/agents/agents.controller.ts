import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AgentsService } from './agents.service';
import { FlowValidationService } from './services/flow-validation.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { ExecuteAgentDto } from './dto/execute-agent.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentWorkspace } from '../auth/decorators/workspace.decorator';
import { Permission } from '../auth/rbac/permissions';
import { PaginationQuery } from '@repo/types';
import { ResponseUtil } from '../common/utils/response.util';
import { LoggerService } from '../common/services/logger.service';

@Controller('workspaces/:workspaceId/agents')
@UseGuards(JwtAuthGuard, RbacGuard)
export class AgentsController {
  constructor(
    private readonly agentsService: AgentsService,
    private readonly flowValidationService: FlowValidationService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('AgentsController');
  }

  @Post()
  @RequirePermissions(Permission.AGENT_CREATE)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createAgentDto: CreateAgentDto,
    @CurrentUser() user: any,
    @CurrentWorkspace() workspace: any,
  ) {
    this.logger.log(`Creating agent in workspace ${workspace.id}`, {
      userId: user.id,
      workspaceId: workspace.id,
    });

    // Ensure workspace ID matches the route parameter
    createAgentDto.workspaceId = workspace.id;

    const agent = await this.agentsService.create(createAgentDto, user.id);
    return ResponseUtil.created(agent, 'Agent created successfully');
  }

  @Get()
  @RequirePermissions(Permission.AGENT_READ)
  async findAll(
    @Query() query: PaginationQuery,
    @CurrentWorkspace() workspace: any,
  ) {
    const agents = await this.agentsService.findAll(workspace.id, query);
    return ResponseUtil.paginated(agents);
  }

  @Get(':id')
  @RequirePermissions(Permission.AGENT_READ)
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const agent = await this.agentsService.findOne(id, user.id);
    return ResponseUtil.success(agent);
  }

  @Patch(':id')
  @RequirePermissions(Permission.AGENT_UPDATE)
  async update(
    @Param('id') id: string,
    @Body() updateAgentDto: UpdateAgentDto,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Updating agent ${id}`, {
      userId: user.id,
      agentId: id,
    });

    const agent = await this.agentsService.update(id, updateAgentDto, user.id);
    return ResponseUtil.updated(agent, 'Agent updated successfully');
  }

  @Delete(':id')
  @RequirePermissions(Permission.AGENT_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    this.logger.log(`Deleting agent ${id}`, {
      userId: user.id,
      agentId: id,
    });

    await this.agentsService.remove(id, user.id);
    return ResponseUtil.deleted('Agent deleted successfully');
  }

  @Get(':id/versions')
  @RequirePermissions(Permission.AGENT_READ)
  async getVersions(@Param('id') id: string, @CurrentUser() user: any) {
    // Verify access first
    await this.agentsService.findOne(id, user.id);

    const versions = await this.agentsService.getVersions(id);
    return ResponseUtil.success(versions);
  }

  @Post(':id/execute')
  @RequirePermissions(Permission.AGENT_EXECUTE)
  async execute(
    @Param('id') id: string,
    @Body() executeDto: ExecuteAgentDto,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Executing agent ${id}`, {
      userId: user.id,
      agentId: id,
      testMode: executeDto.testMode,
    });

    // TODO: Implement agent execution logic
    // This will be handled by the execution engine

    return ResponseUtil.success({
      message: 'Agent execution started',
      agentId: id,
      executionId: Math.floor(Math.random() * 1000000), // Temporary
      status: 'pending',
    });
  }

  @Post(':id/validate')
  @RequirePermissions(Permission.AGENT_READ)
  async validate(@Param('id') id: string, @CurrentUser() user: any) {
    const agent = await this.agentsService.findOne(id, user.id);

    if (!agent.flowDefinition) {
      return ResponseUtil.success({
        valid: false,
        errors: ['Agent has no flow definition to validate'],
        warnings: [],
      });
    }

    const validationResult = this.flowValidationService.validateFlow(
      agent.flowDefinition,
    );

    this.logger.log(`Flow validation completed for agent ${id}`, {
      agentId: id,
      valid: validationResult.valid,
      errorCount: validationResult.errors.length,
      warningCount: validationResult.warnings.length,
    });

    return ResponseUtil.success(validationResult);
  }

  @Post(':id/duplicate')
  @RequirePermissions(Permission.AGENT_CREATE)
  async duplicate(
    @Param('id') id: string,
    @Body() body: { name: string },
    @CurrentUser() user: any,
    @CurrentWorkspace() workspace: any,
  ) {
    const originalAgent = await this.agentsService.findOne(id, user.id);

    const duplicateDto: CreateAgentDto = {
      name: body.name,
      description: `Copy of ${originalAgent.name}`,
      workspaceId: workspace.id,
      flowDefinition: originalAgent.flowDefinition,
      metadata: originalAgent.metadata,
    };

    const duplicatedAgent = await this.agentsService.create(
      duplicateDto,
      user.id,
    );
    return ResponseUtil.created(
      duplicatedAgent,
      'Agent duplicated successfully',
    );
  }
}
