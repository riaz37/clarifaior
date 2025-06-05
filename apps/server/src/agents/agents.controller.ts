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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { AgentsService } from '@agents/agents.service';
import { FlowValidationService } from '@agents/services/flow-validation.service';
import { CreateAgentDto } from '@agents/dto/create-agent.dto';
import { UpdateAgentDto } from '@agents/dto/update-agent.dto';
import { ExecuteAgentDto } from '@agents/dto/execute-agent.dto';
import {
  AgentResponseDto,
  AgentListResponseDto,
} from './dto/agent-response.dto';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RbacGuard } from '@auth/guards/rbac.guard';
import { RequirePermissions } from '@auth/decorators/permissions.decorator';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import { CurrentWorkspace } from '@auth/decorators/workspace.decorator';
import { Permission } from '@auth/rbac/permissions';
import { PaginationQuery } from '@repo/types';
import { ResponseUtil } from '@common/utils/response.util';
import { LoggerService } from '@common/services/logger.service';

@ApiTags('Agents')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/agents')
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 403, description: 'Forbidden' })
export class AgentsController {
  constructor(
    private readonly agentsService: AgentsService,
    private readonly flowValidationService: FlowValidationService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('AgentsController');
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new agent',
    description: 'Creates a new agent in the specified workspace',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiBody({ type: CreateAgentDto })
  @ApiCreatedResponse({
    description: 'Agent created successfully',
    type: AgentResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
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
  @ApiOperation({
    summary: 'List all agents',
    description: 'Retrieves a paginated list of agents in the workspace',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiOkResponse({
    description: 'List of agents',
    type: AgentListResponseDto,
  })
  @RequirePermissions(Permission.AGENT_READ)
  async findAll(
    @Query() query: PaginationQuery,
    @CurrentWorkspace() workspace: any,
  ) {
    const agents = await this.agentsService.findAll(workspace.id, query);
    return ResponseUtil.paginated(agents);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get agent by ID',
    description: 'Retrieves a specific agent by its ID',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'id', description: 'Agent ID' })
  @ApiOkResponse({
    description: 'Agent details',
    type: AgentResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Agent not found' })
  @RequirePermissions(Permission.AGENT_READ)
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const agent = await this.agentsService.findOne(id, user.id);
    return ResponseUtil.success(agent);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update agent',
    description: 'Updates an existing agent',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'id', description: 'Agent ID' })
  @ApiBody({ type: UpdateAgentDto })
  @ApiOkResponse({
    description: 'Agent updated successfully',
    type: AgentResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Agent not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
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
  @ApiOperation({
    summary: 'Delete agent',
    description: 'Deletes an agent by ID',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'id', description: 'Agent ID' })
  @ApiNoContentResponse({ description: 'Agent deleted successfully' })
  @ApiNotFoundResponse({ description: 'Agent not found' })
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
      isPublic: originalAgent.isPublic,
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
