import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { agents, flowNodes, flowEdges } from '@repo/database';
import { FlowDefinition, FlowNode, FlowEdge } from '@repo/types';
import { DatabaseService } from '@common/services/database.service';
import { ValidationService } from '@common/services/validation.service';
import { LoggerService } from '@common/services/logger.service';
import { FlowValidationService } from '@agents/services/flow-validation.service';
import { UpdateFlowDto } from './dto/update-flow.dto';
import { CreateNodeDto } from './dto/create-node.dto';
import { CreateEdgeDto } from './dto/create-edge.dto';

@Injectable()
export class FlowsService {
  constructor(
    private databaseService: DatabaseService,
    private validationService: ValidationService,
    private flowValidationService: FlowValidationService,
    private logger: LoggerService,
  ) {
    this.logger.setContext('FlowsService');
  }

  async getFlow(agentId: string): Promise<FlowDefinition | null> {
    this.logger.log(`Fetching flow for agent: ${agentId}`);

    // Get agent to verify it exists
    const [agent] = await this.databaseService.db
      .select()
      .from(agents)
      .where(eq(agents.id, agentId))
      .limit(1);

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    // Return flow definition from agent record
    return agent.flowDefinition || null;
  }

  async updateFlow(
    agentId: string,
    updateFlowDto: UpdateFlowDto,
    userId: string,
  ): Promise<FlowDefinition> {
    this.logger.log(`Updating flow for agent: ${agentId}`, { userId, agentId });

    // Verify agent exists and user has access
    const [agent] = await this.databaseService.db
      .select()
      .from(agents)
      .where(eq(agents.id, agentId))
      .limit(1);

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    let flowDefinition: FlowDefinition;

    if (updateFlowDto.flowDefinition) {
      // Complete flow definition provided
      flowDefinition = updateFlowDto.flowDefinition;
    } else {
      // Partial update - merge with existing flow
      const currentFlow = agent.flowDefinition || {
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      };

      flowDefinition = {
        nodes: updateFlowDto.nodes || currentFlow.nodes,
        edges: updateFlowDto.edges || currentFlow.edges,
        viewport: updateFlowDto.viewport || currentFlow.viewport,
      };
    }

    // Validate the flow
    const validation = this.flowValidationService.validateFlow(flowDefinition);
    if (!validation.valid) {
      throw new BadRequestException(
        `Flow validation failed: ${validation.errors.join(', ')}`,
      );
    }

    // Update agent with new flow definition
    await this.databaseService.db
      .update(agents)
      .set({
        flowDefinition,
        updatedAt: new Date(),
      })
      .where(eq(agents.id, agentId));

    // Store individual nodes and edges for querying (optional - for advanced features)
    await this.syncFlowComponents(agentId, flowDefinition);

    this.logger.log(`Flow updated successfully for agent: ${agentId}`, {
      userId,
      agentId,
      nodeCount: flowDefinition.nodes.length,
      edgeCount: flowDefinition.edges.length,
    });

    return flowDefinition;
  }

  async addNode(
    agentId: string,
    nodeDto: CreateNodeDto,
    userId: string,
  ): Promise<FlowNode> {
    this.logger.log(`Adding node to agent: ${agentId}`, {
      userId,
      agentId,
      nodeType: nodeDto.type,
    });

    const currentFlow = await this.getFlow(agentId);
    if (!currentFlow) {
      throw new BadRequestException('Agent has no flow definition');
    }

    // Check if node ID already exists
    if (currentFlow.nodes.some((node) => node.id === nodeDto.id)) {
      throw new BadRequestException(
        `Node with ID ${nodeDto.id} already exists`,
      );
    }

    // Add node to flow
    const newNode: FlowNode = {
      id: nodeDto.id,
      type: nodeDto.type,
      label: nodeDto.label,
      position: nodeDto.position,
      data: nodeDto.data,
    };

    const updatedFlow: FlowDefinition = {
      ...currentFlow,
      nodes: [...currentFlow.nodes, newNode],
    };

    // Update the flow
    await this.updateFlow(agentId, { flowDefinition: updatedFlow }, userId);

    return newNode;
  }

  async updateNode(
    agentId: string,
    nodeId: string,
    updates: Partial<FlowNode>,
    userId: string,
  ): Promise<FlowNode> {
    this.logger.log(`Updating node ${nodeId} in agent: ${agentId}`, {
      userId,
      agentId,
      nodeId,
    });

    const currentFlow = await this.getFlow(agentId);
    if (!currentFlow) {
      throw new BadRequestException('Agent has no flow definition');
    }

    const nodeIndex = currentFlow.nodes.findIndex((node) => node.id === nodeId);
    if (nodeIndex === -1) {
      throw new NotFoundException(`Node ${nodeId} not found`);
    }

    // Update the node
    const updatedNode = { ...currentFlow.nodes[nodeIndex], ...updates };
    const updatedNodes = [...currentFlow.nodes];
    updatedNodes[nodeIndex] = updatedNode;

    const updatedFlow: FlowDefinition = {
      ...currentFlow,
      nodes: updatedNodes,
    };

    // Update the flow
    await this.updateFlow(agentId, { flowDefinition: updatedFlow }, userId);

    return updatedNode;
  }

