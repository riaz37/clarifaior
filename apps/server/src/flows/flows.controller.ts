import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FlowsService } from './flows.service';
import { UpdateFlowDto } from './dto/update-flow.dto';
import { CreateNodeDto } from './dto/create-node.dto';
import { CreateEdgeDto } from './dto/create-edge.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permission } from '../auth/rbac/permissions';
import { ResponseUtil } from '../common/utils/response.util';
import { LoggerService } from '../common/services/logger.service';

@Controller('agents/:agentId/flow')
@UseGuards(JwtAuthGuard, RbacGuard)
export class FlowsController {
  constructor(
    private readonly flowsService: FlowsService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('FlowsController');
  }

  @Get()
  @RequirePermissions(Permission.AGENT_READ)
  async getFlow(@Param('agentId') agentId: string, @CurrentUser() user: any) {
    const flow = await this.flowsService.getFlow(+agentId);
    return ResponseUtil.success(flow);
  }

  @Put()
  @RequirePermissions(Permission.AGENT_UPDATE)
  async updateFlow(
    @Param('agentId') agentId: string,
    @Body() updateFlowDto: UpdateFlowDto,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Updating flow for agent ${agentId}`, {
      userId: user.id,
      agentId: +agentId,
    });

    const flow = await this.flowsService.updateFlow(
      +agentId,
      updateFlowDto,
      user.id,
    );
    return ResponseUtil.updated(flow, 'Flow updated successfully');
  }

  @Post('nodes')
  @RequirePermissions(Permission.AGENT_UPDATE)
  @HttpCode(HttpStatus.CREATED)
  async addNode(
    @Param('agentId') agentId: string,
    @Body() createNodeDto: CreateNodeDto,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Adding node to agent ${agentId}`, {
      userId: user.id,
      agentId: +agentId,
      nodeType: createNodeDto.type,
    });

    const node = await this.flowsService.addNode(
      +agentId,
      createNodeDto,
      user.id,
    );
    return ResponseUtil.created(node, 'Node added successfully');
  }

  @Put('nodes/:nodeId')
  @RequirePermissions(Permission.AGENT_UPDATE)
  async updateNode(
    @Param('agentId') agentId: string,
    @Param('nodeId') nodeId: string,
    @Body() updates: any,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Updating node ${nodeId} in agent ${agentId}`, {
      userId: user.id,
      agentId: +agentId,
      nodeId,
    });

    const node = await this.flowsService.updateNode(
      +agentId,
      nodeId,
      updates,
      user.id,
    );
    return ResponseUtil.updated(node, 'Node updated successfully');
  }

  @Delete('nodes/:nodeId')
  @RequirePermissions(Permission.AGENT_UPDATE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeNode(
    @Param('agentId') agentId: string,
    @Param('nodeId') nodeId: string,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Removing node ${nodeId} from agent ${agentId}`, {
      userId: user.id,
      agentId: +agentId,
      nodeId,
    });

    await this.flowsService.removeNode(+agentId, nodeId, user.id);
    return ResponseUtil.deleted('Node removed successfully');
  }

  @Post('edges')
  @RequirePermissions(Permission.AGENT_UPDATE)
  @HttpCode(HttpStatus.CREATED)
  async addEdge(
    @Param('agentId') agentId: string,
    @Body() createEdgeDto: CreateEdgeDto,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Adding edge to agent ${agentId}`, {
      userId: user.id,
      agentId: +agentId,
      source: createEdgeDto.source,
      target: createEdgeDto.target,
    });

    const edge = await this.flowsService.addEdge(
      +agentId,
      createEdgeDto,
      user.id,
    );
    return ResponseUtil.created(edge, 'Edge added successfully');
  }

  @Delete('edges/:edgeId')
  @RequirePermissions(Permission.AGENT_UPDATE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeEdge(
    @Param('agentId') agentId: string,
    @Param('edgeId') edgeId: string,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Removing edge ${edgeId} from agent ${agentId}`, {
      userId: user.id,
      agentId: +agentId,
      edgeId,
    });

    await this.flowsService.removeEdge(+agentId, edgeId, user.id);
    return ResponseUtil.deleted('Edge removed successfully');
  }

  @Put('viewport')
  @RequirePermissions(Permission.AGENT_UPDATE)
  async updateViewport(
    @Param('agentId') agentId: string,
    @Body() viewport: { x: number; y: number; zoom: number },
    @CurrentUser() user: any,
  ) {
    await this.flowsService.updateViewport(+agentId, viewport, user.id);
    return ResponseUtil.success(viewport, 'Viewport updated successfully');
  }

  @Post('auto-layout')
  @RequirePermissions(Permission.AGENT_UPDATE)
  async autoLayout(
    @Param('agentId') agentId: string,
    @CurrentUser() user: any,
  ) {
    // TODO: Implement auto-layout algorithm
    // This would automatically arrange nodes in a logical flow

    this.logger.log(`Auto-layout requested for agent ${agentId}`, {
      userId: user.id,
      agentId: +agentId,
    });

    return ResponseUtil.success({
      message: 'Auto-layout feature coming soon',
    });
  }

  @Post('export')
  @RequirePermissions(Permission.AGENT_READ)
  async exportFlow(
    @Param('agentId') agentId: string,
    @Body() options: { format: 'json' | 'png' | 'svg' },
    @CurrentUser() user: any,
  ) {
    const flow = await this.flowsService.getFlow(+agentId);

    if (!flow) {
      return ResponseUtil.error('No flow to export');
    }

    // TODO: Implement different export formats
    switch (options.format) {
      case 'json':
        return ResponseUtil.success({
          format: 'json',
          data: flow,
          filename: `agent-${agentId}-flow.json`,
        });

      case 'png':
      case 'svg':
        return ResponseUtil.success({
          message: `${options.format.toUpperCase()} export coming soon`,
        });

      default:
        return ResponseUtil.error('Unsupported export format');
    }
  }
}