  async removeNode(
    agentId: string,
    nodeId: string,
    userId: string,
  ): Promise<void> {
    this.logger.log(`Removing node ${nodeId} from agent: ${agentId}`, {
      userId,
      agentId,
      nodeId,
    });

    const currentFlow = await this.getFlow(agentId);
    if (!currentFlow) {
      throw new BadRequestException('Agent has no flow definition');
    }

    // Remove node and connected edges
    const updatedNodes = currentFlow.nodes.filter((node) => node.id !== nodeId);
    const updatedEdges = currentFlow.edges.filter(
      (edge) => edge.source !== nodeId && edge.target !== nodeId,
    );

    const updatedFlow: FlowDefinition = {
      ...currentFlow,
      nodes: updatedNodes,
      edges: updatedEdges,
    };

    // Update the flow
    await this.updateFlow(agentId, { flowDefinition: updatedFlow }, userId);
  }

  async addEdge(
    agentId: string,
    edgeDto: CreateEdgeDto,
    userId: string,
  ): Promise<FlowEdge> {
    this.logger.log(`Adding edge to agent: ${agentId}`, {
      userId,
      agentId,
      source: edgeDto.source,
      target: edgeDto.target,
    });

    const currentFlow = await this.getFlow(agentId);
    if (!currentFlow) {
      throw new BadRequestException('Agent has no flow definition');
    }

    // Verify source and target nodes exist
    const sourceExists = currentFlow.nodes.some(
      (node) => node.id === edgeDto.source,
    );
    const targetExists = currentFlow.nodes.some(
      (node) => node.id === edgeDto.target,
    );

    if (!sourceExists) {
      throw new BadRequestException(`Source node ${edgeDto.source} not found`);
    }

    if (!targetExists) {
      throw new BadRequestException(`Target node ${edgeDto.target} not found`);
    }

    // Check if edge already exists
    if (currentFlow.edges.some((edge) => edge.id === edgeDto.id)) {
      throw new BadRequestException(
        `Edge with ID ${edgeDto.id} already exists`,
      );
    }

    // Add edge to flow
    const newEdge: FlowEdge = {
      id: edgeDto.id,
      source: edgeDto.source,
      target: edgeDto.target,
      sourceHandle: edgeDto.sourceHandle,
      targetHandle: edgeDto.targetHandle,
      data: edgeDto.data,
    };

    const updatedFlow: FlowDefinition = {
      ...currentFlow,
      edges: [...currentFlow.edges, newEdge],
    };

    // Update the flow
    await this.updateFlow(agentId, { flowDefinition: updatedFlow }, userId);

    return newEdge;
  }

  async removeEdge(
    agentId: string,
    edgeId: string,
    userId: string,
  ): Promise<void> {
    this.logger.log(`Removing edge ${edgeId} from agent: ${agentId}`, {
      userId,
      agentId,
      edgeId,
    });

    const currentFlow = await this.getFlow(agentId);
    if (!currentFlow) {
      throw new BadRequestException('Agent has no flow definition');
    }

    const updatedEdges = currentFlow.edges.filter((edge) => edge.id !== edgeId);

    const updatedFlow: FlowDefinition = {
      ...currentFlow,
      edges: updatedEdges,
    };

    // Update the flow
    await this.updateFlow(agentId, { flowDefinition: updatedFlow }, userId);
  }

  async updateViewport(
    agentId: string,
    viewport: { x: number; y: number; zoom: number },
    userId: string,
  ): Promise<void> {
    this.logger.log(`Updating viewport for agent: ${agentId}`, {
      userId,
      agentId,
    });

    const currentFlow = await this.getFlow(agentId);
    if (!currentFlow) {
      throw new BadRequestException('Agent has no flow definition');
    }

    const updatedFlow: FlowDefinition = {
      ...currentFlow,
      viewport,
    };

    // Update the flow (without validation for viewport-only changes)
    await this.databaseService.db
      .update(agents)
      .set({
        flowDefinition: updatedFlow,
        updatedAt: new Date(),
      })
      .where(eq(agents.id, agentId));
  }

  private async syncFlowComponents(
    agentId: string,
    flowDefinition: FlowDefinition,
  ): Promise<void> {
    // This is optional - stores individual nodes/edges in separate tables for advanced querying
    // Useful for features like searching nodes across agents, analytics, etc.

    // Clear existing components
    await this.databaseService.db
      .delete(flowNodes)
      .where(eq(flowNodes.agentId, agentId));
    await this.databaseService.db
      .delete(flowEdges)
      .where(eq(flowEdges.agentId, agentId));

    // Insert nodes
    if (flowDefinition.nodes.length > 0) {
      await this.databaseService.db.insert(flowNodes).values(
        flowDefinition.nodes.map((node) => ({
          agentId,
          nodeId: node.id,
          type: node.type,
          label: node.label,
          position: node.position,
          data: node.data,
        })),
      );
    }

    // Insert edges
    if (flowDefinition.edges.length > 0) {
      await this.databaseService.db.insert(flowEdges).values(
        flowDefinition.edges.map((edge) => ({
          agentId,
          edgeId: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
          data: edge.data,
        })),
      );
    }
  }
}
